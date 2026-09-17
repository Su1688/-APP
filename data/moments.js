/**
 * 纪念日菜单
 *
 * 那天打开小程序，首页顶上会多一张卡片；点进去是只放那几道菜的专属菜单。
 * 没有写日期的日子，一切照旧，不会多出任何东西。
 *
 * 怎么写：
 *   date       "12-24"       每年重复（MM-DD）
 *              "2026-12-24"  只出现这一次（YYYY-MM-DD）
 *   title      卡片上的名头，比如「我们在一起的第 100 天」
 *   message    那天想让她看到的那句话；写成数组就是好几段
 *   dishIds    想放哪几道菜，留空数组 = 直接用全部菜单
 *   cover      可选，放张图（图片丢进 assets/moments/，这里写 "/assets/moments/xxx.jpg"）
 *
 * 同一天撞上两个纪念日时，只显示日期写得最精确的那一条。
 */

// 改成 true：不管今天几号，都强制显示第一条 —— 想先看看长什么样就用它
const PREVIEW = false;

const MOMENTS = [
  {
    id: "0609",
    date: "06-09",
    repeatYearly: true,
    title: "今天，是我们的日子",
    message: [
      "别人用礼物记日子，我们用饭记 —— 今天这桌，从第一次给你做饭那天攒到现在。",
      "菜单短一点，只放我会做的、你爱吃的。"
    ],
    // 想只放几道菜就写菜名对应的 id，留空 = 全部菜单；后面想加就把 id 填进来
    dishIds: [],
    cover: ""
  }
];

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

// 按本机本地时间算，不碰 UTC，免得半夜跨天判错
function todayKey(time) {
  const d = time ? new Date(time) : new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function hit(moment, today) {
  const date = moment && moment.date ? String(moment.date).trim() : "";
  if (!date) {
    return false;
  }
  if (date.length >= 10) {
    return date.slice(0, 10) === today;
  }
  const repeat = moment.repeatYearly !== false;
  return repeat && date === today.slice(5);
}

function find(id) {
  for (let i = 0; i < MOMENTS.length; i++) {
    if (MOMENTS[i].id === id) {
      return MOMENTS[i];
    }
  }
  return null;
}

// message 写成一句话或好几段都行，统一成数组
function lines(moment) {
  const value = moment && moment.message;
  if (Array.isArray(value)) {
    return value.filter(function (line) {
      return !!line;
    });
  }
  return value ? [value] : [];
}

function matchToday(time) {
  if (MOMENTS.length === 0) {
    return null;
  }
  if (PREVIEW) {
    return MOMENTS[0];
  }
  const today = todayKey(time);
  const hits = MOMENTS.filter(function (moment) {
    return hit(moment, today);
  });
  if (hits.length === 0) {
    return null;
  }
  // YYYY-MM-DD 比 MM-DD 精确，同一天撞车时优先它
  return hits.sort(function (a, b) {
    return String(b.date).length - String(a.date).length;
  })[0];
}

module.exports = {
  PREVIEW: PREVIEW,
  MOMENTS: MOMENTS,
  todayKey: todayKey,
  find: find,
  lines: lines,
  matchToday: matchToday
};
