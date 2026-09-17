const dishes = require("../../data/dishes.js");

Component({
  properties: {
    dish: {
      type: Object,
      value: null
    },
    count: {
      type: Number,
      value: 0
    }
  },

  data: {
    spicyText: ""
  },

  observers: {
    dish(value) {
      this.setData({
        spicyText: value ? dishes.getSpicyText(value.spicy) : ""
      });
    }
  },

  lifetimes: {
    detached() {
      if (this._thumbTimer) {
        clearTimeout(this._thumbTimer);
        this._thumbTimer = null;
      }
    }
  },

  methods: {
    noop() {},

    // 封面单独处理：点一下照常进详情，连点 5 次就掉爱心
    onThumb() {
      if (!this.data.dish) {
        return;
      }
      const now = Date.now();
      const taps = (this._taps || []).filter(function (at) {
        return now - at < 1500;
      });
      taps.push(now);
      this._taps = taps;

      if (this._thumbTimer) {
        clearTimeout(this._thumbTimer);
        this._thumbTimer = null;
      }

      if (taps.length >= 5) {
        this._taps = [];
        this.triggerEvent("egg", { id: this.data.dish.id });
        return;
      }

      const self = this;
      this._thumbTimer = setTimeout(function () {
        self._thumbTimer = null;
        self._taps = [];
        self.onTap();
      }, 320);
    },

    onTap() {
      if (!this.data.dish) {
        return;
      }
      this.triggerEvent("tapdish", { id: this.data.dish.id });
    },

    onAdd() {
      if (!this.data.dish) {
        return;
      }
      this.triggerEvent("add", { id: this.data.dish.id });
    },

    onMinus() {
      if (!this.data.dish) {
        return;
      }
      this.triggerEvent("minus", { id: this.data.dish.id });
    }
  }
});
