const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");
const storage = require("../../utils/storage.js");
const moments = require("../../data/moments.js");

function decorate(dish, cartMap) {
  const item = Object.assign({}, dish);
  item.count = cartMap[dish.id] || 0;
  return item;
}

Page({
  data: {
    moment: null,
    lines: [],
    list: [],
    cartCount: 0
  },

  onLoad(options) {
    const moment = moments.find(options.id) || moments.matchToday();
    this.setData({ moment: moment, lines: moments.lines(moment) });
    if (moment && moment.title) {
      wx.setNavigationBarTitle({ title: moment.title });
    }
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    store.dropInvalidCart();
    const cart = store.getCart();
    const cartMap = store.toCartMap(cart);
    this.setData({
      list: this.buildList(cartMap),
      cartCount: store.cartCount(cart)
    });
  },

  buildList(cartMap) {
    const moment = this.data.moment;
    let dishes = null;
    if (moment && Array.isArray(moment.dishIds) && moment.dishIds.length > 0) {
      dishes = moment.dishIds
        .map(function (id) {
          return menu.getDish(id);
        })
        .filter(function (dish) {
          return !!dish;
        });
    } else {
      dishes = menu.getAll();
    }
    const list = dishes.map(function (dish) {
      return decorate(dish, cartMap);
    });
    list.sort(function (a, b) {
      return (a.soldOut ? 1 : 0) - (b.soldOut ? 1 : 0);
    });
    return list;
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

  goOrder() {
    if (this.data.cartCount === 0) {
      return;
    }
    // 回首页，让首页把购物车直接摊开
    storage.write("dc_open_cart", true);
    wx.switchTab({ url: "/pages/index/index" });
  }
});
