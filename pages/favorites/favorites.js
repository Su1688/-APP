const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");
const image = require("../../utils/image.js");

Page({
  data: {
    list: [],
    cartCount: 0,
    tip: ""
  },

  onShow() {
    this.syncTabBar();
    this.refresh();
  },

  syncTabBar() {
    if (typeof this.getTabBar !== "function") {
      return;
    }
    const bar = this.getTabBar();
    if (bar) {
      bar.sync(2, store.pendingCount());
    }
  },

  refresh() {
    store.dropInvalidCart();
    const cart = store.getCart();
    const cartMap = store.toCartMap(cart);
    const ids = store.getFavorites();
    const list = ids
      .map(function (id) {
        return menu.getDish(id);
      })
      .filter(function (dish) {
        return !!dish;
      })
      .map(function (dish) {
        const item = Object.assign({}, dish);
        item.count = cartMap[dish.id] || 0;
        return item;
      });
    this.setData({
      list: list,
      cartCount: store.cartCount(cart),
      tip: list.length > 0 ? "点右上角的 + 直接加进菜单" : ""
    });
    this.resolveImages(list);
  },

  // 云图 fileID 换 https 链接，换不到就保持原值
  resolveImages(list) {
    const self = this;
    image.resolveList(list).then(function (next) {
      if (next !== list) {
        self.setData({ list: next });
      }
    });
  },

  onAdd(e) {
    store.addToCart(e.detail.id);
    wx.vibrateShort({ type: "light", fail() {} });
    this.refresh();
  },

  onMinus(e) {
    store.removeFromCart(e.detail.id);
    wx.vibrateShort({ type: "light", fail() {} });
    this.refresh();
  },

  onOpenDish(e) {
    wx.navigateTo({ url: "/pages/dish-detail/dish-detail?id=" + e.detail.id });
  },

  goDishes() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
