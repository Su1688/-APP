Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/index/index", text: "点菜", icon: "🍽", badge: 0 },
      { pagePath: "/pages/orders/orders", text: "订单", icon: "🧾", badge: 0 },
      { pagePath: "/pages/favorites/favorites", text: "收藏", icon: "💛", badge: 0 },
      { pagePath: "/pages/my/my", text: "我的", icon: "🙋", badge: 0 }
    ]
  },

  methods: {
    sync(selected, badge) {
      this.setData({
        selected: selected,
        "list[1].badge": badge || 0
      });
    },

    onTap(e) {
      const index = e.currentTarget.dataset.index;
      if (index === this.data.selected) {
        return;
      }
      wx.switchTab({ url: this.data.list[index].pagePath });
    }
  }
});
