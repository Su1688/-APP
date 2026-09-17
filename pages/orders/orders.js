const store = require("../../utils/store.js");
const util = require("../../utils/util.js");
const status = require("../../utils/status.js");
const sync = require("../../utils/sync.js");

const TABS = [
  { id: "all", name: "全部" },
  { id: "pending", name: "待接单" },
  { id: "cooking", name: "制作中" },
  { id: "done", name: "已完成" }
];

function decorate(order) {
  return Object.assign({}, order, {
    statusMeta: status.getStatus(order.status),
    timeText: util.relativeTime(order.createdAt),
    actionText: status.getActionText(order.status)
  });
}

Page({
  data: {
    tabs: TABS,
    active: "all",
    orders: [],
    isChef: false,
    counts: { pending: 0, cooking: 0, done: 0 },
    emptyEmoji: "🧾",
    emptyText: "还没有点过菜",
    emptyHint: "去「点菜」页挑几道爱吃的吧"
  },

  onShow() {
    this.syncTabBar();
    this.refresh();
    this.pullRemote();
  },

  pullRemote() {
    const self = this;
    sync.pull(false).then(function (changed) {
      if (changed) {
        self.refresh();
        self.syncTabBar();
      }
    });
  },

  onPullDownRefresh() {
    const self = this;
    sync.pull(true).then(function () {
      self.refresh();
      self.syncTabBar();
      wx.stopPullDownRefresh();
    });
  },

  syncTabBar() {
    if (typeof this.getTabBar !== "function") {
      return;
    }
    const bar = this.getTabBar();
    if (bar) {
      bar.sync(1, store.pendingCount());
    }
  },

  refresh() {
    const all = store.getOrders();
    const counts = { pending: 0, cooking: 0, done: 0 };
    all.forEach(function (order) {
      if (counts[order.status] !== undefined) {
        counts[order.status] += 1;
      }
    });
    const active = this.data.active;
    const filtered = all.filter(function (order) {
      if (active === "all") {
        return true;
      }
      return order.status === active;
    });
    const isChef = store.getRole() === "chef";
    this.setData({
      orders: filtered.map(decorate),
      counts: counts,
      isChef: isChef,
      emptyEmoji: isChef ? "🍳" : "🧾",
      emptyText: active === "all" ? "还没有点过菜" : "这里还没有内容",
      emptyHint: isChef ? "她不点菜的时候，就歇一会儿吧" : "去「点菜」页挑几道爱吃的吧"
    });
  },

  onTab(e) {
    this.setData({ active: e.currentTarget.dataset.id }, this.refresh);
  },

  onAdvance(e) {
    const id = e.currentTarget.dataset.id;
    const order = store.getOrder(id);
    if (!order) {
      return;
    }
    const next = status.nextStatus(order.status);
    if (!next) {
      return;
    }
    const self = this;
    sync.advanceOrder(id).then(function (result) {
      if (!result) {
        return;
      }
      wx.showToast({
        title: next === "cooking" ? "接单啦，开做！" : "做好啦，喊她吃饭",
        icon: "none"
      });
      self.refresh();
      self.syncTabBar();
    });
  },

  openDetail(e) {
    wx.navigateTo({
      url: "/pages/order-detail/order-detail?id=" + e.currentTarget.dataset.id
    });
  },

  goDishes() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
