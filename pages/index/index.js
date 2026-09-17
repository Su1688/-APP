const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");
const util = require("../../utils/util.js");
const sync = require("../../utils/sync.js");
const eggs = require("../../data/eggs.js");
const moments = require("../../data/moments.js");
const storage = require("../../utils/storage.js");

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
    submitting: false,
    canRoll: false,
    rollShow: false,
    rolling: false,
    rollName: "",
    rollDish: null,
    hearts: [],
    eggShow: false,
    longPress: eggs.LONG_PRESS,
    moment: null,
    momentLines: []
  },

  onShow() {
    this.syncTabBar();
    this.refresh();
    // 从纪念日菜单过来时，直接把购物车摊开
    if (storage.read("dc_open_cart", false)) {
      storage.write("dc_open_cart", false);
      this.openCart();
    }
    this.pullRemote(false);
  },

  onHide() {
    this.stopRolling();
  },

  onUnload() {
    this.stopRolling();
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
      bar.sync(0, store.pendingCount(), this.data.showCart || this.data.rollShow);
    }
  },

  refresh() {
    store.dropInvalidCart();
    const cart = store.getCart();
    const cartMap = store.toCartMap(cart);
    const profile = store.getProfile();
    const moment = moments.matchToday();
    this.setData({
      greet: util.greetByHour(new Date().getHours()),
      heroSub: profile.nick + "，今天想让大厨做点什么？",
      listTitle: this.buildTitle(),
      list: this.buildList(cartMap),
      refineList: this.buildRefine(cartMap),
      cartItems: store.buildCartItems(cart),
      cartCount: store.cartCount(cart),
      prefHint: this.buildPrefHint(profile),
      canRoll: this.buildRollPool().length > 0,
      moment: moment,
      momentLines: moments.lines(moment)
    });
  },

  buildRollPool() {
    return menu.getAll().filter(function (dish) {
      return !dish.soldOut;
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
    const list = menu.getAll().filter(function (dish) {
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
    return this.appendEggs(list, keyword);
  },

  // 搜索框里打中口令时，多摆一道平时不显示的菜
  appendEggs(list, keyword) {
    eggs.matchSearch(keyword).forEach(function (id) {
      const dish = menu.getDish(id);
      const exists = list.some(function (item) {
        return item.id === id;
      });
      if (dish && !dish.soldOut && !exists) {
        list.push(dish);
      }
    });
    return list;
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

  openMoment() {
    const moment = this.data.moment;
    if (!moment) {
      return;
    }
    wx.navigateTo({ url: "/pages/moment/moment?id=" + moment.id });
  },

  openCart() {
    if (this.data.cartCount === 0) {
      return;
    }
    this.setData({ showCart: true });
    this.syncTabBar();
  },

  closeCart() {
    this.setData({ showCart: false });
    this.syncTabBar();
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

  openRoll() {
    const pool = this.buildRollPool();
    if (pool.length === 0) {
      return;
    }
    this.setData({ rollShow: true, rolling: true, rollName: "", rollDish: null });
    this.startRolling(pool);
    this.syncTabBar();
  },

  startRolling(pool) {
    const candidates = pool || this.buildRollPool();
    if (candidates.length === 0) {
      return;
    }
    const self = this;
    this.stopRolling();
    this._rollTick = setInterval(function () {
      const dish = candidates[Math.floor(Math.random() * candidates.length)];
      self.setData({ rollName: dish.name });
    }, 70);
    this._rollEnd = setTimeout(function () {
      self.stopRolling();
      const dish = candidates[Math.floor(Math.random() * candidates.length)];
      self.setData({ rolling: false, rollDish: dish, rollName: dish.name });
      wx.vibrateShort({ type: "medium", fail() {} });
    }, 1000);
  },

  stopRolling() {
    if (this._rollTick) {
      clearInterval(this._rollTick);
      this._rollTick = null;
    }
    if (this._rollEnd) {
      clearTimeout(this._rollEnd);
      this._rollEnd = null;
    }
  },

  rollAgain() {
    if (this._rollEnd) {
      return;
    }
    this.setData({ rolling: true, rollDish: null });
    this.startRolling();
  },

  closeRoll() {
    this.stopRolling();
    this.setData({ rollShow: false, rolling: false, rollDish: null, rollName: "" });
    this.syncTabBar();
  },

  addRolled() {
    const dish = this.data.rollDish;
    if (!dish) {
      return;
    }
    store.addToCart(dish.id);
    this.vibrate();
    this.closeRoll();
    this.refresh();
  },

  onEgg() {
    const emojis = ["❤️", "💕", "🌸", "💗"];
    const hearts = [];
    for (let i = 0; i < 14; i++) {
      hearts.push({
        key: "h" + Date.now() + "_" + i,
        emoji: emojis[i % emojis.length],
        left: Math.floor(Math.random() * 86) + 4,
        delay: Math.round(Math.random() * 60) / 100,
        size: 26 + Math.floor(Math.random() * 18)
      });
    }
    const self = this;
    this.setData({ hearts: hearts });
    wx.vibrateShort({ type: "light", fail() {} });
    if (this._heartTimer) {
      clearTimeout(this._heartTimer);
    }
    this._heartTimer = setTimeout(function () {
      self.setData({ hearts: [] });
    }, 2200);
  },

  onHoldTitle() {
    this.setData({ eggShow: true });
    wx.vibrateShort({ type: "medium", fail() {} });
  },

  closeEgg() {
    this.setData({ eggShow: false });
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
        if (!order) {
          // 别让订单悄悄消失：把失败摆到台面上
          self.setData({ submitting: false });
          wx.showModal({
            title: "没提交成功",
            content: "再点一次试试。还是不行的话，看开发者工具右下角「调试器 → Console」里的红色报错，把内容发给大厨。",
            showCancel: false,
            confirmText: "知道了"
          });
          return;
        }
        self.setData({
          submitting: false,
          showCart: false,
          remark: "",
          expectTime: TIME_OPTIONS[0],
          timeIndex: 0
        });
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
