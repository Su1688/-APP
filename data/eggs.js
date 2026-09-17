/**
 * 彩蛋配置 · 改了这里就改了口令，不用动页面
 *
 * 规则：不提示、不弹「你发现了彩蛋」、不改变任何数据。
 * 她自己摸索出来的才算彩蛋。
 */

// 在搜索框里打中这些词，菜单里会多出一道平时不显示的菜
const SEARCH_EGGS = [
  { words: ["想你", "想你了", "好想你"], dishId: "egg-baobao" },
  { words: ["抱抱", "抱一下", "抱住"], dishId: "egg-baobao" }
];

// 长按首页标题浮出来的那张小卡片
const LONG_PRESS = {
  // 想放合照：把图丢进 assets/moments/，这里写 "/assets/moments/us.jpg"；留空就只显示一封信
  photo: "",
  title: "一直想跟你说",
  text: "你上次说那道菜咸了，其实是我紧张，手抖多放了半勺盐。下次不会了。"
};

// 搜索词命中隐藏菜，返回菜的 id（不重复）
function matchSearch(keyword) {
  const word = (keyword || "").trim();
  if (!word) {
    return [];
  }
  const ids = [];
  SEARCH_EGGS.forEach(function (item) {
    const hit = item.words.some(function (one) {
      return word.indexOf(one) >= 0;
    });
    if (hit && ids.indexOf(item.dishId) < 0) {
      ids.push(item.dishId);
    }
  });
  return ids;
}

module.exports = {
  SEARCH_EGGS: SEARCH_EGGS,
  LONG_PRESS: LONG_PRESS,
  matchSearch: matchSearch
};
