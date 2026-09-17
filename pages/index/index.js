const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");
const util = require("../../utils/util.js");
const sync = require("../../utils/sync.js");

const TIME_OPTIONS = ["尽快", "30 分钟后", "1 小时后", "晚饭时间"];
const SPICY_TEXT = ["不辣", "微辣", "中辣", "特辣"];

function decorate(dish, cartMap) {
  const item = Object.assign({}, dish);
  item.count = cartMap[dish.id] || 0;
  return item;
}

Page({
  data: {
    greet: "",
    heroSub: "",
    categories: menu.CATEGORIES,
    activeCategory: "all",
    listTitle: "全部菜单",
    keyword: "",
    list: [],
    refineList: [],
    cartItems: [],
    cartCount: 0,
    showCart: false,
    remark: "",
    expectTime: TIME_OPTIONS[0],
    timeOptions: TIME_OPTIONS,
    timeIndex: 0,
    prefHint: "",
    submitting: false
  },

  onShow() {
    this.syncTabBar();
    this.refresh();
    this.pullRemote(false);
  },

  pullRemote(force) {
    const self = this;
    sync.pull(force).then(function (changed) {
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
      bar.sync(0, store.pendingCount());
    }
  },

  refresh() {
    store.dropInvalidCart();
    const cart = store.getCart();
    const cartMap = store.toCartMap(cart);
    const profile = store.getProfile();
    this.setData({
      greet: util.greetByHour(new Date().getHours()),
      heroSub: profile.nick + "，今天想让大厨做点什么？",
      listTitle: this.buildTitle(),
      list: this.buildList(cartMap),
      refineList: this.buildRefine(cartMap),
      cartItems: store.buildCartItems(cart),
      cartCount: store.cartCount(cart),
      prefHint: this.buildPrefHint(profile)
    });
  },

  buildTitle() {
    const category = menu.CATEGORY_MAP[this.data.activeCategory];
    if (!category || category.id === "all") {
      return "全部菜单";
    }
    return category.name + " · " + this.filterDishes().length + " 道";
  },

  filterDishes() {
    const category = this.data.activeCategory;
    const keyword = this.data.keyword.trim();
    return menu.getAll().filter(function (dish) {
      if (category !== "all" && dish.category !== category) {
        return false;
      }
      if (keyword) {
        const matched =
          dish.name.indexOf(keyword) >= 0 ||
          dish.desc.indexOf(keyword) >= 0 ||
          dish.tags.join("").indexOf(keyword) >= 0;
        if (!matched) {
          return false;
        }
      }
      return true;
    });
  },

  buildList(cartMap) {
    const list = this.filterDishes().map(function (dish) {
      return decorate(dish, cartMap);
    });
    list.sort(function (a, b) {
      const aOut = a.soldOut ? 1 : 0;
      const bOut = b.soldOut ? 1 : 0;
      return aOut - bOut;
    });
    return list;
  },

  buildRefine(cartMap) {
    if (this.data.activeCategory !== "all" || this.data.keyword.trim()) {
      return [];
    }
    const stats = store.getStats();
    const all = menu.getAll().filter(function (dish) {
      return !dish.soldOut;
    });
    const picked = all
      .filter(function (dish) {
        return dish.tags.indexOf("招牌") >= 0;
      })
      .slice(0, 3);
    if (stats.topDish && stats.topCount > 1) {
      const exists = picked.some(function (dish) {
        return dish.id === stats.topDish.id;
      });
      if (!exists) {
        const top = all.filter(function (dish) {
          return dish.id === stats.topDish.id;
        })[0];
        if (top) {
          picked.push(top);
        }
      }
    }
    return picked.map(function (dish) {
      return decorate(dish, cartMap);
    });
  },

  buildPrefHint(profile) {
    const parts = [];
    const spicy = SPICY_TEXT[profile.spicy];
    if (spicy) {
      parts.push(spicy);
    }
    if (profile.dislikes.length > 0) {
      parts.push("不吃" + profile.dislikes.join("、"));
    }
    if (parts.length === 0) {
      return "";
    }
    return "大厨记得你的口味：" + parts.join(" · ");
  },

  onCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id }, this.refresh);
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value }, this.refresh);
  },

  clearSearch() {
    this.setData({ keyword: "" }, this.refresh);
  },

  onAdd(e) {
    store.addToCart(e.detail.id);
    this.vibrate();
    this.refresh();
  },

  onMinus(e) {
    store.removeFromCart(e.detail.id);
    this.vibrate();
    this.refresh();
  },

  onAddTap(e) {
    store.addToCart(e.currentTarget.dataset.id);
    this.vibrate();
    this.refresh();
  },

  onMinusTap(e) {
    store.removeFromCart(e.currentTarget.dataset.id);
    this.vibrate();
    this.refresh();
  },

  vibrate() {
    wx.vibrateShort({ type: "light", fail() {} });
  },

  onOpenDish(e) {
    wx.navigateTo({ url: "/pages/dish-detail/dish-detail?id=" + e.detail.id });
  },

  openCart() {
    if (this.data.cartCount === 0) {
      return;
    }
    this.setData({ showCart: true });
  },

  closeCart() {
    this.setData({ showCart: false });
  },

  onClearCart() {
    const self = this;
    wx.showModal({
      title: "清空菜单",
      content: "确定要把已经点的菜都去掉吗？",
      confirmText: "清空",
      confirmColor: "#ff6b4a",
      success(res) {
        if (res.confirm) {
          store.clearCart();
          self.setData({ showCart: false });
          self.refresh();
        }
      }
    });
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value });
  },

  onTimeChange(e) {
    const index = Number(e.detail.value);
    this.setData({ timeIndex: index, expectTime: TIME_OPTIONS[index] });
  },

  submitOrder() {
    const cart = store.getCart();
    if (cart.length === 0) {
      wx.showToast({ title: "还没点菜呢", icon: "none" });
      return;
    }
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    const self = this;
    sync
      .submitOrder({
        cart: cart,
        remark: this.data.remark.trim(),
        expectTime: this.data.expectTime
      })
      .then(function (order) {
        self.setData({
          submitting: false,
          showCart: false,
          remark: "",
          expectTime: TIME_OPTIONS[0],
          timeIndex: 0
        });
        if (!order) {
          return;
        }
        store.clearCart();
        self.refresh();
        self.syncTabBar();
        wx.showModal({
          title: "已告诉大厨啦 🍳",
          content: order.summary + "，等着开饭吧～",
          confirmText: "看看订单",
          cancelText: "再点两道",
          confirmColor: "#ff6b4a",
          success(res) {
            if (res.confirm) {
              wx.navigateTo({ url: "/pages/order-detail/order-detail?id=" + order.id });
            }
          }
        });
      });
  }
});
