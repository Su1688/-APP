Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    options: {
      type: Array,
      value: []
    }
  },

  methods: {
    // 点哪句用哪句
    onPick(e) {
      this.triggerEvent("select", { text: e.currentTarget.dataset.text || "" });
    },

    // 不说了：直接接单，不写这句话
    onSkip() {
      this.triggerEvent("select", { text: "" });
    },

    onClose() {
      this.triggerEvent("close");
    },

    noop() {}
  }
});
