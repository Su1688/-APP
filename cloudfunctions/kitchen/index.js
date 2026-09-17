const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const COLL_KITCHENS = "kitchens";
const COLL_ORDERS = "orders";
const COLL_MENUS = "kitchen_menus";
const COLL_PROFILES = "kitchen_profiles";

const MAX_MEMBERS = 2;
const ORDER_LIMIT = 100;
const MAX_ITEMS = 30;
const MAX_COUNT_PER_ITEM = 9;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const FLOW = ["pending", "cooking", "done"];

let collectionsReady = false;

function ok(data) {
  return Object.assign({ ok: true }, data || {});
}

function fail(error, message) {
  return { ok: false, error: error, message: message || "" };
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function text(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function strList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) {
    return [];
  }
  const out = [];
  value.slice(0, maxItems).forEach(function (item) {
    const line = text(item, maxLength).trim();
    if (line !== "") {
      out.push(line);
    }
  });
  return out;
}

async function ensureCollections() {
  if (collectionsReady) {
    return;
  }
  const names = [COLL_KITCHENS, COLL_ORDERS, COLL_MENUS, COLL_PROFILES];
  for (let i = 0; i < names.length; i++) {
    try {
      await db.createCollection(names[i]);
    } catch (e) {
      // 集合已存在时会抛错，忽略即可
    }
  }
  collectionsReady = true;
}

async function findKitchen(openid) {
  const res = await db
    .collection(COLL_KITCHENS)
    .where({ members: openid })
    .limit(1)
    .get();
  return res.data[0] || null;
}

function publicKitchen(kitchen) {
  return {
    id: kitchen._id,
    code: kitchen.code,
    memberCount: (kitchen.members || []).length,
    createdAt: kitchen.createdAt
  };
}

function randomCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

function makeOrderNo(ts) {
  const d = new Date(ts);
  const pad = function (n) {
    return n < 10 ? "0" + n : "" + n;
  };
  return (
    "" +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    Math.floor(Math.random() * 9000 + 1000)
  );
}

function sanitizeDish(dish) {
  const source = dish || {};
  return {
    id: text(source.id, 64),
    name: text(source.name, 24).trim(),
    emoji: text(source.emoji, 8) || "🍽",
    image: text(source.image, 512),
    category: text(source.category, 24) || "hot",
    desc: text(source.desc, 60),
    tags: strList(source.tags, 8, 12),
    spicy: clamp(Number(source.spicy) || 0, 0, 3),
    minutes: clamp(Number(source.minutes) || 10, 1, 600),
    level: clamp(Number(source.level) || 1, 1, 3),
    ingredients: strList(source.ingredients, 20, 60),
    steps: strList(source.steps, 20, 200),
    soldOut: !!source.soldOut
  };
}

function sanitizeMenu(payload) {
  const source = payload || {};
  const custom = Array.isArray(source.custom)
    ? source.custom.slice(0, 200).map(sanitizeDish)
    : [];
  const deleted = Array.isArray(source.deleted)
    ? source.deleted.slice(0, 200).map(function (id) {
        return text(id, 64);
      })
    : [];
  const overrides = {};
  const raw =
    source.overrides && typeof source.overrides === "object" && !Array.isArray(source.overrides)
      ? source.overrides
      : {};
  Object.keys(raw)
    .slice(0, 200)
    .forEach(function (id) {
      overrides[text(id, 64)] = sanitizeDish(raw[id]);
    });
  return { custom: custom, overrides: overrides, deleted: deleted };
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  const out = [];
  items.slice(0, MAX_ITEMS).forEach(function (item) {
    if (!item || !text(item.id, 64)) {
      return;
    }
    out.push({
      id: text(item.id, 64),
      name: text(item.name, 24) || "未知菜品",
      emoji: text(item.emoji, 8) || "🍽",
      count: clamp(Number(item.count) || 1, 1, MAX_COUNT_PER_ITEM)
    });
  });
  return out;
}

async function saveOrder(kitchenId, order) {
  await db
    .collection(COLL_ORDERS)
    .doc(order.id)
    .set({
      data: {
        kitchenId: kitchenId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        order: order
      }
    });
}

async function loadOrder(openid, id) {
  const kitchen = await findKitchen(openid);
  if (!kitchen) {
    return { error: fail("NOT_PAIRED", "这台设备还没有配对") };
  }
  if (!id) {
    return { error: fail("BAD_ID", "订单号不对") };
  }
  let doc = null;
  try {
    const res = await db.collection(COLL_ORDERS).doc(id).get();
    doc = res.data;
  } catch (e) {
    doc = null;
  }
  if (!doc || doc.kitchenId !== kitchen._id) {
    return { error: fail("ORDER_NOT_FOUND", "找不到这个订单") };
  }
  return { kitchenId: kitchen._id, order: doc.order };
}

