/**
 * 情话的取用逻辑
 *
 * 池子 = 内置（data/love-notes.js）或用户自己改的（存在本机）。
 * 用户没改过某个场景就用内置那份；改过就整份用用户的。
 */
const base = require("../data/love-notes.js");
const storage = require("./storage.js");

const CUSTOM_KEY = "dc_notes_custom";

// 只有这三个场景是内置的，别的一律用内置池兜底
const SCENES = ["accept", "done", "urge"];

function getCustom() {
  const value = storage.read(CUSTOM_KEY, {});
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function setCustom(map) {
  const next = map && typeof map === "object" && !Array.isArray(map) ? map : {};
  storage.write(CUSTOM_KEY, next);
  return next;
}

function clean(list) {
  if (!Array.isArray(list)) {
    return null;
  }
  const out = [];
  list.forEach(function (line) {
    if (typeof line !== "string") {
      return;
    }
    const text = line.trim();
    if (text && out.indexOf(text) < 0) {
      out.push(text);
    }
  });
  return out;
}

function pool(scene) {
  const custom = getCustom();
  if (SCENES.indexOf(scene) >= 0 && Array.isArray(custom[scene])) {
    return clean(custom[scene]) || [];
  }
  const builtin = base.NOTES[scene] || [];
  return builtin.slice();
}

// 抽一条：优先避开这个订单里已经用过的，都抽过一轮了就重新开始
function pick(scene, used) {
  const list = pool(scene);
  if (list.length === 0) {
    return "";
  }
  const history = Array.isArray(used) ? used : [];
  const fresh = list.filter(function (line) {
    return history.indexOf(line) < 0;
  });
  const source = fresh.length > 0 ? fresh : list;
  return source[Math.floor(Math.random() * source.length)];
}

// 清掉某个场景的自定义，恢复内置文案；不传 scene 就全部还原
function reset(scene) {
  const custom = getCustom();
  if (scene) {
    delete custom[scene];
    setCustom(custom);
    return;
  }
  setCustom({});
}

function isCustom(scene) {
  const custom = getCustom();
  return Array.isArray(custom[scene]);
}

// 加一条：第一次改某个场景，会先把内置的那几句抄过来当底子
function addLine(scene, text) {
  const line = (text || "").trim().slice(0, 40);
  const list = pool(scene).slice();
  if (!line || list.indexOf(line) >= 0) {
    return list;
  }
  list.unshift(line);
  const custom = getCustom();
  custom[scene] = list;
  setCustom(custom);
  return list;
}

// 删一条；全删光就是这个场景不再出纸条
function removeLine(scene, text) {
  const list = pool(scene).filter(function (line) {
    return line !== text;
  });
  const custom = getCustom();
  custom[scene] = list;
  setCustom(custom);
  return list;
}

// 抽 n 条不重复的，给大厨挑一句用
function pickFew(scene, used, count) {
  const list = pool(scene);
  const history = Array.isArray(used) ? used : [];
  const fresh = list.filter(function (line) {
    return history.indexOf(line) < 0;
  });
  const source = (fresh.length >= count ? fresh : list).slice();
  const out = [];
  const limit = Math.min(count, source.length);
  while (out.length < limit) {
    out.push(source.splice(Math.floor(Math.random() * source.length), 1)[0]);
  }
  return out;
}

module.exports = {
  SCENES: SCENES,
  pool: pool,
  pick: pick,
  pickFew: pickFew,
  getCustom: getCustom,
  setCustom: setCustom,
  isCustom: isCustom,
  addLine: addLine,
  removeLine: removeLine,
  reset: reset
};
