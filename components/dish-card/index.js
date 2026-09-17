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

  methods: {
    noop() {},

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
