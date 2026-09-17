const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");
const sync = require("../../utils/sync.js");

Page({
  data: {
    categories: menu.CATEGORIES,
    activeCategory: "all",
    list: [],
    stats: { total: 0, onSale: 0, soldOut: 0, custom: 0 }
  },

  onShow() {
    this.refresh();
    const self = this;
    sync.pull(false).then(function (changed) {
      if (changed) {
        self.refresh();
      }
    });
  },

  refresh() {
    const active = this.data.activeCategory;
    const list = menu
      .getAll()
      .filter(function (dish) {
        return active === "all" || dish.category === active;
      })
      .map(function (dish) {
        return Object.assign({}, dish, {
          categoryName: menu.getCategoryName(dish.category),
          spicyText: menu.getSpicyText(dish.spicy) || "不辣"
        });
      });
    this.setData({
      list: list,
      stats: menu.getStats()
    });
  },

  onCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id }, this.refresh);
  },

  onEdit(e) {
    wx.navigateTo({
      url: "/pages/dish-edit/dish-edit?id=" + e.currentTarget.dataset.id
    });
  },

  onCreate() {
    wx.navigateTo({ url: "/pages/dish-edit/dish-edit" });
  },

  onToggleSoldOut(e) {
    const id = e.currentTarget.dataset.id;
    const dish = menu.getDish(id);
    if (!dish) {
      return;
    }
    const next = !dish.soldOut;
    menu.setSoldOut(id, next);
    store.dropInvalidCart();
    sync.pushMenu();
    this.refresh();
    wx.showToast({
      title: next ? "已标记「今日售罄」" : "已重新上架",
      icon: "none"
    });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const dish = menu.getDish(id);
    if (!dish) {
      return;
    }
    const self = this;
    wx.showModal({
      title: "删除「" + dish.name + "」",
      content:
        dish.source === "custom"
          ? "删除后无法恢复，确定吗？"
          : "这是默认菜单里的菜，删除后可以用「恢复默认菜单」找回来。",
      confirmText: "删除",
      confirmColor: "#ff6b4a",
      success(res) {
        if (!res.confirm) {
          return;
        }
        menu.deleteDish(id);
        store.dropDishEverywhere(id);
        sync.pushMenu();
        self.refresh();
        wx.showToast({ title: "已删除", icon: "none" });
      }
    });
  },

  onResetMenu() {
    const self = this;
    wx.showModal({
      title: "恢复默认菜单",
      content: "会清掉你自己加的菜，并把默认菜单还原成最初的样子，确定吗？",
      confirmText: "恢复",
      confirmColor: "#ff6b4a",
      success(res) {
        if (!res.confirm) {
          return;
        }
        menu.resetMenu();
        store.dropInvalidCart();
        sync.pushMenu();
        self.setData({ activeCategory: "all" });
        self.refresh();
        wx.showToast({ title: "已恢复默认菜单", icon: "none" });
      }
    });
  }
});
