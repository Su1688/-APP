const menu = require("./menu.js");
const util = require("./util.js");
const status = require("./status.js");
const storage = require("./storage.js");

const CART_KEY = "dc_cart";
const ORDER_KEY = "dc_orders";
const FAV_KEY = "dc_favorites";
const ROLE_KEY = "dc_role";
const PROFILE_KEY = "dc_profile";

const MAX_ORDERS = 100;
const MAX_COUNT_PER_DISH = 9;

const DEFAULT_PROFILE = {
  nick: "小可爱",
  avatar: "",
  spicy: 1,
  dislikes: []
};

const read = storage.read;
const write = storage.write;

/* ---------------- 购物车 ---------------- */

function getCart() {
  const cart = read(CART_KEY, []);
  return Array.isArray(cart) ? cart : [];
}

function saveCart(cart) {
  write(CART_KEY, cart);
  return cart;
}

function findCartItem(cart, id) {
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id === id) {
      return i;
    }
  }
  return -1;
}

function addToCart(id) {
  const cart = getCart();
  const index = findCartItem(cart, id);
  if (index < 0) {
    cart.push({ id: id, count: 1 });
  } else if (cart[index].count < MAX_COUNT_PER_DISH) {
    cart[index].count += 1;
  } else {
    wx.showToast({ title: "一道菜最多点 9 份哦", icon: "none" });
    return cart;
  }
  return saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart();
  const index = findCartItem(cart, id);
  if (index < 0) {
    return cart;
  }
  if (cart[index].count > 1) {
    cart[index].count -= 1;
  } else {
    cart.splice(index, 1);
  }
  return saveCart(cart);
}

function clearCart() {
  return saveCart([]);
}

function cartCount(cart) {
  const list = cart || getCart();
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total += list[i].count;
  }
  return total;
}

function toCartMap(cart) {
  const list = cart || getCart();
  const map = {};
  for (let i = 0; i < list.length; i++) {
    map[list[i].id] = list[i].count;
  }
  return map;
}

function buildCartItems(cart) {
  const list = cart || getCart();
  const items = [];
  list.forEach(function (item) {
    const dish = menu.getDish(item.id);
    if (!dish) {
      return;
    }
    items.push({
      id: item.id,
      count: item.count,
      name: dish.name,
      emoji: dish.emoji,
      desc: dish.desc
    });
  });
  return items;
}

function dropInvalidCart() {
  const cart = getCart();
  const valid = cart.filter(function (item) {
    const dish = menu.getDish(item.id);
    return !!dish && !dish.soldOut;
  });
  if (valid.length !== cart.length) {
    saveCart(valid);
  }
  return valid;
}

function dropDishEverywhere(id) {
  const cart = getCart().filter(function (item) {
    return item.id !== id;
  });
  saveCart(cart);
  const favorites = getFavorites();
  const index = favorites.indexOf(id);
  if (index >= 0) {
    favorites.splice(index, 1);
    write(FAV_KEY, favorites);
  }
}

/* ---------------- 收藏 ---------------- */

function getFavorites() {
  const list = read(FAV_KEY, []);
  return Array.isArray(list) ? list : [];
}

function isFavorite(id) {
  return getFavorites().indexOf(id) >= 0;
}

function toggleFavorite(id) {
  const list = getFavorites();
  const index = list.indexOf(id);
  let added = false;
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.unshift(id);
    added = true;
  }
  write(FAV_KEY, list);
  return added;
}

/* ---------------- 订单 ---------------- */

function getOrders() {
  const list = read(ORDER_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getOrder(id) {
  const list = getOrders();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list[i];
    }
  }
  return null;
}

function createOrder(payload) {
  const items = buildOrderItems(payload.cart);
  const stat = summarize(items);
  const now = Date.now();
  const order = {
    id: util.uid("o"),
    no: util.makeOrderNo(now),
    items: items,
    count: stat.count,
    dishCount: stat.dishCount,
    summary: stat.summary,
    remark: payload.remark || "",
    expectTime: payload.expectTime || "尽快",
    status: "pending",
    urgeCount: 0,
    notes: [],
    createdAt: now,
    updatedAt: now,
    timeline: [{ status: "pending", at: now }]
  };
  return upsertOrder(order);
}

function buildOrderItems(cart) {
  const list = cart || [];
  const items = [];
  list.forEach(function (item) {
    const dish = menu.getDish(item.id);
    if (!dish) {
      return;
    }
    items.push({
      id: item.id,
      name: dish.name,
      emoji: dish.emoji,
      count: item.count
    });
  });
  return items;
}

function summarize(items) {
  const list = items || [];
  return {
    count: list.reduce(function (sum, item) {
      return sum + item.count;
    }, 0),
    dishCount: list.length,
    summary: list
      .map(function (item) {
        return item.name + " ×" + item.count;
      })
      .join("、")
  };
}

function upsertOrder(order) {
  const list = getOrders().filter(function (item) {
    return item.id !== order.id;
  });
  list.push(order);
  list.sort(function (a, b) {
    return b.createdAt - a.createdAt;
  });
  write(ORDER_KEY, list.slice(0, MAX_ORDERS));
  return order;
}

function applyRemoteOrders(orders) {
  if (!Array.isArray(orders)) {
    return getOrders();
  }
  const list = orders.slice().sort(function (a, b) {
    return b.createdAt - a.createdAt;
  });
  write(ORDER_KEY, list.slice(0, MAX_ORDERS));
  return list;
}

