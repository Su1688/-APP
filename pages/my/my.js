const store = require("../../utils/store.js");
const menu = require("../../utils/menu.js");
const sync = require("../../utils/sync.js");

const SPICY_OPTIONS = ["不辣", "微辣", "中辣", "特辣"];
const DISLIKE_OPTIONS = [
  "香菜",
  "葱",
  "姜",
  "蒜",
  "辣椒",
  "花生",
  "海鲜",
  "内脏",
  "胡萝卜",
  "菌菇"
];

Page({
  data: {
    profile: null,
    isChef: false,
    spicyOptions: SPICY_OPTIONS,
    spicyIndex: 1,
    dislikeOptions: [],
    stats: {
      orderCount: 0,
      dishTotal: 0,
      dishKinds: 0,
      topDish: null,
      topCount: 0
    },
    menuStats: { total: 0, onSale: 0, soldOut: 0, custom: 0 },
    kitchen: null,
    pairSub: ""
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
      }
    });
  },

  syncTabBar() {
    if (typeof this.getTabBar !== "function") {
      return;
    }
    const bar = this.getTabBar();
    if (bar) {
      bar.sync(3, store.pendingCount());
    }
  },

  refresh() {
    const profile = store.getProfile();
    const dislikes = profile.dislikes || [];
    this.setData({
      profile: profile,
      isChef: store.getRole() === "chef",
      spicyIndex: profile.spicy,
      dislikeOptions: DISLIKE_OPTIONS.map(function (name) {
        return { name: name, on: dislikes.indexOf(name) >= 0 };
      }),
      stats: store.getStats(),
      menuStats: menu.getStats(),
      kitchen: sync.getKitchen(),
      pairSub: this.buildPairSub()
    });
  },

  buildPairSub() {
    if (!sync.isCloudOn()) {
      return "单机模式，数据只存在这台手机";
    }
    const kitchen = sync.getKitchen();
    if (!kitchen) {
      return "和 TA 配对后，菜单和订单会自动同步";
    }
    return "邀请码 " + kitchen.code + " · " + kitchen.memberCount + "/2 台设备已连接";
  },

  goPair() {
    wx.navigateTo({ url: "/pages/pair/pair" });
  },

  goMenuManage() {
    wx.navigateTo({ url: "/pages/menu-manage/menu-manage" });
  },

  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    if (!tempPath) {
      return;
    }
    const self = this;
    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      success(res) {
        self.setData({ profile: store.saveProfile({ avatar: res.savedFilePath }) });
      },
      fail() {
        self.setData({ profile: store.saveProfile({ avatar: tempPath }) });
      }
    });
  },

  onNickInput(e) {
    const nick = (e.detail.value || "").trim();
    if (!nick || nick === this.data.profile.nick) {
      return;
    }
    this.setData({ profile: store.saveProfile({ nick: nick }) });
  },

  onSpicy(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({
      profile: store.saveProfile({ spicy: index }),
      spicyIndex: index
    });
    sync.pushProfile();
  },

  onToggleDislike(e) {
    const name = e.currentTarget.dataset.name;
    const dislikes = (this.data.profile.dislikes || []).slice();
    const index = dislikes.indexOf(name);
    if (index >= 0) {
      dislikes.splice(index, 1);
    } else {
      dislikes.push(name);
    }
    this.setData({ profile: store.saveProfile({ dislikes: dislikes }) });
    sync.pushProfile();
    this.refresh();
  },

  onToggleRole(e) {
    const isChef = e.detail.value;
    store.setRole(isChef ? "chef" : "girl");
    this.setData({ isChef: isChef });
    wx.showToast({
      title: isChef ? "已切换成大厨 👨‍🍳" : "已切换回小可爱 🙋",
      icon: "none"
    });
    this.refresh();
  },

  onReset() {
    const self = this;
    wx.showModal({
      title: "清空所有数据",
      content: sync.isPaired()
        ? "只会清掉这台手机上的订单和收藏。云端的记录不会删除，下次同步会重新拉回来；菜单改动也会保留。"
        : "订单和收藏会被清掉，确定吗？",
      confirmText: "清空",
      confirmColor: "#ff6b4a",
      success(res) {
        if (res.confirm) {
          store.resetAll();
          self.refresh();
          wx.showToast({ title: "已清空", icon: "none" });
        }
      }
    });
  }
});
