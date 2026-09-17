const base = require("../data/dishes.js");
const util = require("./util.js");
const storage = require("./storage.js");

const CUSTOM_KEY = "dc_menu_custom";
const OVERRIDE_KEY = "dc_menu_overrides";
const DELETED_KEY = "dc_menu_deleted";
const DIRTY_KEY = "dc_menu_dirty";

const EDITABLE_FIELDS = [
  "name",
  "emoji",
  "image",
  "category",
  "desc",
  "tags",
  "spicy",
  "minutes",
  "level",
  "ingredients",
  "steps",
  "soldOut"
];

function getCustomList() {
  return storage.readArray(CUSTOM_KEY);
}

function setCustomList(list) {
  storage.write(CUSTOM_KEY, list);
}

function getOverrideMap() {
  return storage.readObject(OVERRIDE_KEY);
}

function setOverrideMap(map) {
  storage.write(OVERRIDE_KEY, map);
}

function getDeletedIds() {
  return storage.readArray(DELETED_KEY);
}

function setDeletedIds(ids) {
  storage.write(DELETED_KEY, ids);
}

function isDeleted(id) {
  return getDeletedIds().indexOf(id) >= 0;
}

function markDirty() {
  storage.write(DIRTY_KEY, true);
}

function isDirty() {
  return storage.read(DIRTY_KEY, false) === true;
}

function setDirty(flag) {
  storage.write(DIRTY_KEY, !!flag);
}

function exportPayload() {
  return {
    custom: getCustomList(),
    overrides: getOverrideMap(),
    deleted: getDeletedIds()
  };
}

function applyRemote(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  setCustomList(Array.isArray(payload.custom) ? payload.custom : []);
  setOverrideMap(
    payload.overrides && typeof payload.overrides === "object" && !Array.isArray(payload.overrides)
      ? payload.overrides
      : {}
  );
  setDeletedIds(Array.isArray(payload.deleted) ? payload.deleted : []);
  setDirty(false);
  return true;
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value) {
    return value
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line !== "";
      });
  }
  return [];
}

function normalize(dish) {
  const item = Object.assign({}, dish);
  item.name = (item.name || "").trim();
  item.emoji = item.emoji || "🍽";
  item.image = item.image || "";
  item.category = item.category || "hot";
  item.desc = item.desc || "";
  item.tags = toArray(item.tags);
  item.ingredients = toArray(item.ingredients);
  item.steps = toArray(item.steps);
  item.spicy = Number(item.spicy) || 0;
  item.minutes = Number(item.minutes) || 10;
  item.level = Number(item.level) || 1;
  item.soldOut = !!item.soldOut;
  return item;
}

function pickEditable(source) {
  const patch = {};
  EDITABLE_FIELDS.forEach(function (field) {
    if (source[field] !== undefined) {
      patch[field] = source[field];
    }
  });
  return normalize(Object.assign(normalize({}), patch));
}

function findCustom(id) {
  const list = getCustomList();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list[i];
    }
  }
  return null;
}

function isCustom(id) {
  return !!findCustom(id);
}

function isBuiltIn(id) {
  return !!base.DISH_MAP[id];
}

function getDish(id) {
  if (!id || isDeleted(id)) {
    return null;
  }
  const custom = findCustom(id);
  if (custom) {
    const item = normalize(custom);
    item.source = "custom";
    return item;
  }
  const origin = base.DISH_MAP[id];
  if (!origin) {
    return null;
  }
  const patch = getOverrideMap()[id] || {};
  const item = normalize(Object.assign({}, origin, patch));
  item.id = origin.id;
  item.source = "base";
  return item;
}

function getAll() {
  const deleted = getDeletedIds();
  const list = [];
  base.DISHES.forEach(function (origin) {
    if (deleted.indexOf(origin.id) >= 0) {
      return;
    }
    const dish = getDish(origin.id);
    if (dish) {
      list.push(dish);
    }
  });
  getCustomList().forEach(function (item) {
    if (deleted.indexOf(item.id) >= 0) {
      return;
    }
    const dish = getDish(item.id);
    if (dish) {
      list.push(dish);
    }
  });
  return list;
}

function getStats() {
  const list = getAll();
  let soldOut = 0;
  let custom = 0;
  list.forEach(function (dish) {
    if (dish.soldOut) {
      soldOut += 1;
    }
    if (dish.source === "custom") {
      custom += 1;
    }
  });
  return {
    total: list.length,
    onSale: list.length - soldOut,
    soldOut: soldOut,
    custom: custom
  };
}

function saveDish(input) {
  const id = input.id || "";
  const existing = id ? getDish(id) : null;
  const data = pickEditable(Object.assign({}, existing || {}, input));
  if (id && isCustom(id)) {
    const list = getCustomList().map(function (item) {
      if (item.id !== id) {
        return item;
      }
      return Object.assign({}, item, data, { id: id });
    });
    setCustomList(list);
    markDirty();
    return getDish(id);
  }
  if (id && isBuiltIn(id)) {
    const map = getOverrideMap();
    map[id] = data;
    setOverrideMap(map);
    markDirty();
    return getDish(id);
  }
  const newId = util.uid("dish");
  const list = getCustomList();
  list.push(Object.assign({}, data, { id: newId }));
  setCustomList(list);
  markDirty();
  return getDish(newId);
}

function deleteDish(id) {
  if (!id) {
    return false;
  }
  if (isCustom(id)) {
    setCustomList(
      getCustomList().filter(function (item) {
        return item.id !== id;
      })
    );
  } else if (isBuiltIn(id)) {
    const deleted = getDeletedIds();
    if (deleted.indexOf(id) < 0) {
      deleted.push(id);
    }
    setDeletedIds(deleted);
  } else {
    return false;
  }
  const map = getOverrideMap();
  if (map[id]) {
    delete map[id];
    setOverrideMap(map);
  }
  markDirty();
  return true;
}

function setSoldOut(id, soldOut) {
  const flag = !!soldOut;
  if (isCustom(id)) {
    setCustomList(
      getCustomList().map(function (item) {
        if (item.id !== id) {
          return item;
        }
        return Object.assign({}, item, { soldOut: flag });
      })
    );
    markDirty();
    return true;
  }
  if (isBuiltIn(id)) {
    const map = getOverrideMap();
    map[id] = Object.assign({}, map[id] || {}, { soldOut: flag });
    setOverrideMap(map);
    markDirty();
    return true;
  }
  return false;
}

function resetMenu() {
  setCustomList([]);
  setOverrideMap({});
  setDeletedIds([]);
  markDirty();
}

module.exports = {
  CATEGORIES: base.CATEGORIES,
  CATEGORY_MAP: base.CATEGORY_MAP,
  getCategoryName: base.getCategoryName,
  getSpicyText: base.getSpicyText,
  getDish: getDish,
  getAll: getAll,
  getStats: getStats,
  saveDish: saveDish,
  deleteDish: deleteDish,
  setSoldOut: setSoldOut,
  isCustom: isCustom,
  resetMenu: resetMenu,
  isDirty: isDirty,
  setDirty: setDirty,
  exportPayload: exportPayload,
  applyRemote: applyRemote
};