async function pairStatus(openid) {
  const kitchen = await findKitchen(openid);
  return ok({ kitchen: kitchen ? publicKitchen(kitchen) : null });
}

async function pairCreate(openid) {
  const existing = await findKitchen(openid);
  if (existing) {
    return ok({ kitchen: publicKitchen(existing) });
  }
  let code = "";
  for (let i = 0; i < 8; i++) {
    const candidate = randomCode();
    const dup = await db.collection(COLL_KITCHENS).where({ code: candidate }).count();
    if (dup.total === 0) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return fail("CODE_GEN_FAILED", "邀请码生成失败，稍后再试");
  }
  const now = Date.now();
  const res = await db.collection(COLL_KITCHENS).add({
    data: { code: code, members: [openid], createdAt: now, updatedAt: now, closedAt: null }
  });
  return ok({
    kitchen: { id: res._id, code: code, memberCount: 1, createdAt: now }
  });
}

async function pairJoin(openid, rawCode) {
  const code = text(rawCode, 12).trim().toUpperCase();
  if (!code) {
    return fail("EMPTY_CODE", "请输入邀请码");
  }
  const res = await db.collection(COLL_KITCHENS).where({ code: code }).limit(1).get();
  const kitchen = res.data[0];
  if (!kitchen) {
    return fail("NOT_FOUND", "没有找到这个邀请码");
  }
  const members = kitchen.members || [];
  if (members.indexOf(openid) >= 0) {
    return ok({ kitchen: publicKitchen(kitchen) });
  }
  const own = await findKitchen(openid);
  if (own && own._id !== kitchen._id) {
    return fail("ALREADY_PAIRED", "你已经在一个小家里了，先退出再加入");
  }
  if (members.length >= MAX_MEMBERS) {
    return fail("FULL", "这个小家已经满员了");
  }
  await db
    .collection(COLL_KITCHENS)
    .doc(kitchen._id)
    .update({
      data: { members: _.push([openid]), updatedAt: Date.now(), closedAt: null }
    });
  const updated = await db.collection(COLL_KITCHENS).doc(kitchen._id).get();
  return ok({ kitchen: publicKitchen(updated.data) });
}

async function pairLeave(openid) {
  const kitchen = await findKitchen(openid);
  if (!kitchen) {
    return ok({ kitchen: null });
  }
  const members = (kitchen.members || []).filter(function (id) {
    return id !== openid;
  });
  await db
    .collection(COLL_KITCHENS)
    .doc(kitchen._id)
    .update({
      data: {
        members: members,
        updatedAt: Date.now(),
        closedAt: members.length === 0 ? Date.now() : null
      }
    });
  return ok({ kitchen: null });
}

async function pull(openid) {
  const kitchen = await findKitchen(openid);
  if (!kitchen) {
    return fail("NOT_PAIRED", "这台设备还没有配对");
  }
  const ordersRes = await db
    .collection(COLL_ORDERS)
    .where({ kitchenId: kitchen._id })
    .orderBy("createdAt", "desc")
    .limit(ORDER_LIMIT)
    .get();
  const menuRes = await db.collection(COLL_MENUS).where({ _id: kitchen._id }).limit(1).get();
  const profileRes = await db
    .collection(COLL_PROFILES)
    .where({ _id: kitchen._id })
    .limit(1)
    .get();
  return ok({
    kitchen: publicKitchen(kitchen),
    orders: ordersRes.data.map(function (doc) {
      return doc.order;
    }),
    menu: menuRes.data[0] ? menuRes.data[0].payload : null,
    profile: profileRes.data[0] ? profileRes.data[0].profile : null,
    serverTime: Date.now()
  });
}

async function pushMenu(openid, payload) {
  const kitchen = await findKitchen(openid);
  if (!kitchen) {
    return fail("NOT_PAIRED", "这台设备还没有配对");
  }
  const clean = sanitizeMenu(payload);
  await db
    .collection(COLL_MENUS)
    .doc(kitchen._id)
    .set({
      data: { kitchenId: kitchen._id, payload: clean, updatedAt: Date.now() }
    });
  return ok({ updatedAt: Date.now() });
}

