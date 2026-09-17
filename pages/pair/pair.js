const sync = require("../../utils/sync.js");

const ERROR_TEXT = {
  NOT_FOUND: "没有找到这个邀请码，再核对一下",
  FULL: "这个小家已经满员了",
  ALREADY_PAIRED: "你已经在一个小家里了，先退出再加入",
  EMPTY_CODE: "请先输入邀请码",
  CODE_GEN_FAILED: "邀请码生成失败，稍后再试",
  NO_OPENID: "拿不到微信身份，重开一次小程序试试",
  CLOUD_DISABLED: "还没配置云开发环境，先看 README"
};

Page({
  data: {
    cloudOn: false,
    loading: true,
    kitchen: null,
    codeInput: "",
    busy: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const self = this;
    const cloudOn = sync.isCloudOn();
    this.setData({ cloudOn: cloudOn, loading: cloudOn });
    if (!cloudOn) {
      this.setData({ loading: false, kitchen: sync.getKitchen() });
      return;
    }
    sync.refreshPair().then(function (kitchen) {
      self.setData({ kitchen: kitchen, loading: false });
    });
  },

  onCodeInput(e) {
    this.setData({ codeInput: (e.detail.value || "").toUpperCase() });
  },

  onCreate() {
    const self = this;
    if (this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    sync
      .createFamily()
      .then(function (kitchen) {
        self.setData({ busy: false, kitchen: kitchen });
        wx.showToast({ title: "小家建好啦", icon: "none" });
      })
      .catch(function (err) {
        self.setData({ busy: false });
        wx.showToast({
          title: ERROR_TEXT[(err && err.code) || ""] || "创建失败，稍后再试",
          icon: "none"
        });
      });
  },

  onJoin() {
    const self = this;
    const code = this.data.codeInput.trim();
    if (!code) {
      wx.showToast({ title: ERROR_TEXT.EMPTY_CODE, icon: "none" });
      return;
    }
    if (this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    sync
      .joinFamily(code)
      .then(function (kitchen) {
        self.setData({ busy: false, kitchen: kitchen, codeInput: "" });
        wx.showToast({ title: "加入成功 🎉", icon: "none" });
        return sync.pull(true);
      })
      .then(function () {
        self.refresh();
      })
      .catch(function (err) {
        self.setData({ busy: false });
        wx.showToast({
          title: ERROR_TEXT[(err && err.code) || ""] || "加入失败，稍后再试",
          icon: "none"
        });
      });
  },

  onCopyCode() {
    const kitchen = this.data.kitchen;
    if (!kitchen) {
      return;
    }
    wx.setClipboardData({
      data: kitchen.code,
      success() {
        wx.showToast({ title: "邀请码已复制", icon: "none" });
      }
    });
  },

  onSyncNow() {
    const self = this;
    wx.showLoading({ title: "同步中" });
    sync.pull(true).then(function (changed) {
      wx.hideLoading();
      self.refresh();
      wx.showToast({
        title: changed ? "已经是最新的啦" : "同步失败，检查一下网络",
        icon: "none"
      });
    });
  },

  onLeave() {
    const self = this;
    wx.showModal({
      title: "退出小家",
      content: "退出后这台设备就看不到共享的菜单和订单了。云端的记录不会被删除，用邀请码可以再回来。",
      confirmText: "退出",
      confirmColor: "#ff6b4a",
      success(res) {
        if (!res.confirm) {
          return;
        }
        sync.leaveFamily().then(function () {
          self.setData({ kitchen: null, codeInput: "" });
          wx.showToast({ title: "已退出", icon: "none" });
        });
      }
    });
  }
});
