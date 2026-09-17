const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");

const LEVEL_TEXT = ["", "简单", "中等", "有点挑战"];

Page({
  data: {
    dishId: "",
    dish: null,
    count: 0,
    fav: false,
    soldOut: false,
    spicyText: "",
    levelText: "",
    categoryName: ""
  },

  onLoad(options) {
    this.setData({ dishId: options.id || "" });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const dish = menu.getDish(this.data.dishId);
    if (!dish) {
      this.setData({ dish: null });
      return;
    }
    const cartMap = store.toCartMap();
    this.setData({
      dish: dish,
      count: cartMap[dish.id] || 0,
      fav: store.isFavorite(dish.id),
      soldOut: dish.soldOut,
      spicyText: menu.getSpicyText(dish.spicy) || "不辣",
      levelText: LEVEL_TEXT[dish.level] || "简单",
      categoryName: menu.getCategoryName(dish.category)
    });
    wx.setNavigationBarTitle({ title: dish.name });
  },

  onAdd() {
    if (this.data.soldOut) {
      wx.showToast({ title: "今天没有这道菜啦", icon: "none" });
      return;
    }
    store.addToCart(this.data.dishId);
    wx.vibrateShort({ type: "light", fail() {} });
    this.refresh();
  },

  onMinus() {
    store.removeFromCart(this.data.dishId);
    wx.vibrateShort({ type: "light", fail() {} });
    this.refresh();
  },

  onToggleFav() {
    const added = store.toggleFavorite(this.data.dishId);
    this.setData({ fav: added });
    wx.showToast({ title: added ? "已收藏 💛" : "取消收藏", icon: "none" });
  },

  goCart() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