function updateOrder(id, patch) {
  const list = getOrders();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      const target = list[i];
      for (const key in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
          target[key] = patch[key];
        }
      }
      target.updatedAt = Date.now();
      write(ORDER_KEY, list);
      return target;
    }
  }
  return null;
}

function noteHistory(order, scene) {
  const list = order && Array.isArray(order.notes) ? order.notes : [];
  return list
    .filter(function (note) {
      return note && note.scene === scene;
    })
    .map(function (note) {
      return note.text;
    });
}

function appendNote(order, scene, value) {
  const list = order && Array.isArray(order.notes) ? order.notes.slice() : [];
  const line = (value || "").trim();
  if (line) {
    list.push({ scene: scene, text: line.slice(0, 40), at: Date.now() });
  }
  return list.slice(-20);
}

function advanceOrder(id, note) {
  const order = getOrder(id);
  if (!order) {
    return null;
  }
  const next = status.nextStatus(order.status);
  if (!next) {
    return order;
  }
  const now = Date.now();
  return updateOrder(id, {
    status: next,
    timeline: order.timeline.concat([{ status: next, at: now }]),
    notes: appendNote(order, next === "cooking" ? "accept" : "done", note)
  });
}

function cancelOrder(id) {
  const order = getOrder(id);
  if (!order || order.status === "done" || order.status === "cancel") {
    return order;
  }
  const now = Date.now();
  return updateOrder(id, {
    status: "cancel",
    timeline: order.timeline.concat([{ status: "cancel", at: now }])
  });
}

function urgeOrder(id, note) {
  const order = getOrder(id);
  if (!order) {
    return null;
  }
  return updateOrder(id, {
    urgeCount: (order.urgeCount || 0) + 1,
    notes: appendNote(order, "urge", note)
  });
}

function pendingCount() {
  return getOrders().filter(function (order) {
    return order.status === "pending";
  }).length;
}

/* ---------------- 身份与偏好 ---------------- */

function getRole() {
  return read(ROLE_KEY, "girl") === "chef" ? "chef" : "girl";
}

function setRole(role) {
  const value = role === "chef" ? "chef" : "girl";
  write(ROLE_KEY, value);
  return value;
}

function getProfile() {
  const saved = read(PROFILE_KEY, null);
  const profile = Object.assign({}, DEFAULT_PROFILE);
  if (saved && typeof saved === "object") {
    Object.assign(profile, saved);
  }
  if (!Array.isArray(profile.dislikes)) {
    profile.dislikes = [];
  }
  return profile;
}

function saveProfile(patch) {
  const profile = Object.assign(getProfile(), patch);
  write(PROFILE_KEY, profile);
  return profile;
}

function getSharedProfile() {
  const profile = getProfile();
  return {
    spicy: profile.spicy,
    dislikes: profile.dislikes
  };
}

function applyRemoteProfile(shared) {
  if (!shared || typeof shared !== "object") {
    return getProfile();
  }
  return saveProfile({
    spicy: typeof shared.spicy === "number" ? shared.spicy : getProfile().spicy,
    dislikes: Array.isArray(shared.dislikes) ? shared.dislikes : getProfile().dislikes
  });
}

/* ---------------- 统计 ---------------- */

function getStats() {
  const orders = getOrders().filter(function (order) {
    return order.status !== "cancel";
  });
  const counter = {};
  let dishTotal = 0;
  orders.forEach(function (order) {
    order.items.forEach(function (item) {
      counter[item.id] = (counter[item.id] || 0) + item.count;
      dishTotal += item.count;
    });
  });
  let topId = "";
  let topCount = 0;
  Object.keys(counter).forEach(function (id) {
    if (counter[id] > topCount) {
      topCount = counter[id];
      topId = id;
    }
  });
  return {
    orderCount: orders.length,
    dishTotal: dishTotal,
    dishKinds: Object.keys(counter).length,
    topDish: topId ? menu.getDish(topId) : null,
    topCount: topCount
  };
}

function resetAll() {
  write(CART_KEY, []);
  write(ORDER_KEY, []);
  write(FAV_KEY, []);
}

module.exports = {
  MAX_COUNT_PER_DISH: MAX_COUNT_PER_DISH,
  getCart: getCart,
  addToCart: addToCart,
  removeFromCart: removeFromCart,
  clearCart: clearCart,
  cartCount: cartCount,
  toCartMap: toCartMap,
  buildCartItems: buildCartItems,
  dropInvalidCart: dropInvalidCart,
  dropDishEverywhere: dropDishEverywhere,
  buildOrderItems: buildOrderItems,
  upsertOrder: upsertOrder,
  applyRemoteOrders: applyRemoteOrders,
  getSharedProfile: getSharedProfile,
  applyRemoteProfile: applyRemoteProfile,
  getFavorites: getFavorites,
  isFavorite: isFavorite,
  toggleFavorite: toggleFavorite,
  getOrders: getOrders,
  getOrder: getOrder,
  noteHistory: noteHistory,
  createOrder: createOrder,
  updateOrder: updateOrder,
  advanceOrder: advanceOrder,
  cancelOrder: cancelOrder,
  urgeOrder: urgeOrder,
  pendingCount: pendingCount,
  getRole: getRole,
  setRole: setRole,
  getProfile: getProfile,
  saveProfile: saveProfile,
  getStats: getStats,
  resetAll: resetAll
};
