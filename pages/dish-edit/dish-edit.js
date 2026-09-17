const menu = require("../../utils/menu.js");
const store = require("../../utils/store.js");
const sync = require("../../utils/sync.js");
const image = require("../../utils/image.js");

const TAG_PALETTE = [
  "招牌",
  "下饭",
  "快手",
  "清淡",
  "甜口",
  "麻辣",
  "追剧",
  "暖胃",
  "低卡",
  "硬菜",
  "夏日",
  "管饱"
];

const EMOJI_PALETTE = [
  "🍅", "🍗", "🥩", "🫑", "🌶️", "🥦",
  "🍲", "🌽", "🥣", "🍚", "🍜", "🥟",
  "🍝", "🍟", "🍠", "🐙", "🥭", "🍧",
  "🍰", "🍋", "🧋", "🍊", "🥘", "🍤",
  "🧀", "🥞", "🍕", "🍢", "🍳", "🍽"
];

const SPICY_OPTIONS = ["不辣", "微辣", "中辣", "特辣"];
const LEVEL_OPTIONS = ["简单", "中等", "有点挑战"];

Page({
  data: {
    id: "",
    isEdit: false,
    source: "custom",
    categories: menu.CATEGORIES.filter(function (item) {
      return item.id !== "all";
    }),
    tagPalette: TAG_PALETTE,
    emojiPalette: EMOJI_PALETTE,
    spicyOptions: SPICY_OPTIONS,
    levelOptions: LEVEL_OPTIONS,
    tagOptions: [],
    cloudReady: image.cloudReady(),
    form: {
      image: "",
      emoji: "🍽",
      name: "",
      category: "hot",
      desc: "",
      tags: [],
      spicy: 0,
      minutes: "15",
      level: 1,
      ingredientsText: "",
      stepsText: ""
    }
  },

  onLoad(options) {
    const id = options.id || "";
    if (!id) {
      wx.setNavigationBarTitle({ title: "新增菜品" });
      this.originImage = "";
      this.syncTagOptions([]);
      return;
    }
    const dish = menu.getDish(id);
    if (!dish) {
      wx.showToast({ title: "找不到这道菜", icon: "none" });
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.setNavigationBarTitle({ title: "编辑 · " + dish.name });
    this.setData({
      id: id,
      isEdit: true,
      source: dish.source,
      form: {
        image: dish.image || "",
        emoji: dish.emoji,
        name: dish.name,
        category: dish.category,
        desc: dish.desc,
        tags: dish.tags.slice(),
        spicy: dish.spicy,
        minutes: "" + dish.minutes,
        level: dish.level,
        ingredientsText: dish.ingredients.join("\n"),
        stepsText: dish.steps.join("\n")
      }
    });
    this.originImage = dish.image || "";
    this.syncTagOptions(dish.tags);
  },

  syncTagOptions(selected) {
    this.setData({
      tagOptions: TAG_PALETTE.map(function (name) {
        return { name: name, on: selected.indexOf(name) >= 0 };
      })
    });
  },

  onEmojiInput(e) {
    this.setData({ "form.emoji": e.detail.value });
  },

  onPickEmoji(e) {
    this.setData({ "form.emoji": e.currentTarget.dataset.emoji });
  },

  onName(e) {
    this.setData({ "form.name": e.detail.value });
  },

  onDesc(e) {
    this.setData({ "form.desc": e.detail.value });
  },

  onCategory(e) {
    this.setData({ "form.category": e.currentTarget.dataset.id });
  },

  onTag(e) {
    const name = e.currentTarget.dataset.name;
    const tags = this.data.form.tags.slice();
    const index = tags.indexOf(name);
    if (index >= 0) {
      tags.splice(index, 1);
    } else {
      tags.push(name);
    }
    this.setData({ "form.tags": tags });
    this.syncTagOptions(tags);
  },

  onSpicy(e) {
    this.setData({ "form.spicy": Number(e.currentTarget.dataset.index) });
  },

  onLevel(e) {
    this.setData({ "form.level": Number(e.currentTarget.dataset.index) + 1 });
  },

  onMinutes(e) {
    this.setData({ "form.minutes": e.detail.value });
  },

  onIngredients(e) {
    this.setData({ "form.ingredientsText": e.detail.value });
  },

  onSteps(e) {
    this.setData({ "form.stepsText": e.detail.value });
  },

  onPickImage() {
    const self = this;
    image
      .choose()
      .then(function (tempPath) {
        wx.showLoading({ title: "处理照片中", mask: true });
        return image.persist(tempPath);
      })
      .then(function (saved) {
        wx.hideLoading();
        self.replaceImage(saved);
      })
      .catch(function (err) {
        wx.hideLoading();
        if (err && err.code === "CANCELLED") {
          return;
        }
        wx.showToast({ title: "照片没保存上，再试一次", icon: "none" });
      });
  },

  // 换图：新图已经落地了，再把这次选过、但没保存进菜品的那张清掉
  replaceImage(next) {
    const current = this.data.form.image;
    this.setData({ "form.image": next });
    if (current && current !== this.originImage) {
      image.remove(current);
    }
  },

  onRemoveImage() {
    const current = this.data.form.image;
    this.setData({ "form.image": "" });
    if (current && current !== this.originImage) {
      image.remove(current);
    }
  },

  // 保存成功后，旧图已经没人引用了，删掉（打包进包里的默认图不动）
  cleanupReplacedImage() {
    const origin = this.originImage || "";
    const current = this.data.form.image || "";
    if (origin && origin !== current && !image.isBundled(origin)) {
      image.remove(origin);
    }
  },

  onSave() {
    const form = this.data.form;
    const name = form.name.trim();
    if (!name) {
      wx.showToast({ title: "先给这道菜起个名字", icon: "none" });
      return;
    }
    menu.saveDish({
      id: this.data.id,
      image: form.image,
      emoji: form.emoji.trim() || "🍽",
      name: name,
      category: form.category,
      desc: form.desc.trim(),
      tags: form.tags,
      spicy: form.spicy,
      minutes: Number(form.minutes) || 10,
      level: form.level,
      ingredients: form.ingredientsText,
      steps: form.stepsText
    });
    this.cleanupReplacedImage();
    sync.pushMenu();
    wx.showToast({ title: this.data.isEdit ? "已保存" : "已加进菜单", icon: "none" });
    wx.navigateBack({ delta: 1 });
  },

  onDelete() {
    const self = this;
    const dish = menu.getDish(this.data.id);
    if (!dish) {
      return;
    }
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
        if (dish.image && !image.isBundled(dish.image)) {
          image.remove(dish.image);
        }
        menu.deleteDish(self.data.id);
        store.dropDishEverywhere(self.data.id);
        sync.pushMenu();
        wx.showToast({ title: "已删除", icon: "none" });
        wx.navigateBack({ delta: 1 });
      }
    });
  }
});
