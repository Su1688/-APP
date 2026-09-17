const cloud = require("./cloud.js");
const menu = require("./menu.js");
const store = require("./store.js");
const storage = require("./storage.js");

const KITCHEN_KEY = "dc_kitchen";
const PULL_INTERVAL = 4000;

let lastPullAt = 0;
let pulling = null;

function init() {
  return cloud.init();
}

function isCloudOn() {
  return cloud.isConfigured() && cloud.isSupported();
}

function getKitchen() {
  const value = storage.read(KITCHEN_KEY, null);
  return value && value.id ? value : null;
}

function setKitchen(kitchen) {
  storage.write(KITCHEN_KEY, kitchen || null);
}

function isPaired() {
  return !!getKitchen();
}

function canSync() {
  return isCloudOn() && isPaired();
}

function notifyError(err) {
  const code = err && err.code;
  if (code === "NOT_PAIRED") {
    setKitchen(null);
    wx.showToast({ title: "小家断开了，去「我们的小家」重新配对", icon: "none" });
    return;
  }
  if (code === "CLOUD_DISABLED") {
    return;
  }
  wx.showToast({ title: "网络不太顺，再试一次", icon: "none" });
}

/* ---------------- 配对 ---------------- */

function refreshPair() {
  if (!isCloudOn()) {
    return Promise.resolve(null);
  }
  return cloud
    .call("pairStatus")
    .then(function (res) {
      setKitchen(res.kitchen || null);
      return res.kitchen || null;
    })
    .catch(function () {
      return getKitchen();
    });
}

function createFamily() {
  return cloud.call("pairCreate").then(function (res) {
    setKitchen(res.kitchen);
    return res.kitchen;
  });
}

function joinFamily(code) {
  return cloud.call("pairJoin", { code: code }).then(function (res) {
    setKitchen(res.kitchen);
    return res.kitchen;
  });
}

function leaveFamily() {
  if (!isCloudOn()) {
    setKitchen(null);
    return Promise.resolve(true);
  }
  return cloud
    .call("pairLeave")
    .then(function () {
      setKitchen(null);
      return true;
    })
    .catch(function () {
      setKitchen(null);
      return true;
    });
}

/* ---------------- 同步 ---------------- */

function pushMenu() {
  if (!canSync()) {
    return Promise.resolve(false);
  }
  return cloud
    .call("pushMenu", { payload: menu.exportPayload() })
    .then(function () {
      menu.setDirty(false);
      return true;
    })
    .catch(function () {
      menu.setDirty(true);
      return false;
    });
}

function pushProfile() {
  if (!canSync()) {
    return Promise.resolve(false);
  }
  return cloud
    .call("saveProfile", { profile: store.getSharedProfile() })
    .then(function () {
      return true;
    })
    .catch(function () {
      return false;
    });
}

function pull(force) {
  if (!canSync()) {
    return Promise.resolve(false);
  }
  const now = Date.now();
  if (!force && now - lastPullAt < PULL_INTERVAL) {
    return Promise.resolve(false);
  }
  if (pulling) {
    return pulling;
  }
  const prepare = menu.isDirty() ? pushMenu() : Promise.resolve(true);
  pulling = prepare
    .then(function () {
      return cloud.call("pull");
    })
    .then(function (res) {
      lastPullAt = Date.now();
      if (res.kitchen) {
        setKitchen(res.kitchen);
      }
      if (res.menu && !menu.isDirty()) {
        menu.applyRemote(res.menu);
      }
      if (res.profile) {
        store.applyRemoteProfile(res.profile);
      }
      if (Array.isArray(res.orders)) {
        store.applyRemoteOrders(res.orders);
      }
      return true;
    })
    .catch(function (err) {
      notifyError(err);
      return false;
    })
    .then(function (value) {
      pulling = null;
      return value;
    });
  return pulling;
}

/* ---------------- 订单 ---------------- */

function submitOrder(payload) {
  const items = store.buildOrderItems(payload.cart);
  if (items.length === 0) {
    return Promise.resolve(null);
  }
  if (!canSync()) {
    return Promise.resolve(store.createOrder(payload));
  }
  return cloud
    .call("createOrder", {
      items: items,
      remark: payload.remark || "",
      expectTime: payload.expectTime || "尽快"
    })
    .then(function (res) {
      store.upsertOrder(res.order);
      return res.order;
    })
    .catch(function (err) {
      notifyError(err);
      return null;
    });
}

function advanceOrder(id) {
  if (!canSync()) {
    return Promise.resolve(store.advanceOrder(id));
  }
  return cloud
    .call("orderAdvance", { id: id })
    .then(function (res) {
      store.upsertOrder(res.order);
      return res.order;
    })
    .catch(function (err) {
      notifyError(err);
      return null;
    });
}

function cancelOrder(id) {
  if (!canSync()) {
    return Promise.resolve(store.cancelOrder(id));
  }
  return cloud
    .call("orderCancel", { id: id })
    .then(function (res) {
      store.upsertOrder(res.order);
      return res.order;
    })
    .catch(function (err) {
      notifyError(err);
      return null;
    });
}

function urgeOrder(id) {
  if (!canSync()) {
    return Promise.resolve(store.urgeOrder(id));
  }
  return cloud
    .call("orderUrge", { id: id })
    .then(function (res) {
      store.upsertOrder(res.order);
      return res.order;
    })
    .catch(function (err) {
      notifyError(err);
      return null;
    });
}

module.exports = {
  init: init,
  isCloudOn: isCloudOn,
  isPaired: isPaired,
  canSync: canSync,
  getKitchen: getKitchen,
  refreshPair: refreshPair,
  createFamily: createFamily,
  joinFamily: joinFamily,
  leaveFamily: leaveFamily,
  pull: pull,
  pushMenu: pushMenu,
  pushProfile: pushProfile,
  submitOrder: submitOrder,
  advanceOrder: advanceOrder,
  cancelOrder: cancelOrder,
  urgeOrder: urgeOrder
};