async function createOrder(openid, event) {
  const kitchen = await findKitchen(openid);
  if (!kitchen) {
    return fail("NOT_PAIRED", "这台设备还没有配对");
  }
  const items = sanitizeItems(event.items);
  if (items.length === 0) {
    return fail("EMPTY_ORDER", "菜单是空的");
  }
  const now = Date.now();
  const count = items.reduce(function (sum, item) {
    return sum + item.count;
  }, 0);
  const id = "o_" + now.toString(36) + Math.random().toString(36).slice(2, 6);
  const order = {
    id: id,
    no: makeOrderNo(now),
    items: items,
    count: count,
    dishCount: items.length,
    summary: items
      .map(function (item) {
        return item.name + " ×" + item.count;
      })
      .join("、"),
    remark: text(event.remark, 60),
    expectTime: text(event.expectTime, 20) || "尽快",
    status: "pending",
    urgeCount: 0,
    notes: [],
    createdAt: now,
    updatedAt: now,
    timeline: [{ status: "pending", at: now }]
  };
  await saveOrder(kitchen._id, order);
  return ok({ order: order });
}

// 情话挂在订单上，这样两台手机看到的是同一句
function appendNote(order, scene, value) {
  const line = text(value, 40).trim();
  const list = Array.isArray(order.notes) ? order.notes.slice() : [];
  if (line) {
    list.push({ scene: scene, text: line, at: Date.now() });
  }
  order.notes = list.slice(-20);
}

async function orderAdvance(openid, id, note) {
  const ctx = await loadOrder(openid, id);
  if (ctx.error) {
    return ctx.error;
  }
  const order = ctx.order;
  const index = FLOW.indexOf(order.status);
  if (index < 0 || index >= FLOW.length - 1) {
    return ok({ order: order });
  }
  const next = FLOW[index + 1];
  const now = Date.now();
  order.status = next;
  order.timeline = (order.timeline || []).concat([{ status: next, at: now }]);
  appendNote(order, next === "cooking" ? "accept" : "done", note);
  order.updatedAt = now;
  await saveOrder(ctx.kitchenId, order);
  return ok({ order: order });
}

async function orderCancel(openid, id) {
  const ctx = await loadOrder(openid, id);
  if (ctx.error) {
    return ctx.error;
  }
  const order = ctx.order;
  if (order.status === "done" || order.status === "cancel") {
    return ok({ order: order });
  }
  const now = Date.now();
  order.status = "cancel";
  order.timeline = (order.timeline || []).concat([{ status: "cancel", at: now }]);
  order.updatedAt = now;
  await saveOrder(ctx.kitchenId, order);
  return ok({ order: order });
}

async function orderUrge(openid, id, note) {
  const ctx = await loadOrder(openid, id);
  if (ctx.error) {
    return ctx.error;
  }
  const order = ctx.order;
  if (order.status === "done" || order.status === "cancel") {
    return ok({ order: order });
  }
  order.urgeCount = clamp((Number(order.urgeCount) || 0) + 1, 0, 99);
  appendNote(order, "urge", note);
  order.updatedAt = Date.now();
  await saveOrder(ctx.kitchenId, order);
  return ok({ order: order });
}

async function saveProfile(openid, profile) {
  const kitchen = await findKitchen(openid);
  if (!kitchen) {
    return fail("NOT_PAIRED", "这台设备还没有配对");
  }
  const source = profile || {};
  const clean = {
    spicy: clamp(Number(source.spicy) || 0, 0, 3),
    dislikes: strList(source.dislikes, 20, 12)
  };
  await db
    .collection(COLL_PROFILES)
    .doc(kitchen._id)
    .set({
      data: { kitchenId: kitchen._id, profile: clean, updatedAt: Date.now() }
    });
  return ok({ profile: clean });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return fail("NO_OPENID", "拿不到用户身份");
  }
  try {
    await ensureCollections();
    switch (event.action) {
      case "pairStatus":
        return await pairStatus(openid);
      case "pairCreate":
        return await pairCreate(openid);
      case "pairJoin":
        return await pairJoin(openid, event.code);
      case "pairLeave":
        return await pairLeave(openid);
      case "pull":
        return await pull(openid);
      case "pushMenu":
        return await pushMenu(openid, event.payload);
      case "createOrder":
        return await createOrder(openid, event);
      case "orderAdvance":
        return await orderAdvance(openid, event.id, event.note);
      case "orderCancel":
        return await orderCancel(openid, event.id);
      case "orderUrge":
        return await orderUrge(openid, event.id, event.note);
      case "saveProfile":
        return await saveProfile(openid, event.profile);
      default:
        return fail("UNKNOWN_ACTION", "不认识这个操作");
    }
  } catch (e) {
    return fail("SERVER_ERROR", (e && e.message) || "服务端异常");
  }
};
