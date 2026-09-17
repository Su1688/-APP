const loveNotes = require("../../utils/love-notes.js");

const TABS = [
  { id: "accept", name: "接单时", emoji: "🍳", hint: "你点「接单开做」后，她看到的" },
  { id: "done", name: "做好时", emoji: "🍽", hint: "你点「做好啦」后，她看到的" },
  { id: "urge", name: "催单时", emoji: "🥺", hint: "她点「催一催」后，你回的那句" }
];

Page({
  data: {
    tabs: TABS,
    activeIndex: 0,
    scene: TABS[0].id,
    hint: TABS[0].hint,
    lines: [],
    customed: false,
    draft: ""
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const scene = this.data.scene;
    this.setData({
      lines: loveNotes.pool(scene),
      customed: loveNotes.isCustom(scene)
    });
  },

  onTab(e) {
    const index = Number(e.currentTarget.dataset.index);
    const tab = TABS[index];
    if (!tab) {
      return;
    }
    this.setData(
      { activeIndex: index, scene: tab.id, hint: tab.hint, draft: "" },
      this.refresh
    );
  },

  onDraft(e) {
    this.setData({ draft: e.detail.value });
  },

  onAdd() {
    const text = this.data.draft.trim();
    if (!text) {
      wx.showToast({ title: "先写一句", icon: "none" });
      return;
    }
    this.setData({
      lines: loveNotes.addLine(this.data.scene, text),
      customed: true,
      draft: ""
    });
    wx.showToast({ title: "加上啦", icon: "none" });
  },

  onRemove(e) {
    const text = e.currentTarget.dataset.text;
    const self = this;
    wx.showModal({
      title: "删掉这句",
      content: text,
      confirmText: "删掉",
      confirmColor: "#ff6b4a",
      success(res) {
        if (!res.confirm) {
          return;
        }
        self.setData({
          lines: loveNotes.removeLine(self.data.scene, text),
          customed: true
        });
      }
    });
  },

  onResetScene() {
    const self = this;
    wx.showModal({
      title: "恢复内置",
      content: "这个场景改回原本那几句？",
      confirmText: "恢复",
      confirmColor: "#ff6b4a",
      success(res) {
        if (!res.confirm) {
          return;
        }
        loveNotes.reset(self.data.scene);
        self.refresh();
        wx.showToast({ title: "已恢复", icon: "none" });
      }
    });
  },

  onResetAll() {
    const self = this;
    wx.showModal({
      title: "全部恢复内置",
      content: "三个场景都改回原本的那几句？",
      confirmText: "恢复",
      confirmColor: "#ff6b4a",
      success(res) {
        if (!res.confirm) {
          return;
        }
        loveNotes.reset();
        self.refresh();
        wx.showToast({ title: "已恢复", icon: "none" });
      }
    });
  }
});
