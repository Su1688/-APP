const store = require("../../utils/store.js");
const util = require("../../utils/util.js");
const status = require("../../utils/status.js");
const menu = require("../../utils/menu.js");
const sync = require("../../utils/sync.js");
const loveNotes = require("../../utils/love-notes.js");

Page({
  data: {
    orderId: "",
    order: null,
    statusMeta: null,
    timeline: [],
    isChef: false,
    actionText: "",
    canUrge: false,
    canCancel: false,
    createdAtText: "",
    noteText: "",
    pickerShow: false,
    pickerOptions: []
  },

  onLoad(options) {
    this.setData({ orderId: options.id || "" });
  },

  onShow() {
    this.refresh();
    const self = this;
    sync.pull(true).then(function (changed) {
      if (changed) {
        self.refresh();
      }
    });
  },

  refresh() {
    const order = store.getOrder(this.data.orderId);
    if (!order) {
      this.setData({ order: null });
      return;
    }
    const meta = status.getStatus(order.status);
    const isChef = store.getRole() === "chef";
    const running = order.status === "pending" || order.status === "cooking";
    const notes = Array.isArray(order.notes) ? order.notes : [];
    const latest = notes.length > 0 ? notes[notes.length - 1] : null;
    this.setData({
      order: order,
      statusMeta: meta,
      noteText: latest ? latest.text : "",
      timeline: this.buildTimeline(order),
      isChef: isChef,
      actionText: status.getActionText(order.status),
      canUrge: !isChef && running,
      canCancel: !isChef && order.status === "pending",
      createdAtText: util.formatFullTime(order.createdAt)
    });
  },

  buildTimeline(order) {
    return order.timeline
      .slice()
      .reverse()
      .map(function (entry, index) {
        const meta = status.getStatus(entry.status);
        return {
          key: entry.status + "_" + entry.at + "_" + index,
          text: meta.step,
          time: util.formatTime(entry.at),
          color: meta.color
        };
      });
  },

  onAdvance() {
    const next = this.nextStatus();
    if (!next) {
      return;
    }
    // 接单：先说一句再开做
    if (next === "cooking") {
      this.openNotePicker();
      return;
    }
    // 做好啦：自动来一句
    this.runAdvance(loveNotes.pick("done", store.noteHistory(this.data.order, "done")));
  },

  nextStatus() {
    const order = this.data.order;
    return order ? status.nextStatus(order.status) : "";
  },

  openNotePicker() {
    const used = store.noteHistory(this.data.order, "accept");
    this.setData({
      pickerShow: true,
      pickerOptions: loveNotes.pickFew("accept", used, 6)
    });
  },

  onPickerClose() {
    this.setData({ pickerShow: false, pickerOptions: [] });
  },

  onPickerSelect(e) {
    const text = (e.detail && e.detail.text) || "";
    this.setData({ pickerShow: false, pickerOptions: [] });
    this.runAdvance(text);
  },

  runAdvance(note) {
    const order = this.data.order;
    if (!order) {
      return;
    }
    const next = status.nextStatus(order.status);
    const self = this;
    sync.advanceOrder(order.id, note).then(function (result) {
      if (!result) {
        return;
      }
      wx.showToast({
        title: next === "cooking" ? "接单啦，开做！" : "做好啦，喊她吃饭",
        icon: "none"
      });
      self.refresh();
    });
  },

  onUrge() {
    const order = this.data.order;
    if (!order) {
      return;
    }
    const tips = ["已经帮你催啦 🥺", "再催一次，大厨加速中 🔥", "催第 N 次了，别急嘛～"];
    const count = (order.urgeCount || 0) + 1;
    const note = loveNotes.pick("urge", store.noteHistory(order, "urge"));
    const self = this;
    sync.urgeOrder(order.id, note).then(function (result) {
      if (!result) {
        return;
      }
      wx.showToast({
        title: count === 1 ? tips[0] : count === 2 ? tips[1] : tips[2],
        icon: "none"
      });
      self.refresh();
    });
  },

  onCancel() {
    const self = this;
    wx.showModal({
      title: "取消这次点菜",
      content: "确定要取消吗？",
      confirmText: "取消点菜",
      confirmColor: "#ff6b4a",
      success(res) {
        if (res.confirm) {
          sync.cancelOrder(self.data.orderId).then(function (result) {
            if (!result) {
              return;
            }
            self.refresh();
            wx.showToast({ title: "已取消", icon: "none" });
          });
        }
      }
    });
  },

  onReorder() {
    const order = this.data.order;
    if (!order) {
      return;
    }
    let skipped = 0;
    order.items.forEach(function (item) {
      const dish = menu.getDish(item.id);
      if (!dish || dish.soldOut) {
        skipped += 1;
        return;
      }
      let times = item.count;
      while (times > 0) {
        store.addToCart(item.id);
        times -= 1;
      }
    });
    wx.showToast({
      title: skipped > 0 ? "已放回菜单，" + skipped + " 道菜暂时点不了" : "已放回菜单",
      icon: "none"
    });
    wx.switchTab({ url: "/pages/index/index" });
  },

  goDishes() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
