import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const EDGE = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9414;
const PAGE = pathToFileURL(join(process.cwd(), "preview", "index.html")).href;
const PROFILE = mkdtempSync(join(tmpdir(), "edge-cdp-"));

const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT, "--user-data-dir=" + PROFILE, "about:blank"
], { stdio: "ignore" });

let target = null;
for (let i = 0; i < 80 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
    target = list.filter(t => t.type === "page")[0] || null;
  } catch (e) { /* CDP 还没起来 */ }
}
if (!target) { edge.kill(); throw new Error("Edge CDP 未就绪"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", () => rej(new Error("WebSocket 连接失败")));
});

let msgId = 0;
const waiting = new Map();
const pageErrors = [];
ws.addEventListener("message", ev => {
  const msg = JSON.parse(ev.data);
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    pageErrors.push((d.exception && d.exception.description) || d.text);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    pageErrors.push("[console.error] " + msg.params.args.map(a => a.value || a.description || "").join(" "));
  } else if (msg.id && waiting.has(msg.id)) {
    const w = waiting.get(msg.id);
    waiting.delete(msg.id);
    if (msg.error) w.reject(new Error(JSON.stringify(msg.error)));
    else w.resolve(msg.result);
  }
});
const send = (method, params) => new Promise((resolve, reject) => {
  const id = ++msgId;
  waiting.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
});

await send("Runtime.enable");
await send("Page.enable");

async function goto(query) {
  await send("Page.navigate", { url: PAGE + query });
  const want = "complete|" + query;
  for (let i = 0; i < 120; i++) {
    await sleep(80);
    const r = await send("Runtime.evaluate", { expression: "document.readyState + '|' + location.search", returnByValue: true });
    if (r.result && r.result.value === want) { await sleep(80); return; }
  }
  throw new Error("goto 超时: " + query);
}

const PRELUDE = [
  "const $ = id => document.getElementById(id);",
  "const qa = sel => Array.from(document.querySelectorAll(sel));",
  "const click = sel => { const el = document.querySelector(sel); if (!el) throw new Error('找不到元素 ' + sel); el.click(); return true; };",
  "const names = () => qa('#screen .dish__name').map(e => e.textContent);",
  "const badge = () => $('cartBadge').textContent;",
  "const status = () => document.querySelector('#screen .detail-hero__status').textContent;",
  "const addDish = id => document.querySelector('#screen [data-plus=\"' + id + '\"]').click();"
].join("\n");

async function ev(body) {
  const r = await send("Runtime.evaluate", {
    expression: "(() => {" + PRELUDE + "\n" + body + "})()",
    returnByValue: true,
    awaitPromise: true
  });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error("页面异常: " + ((d.exception && d.exception.description) || d.text));
  }
  return r.result.value;
}

let pass = 0;
const fails = [];
async function test(name, fn) {
  try {
    const info = await fn();
    pass++;
    console.log("  PASS  " + name + (info ? "\n        " + JSON.stringify(info) : ""));
  } catch (e) {
    fails.push(name + " :: " + e.message);
    console.log("  FAIL  " + name + "\n        " + e.message);
  }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }

console.log("\n=== 点菜页预览版 · 交互测试 ===");

await goto("");
await test("01 首页渲染：菜品卡 / 分类胶囊 / 4 个 tab / 问候卡", async () => {
  const r = await ev([
    "return { dishes: qa('#screen .dish').length, cats: qa('#screen .cat').length,",
    "  tabs: qa('#tabbar .tab').length, hero: !!document.querySelector('#screen .hero__title'),",
    "  cartHidden: !$('cartbar').classList.contains('cartbar--on') };"
  ].join("\n"));
  ok(r.dishes > 0, "没有渲染出菜品卡");
  ok(r.cats >= 6, "分类胶囊数量不足: " + r.cats);
  ok(r.tabs === 4, "tab 数量应为 4，实际 " + r.tabs);
  ok(r.hero, "缺少问候卡");
  ok(r.cartHidden, "购物车条初始不该显示");
  return r;
});

await test("02 切换分类：列表变化 + 高亮跟随", async () => {
  const r = await ev([
    "const before = names();",
    "const label = qa('#screen .cat')[2].textContent;",
    "qa('#screen .cat')[2].click();",
    "const after = names();",
    "return { label, on: document.querySelector('#screen .cat--on').textContent,",
    "  before: before.length, after: after.length, changed: before.join() !== after.join() };"
  ].join("\n"));
  ok(r.changed, "切换分类后列表没变化");
  ok(r.after > 0, "该分类下没有菜");
  ok(r.label === r.on, "高亮没跟随点击的分类: " + r.on);
  return r;
});

await test("03 搜索「番茄」：结果全部命中 + 隐藏招牌区", async () => {
  const r = await ev([
    "const input = $('searchInput');",
    "input.value = '番茄';",
    "input.dispatchEvent(new Event('input', { bubbles: true }));",
    "const texts = qa('#screen .dish').map(d => d.innerText.replace(/\\n/g, ' '));",
    "return { n: texts.length, allHit: texts.every(t => t.indexOf('番茄') >= 0),",
    "  titles: qa('#screen .section-title').map(e => e.textContent), hasClear: !!$('clearSearch') };"
  ].join("\n"));
  ok(r.n > 0, "搜索「番茄」没有结果");
  ok(r.allHit, "有结果不含「番茄」");
  ok(r.titles.indexOf("本店招牌") < 0, "搜索时不该显示本店招牌");
  ok(r.hasClear, "没有出现清空搜索按钮");
  return r;
});

await test("04 无结果空态 + 清空搜索恢复列表", async () => {
  const r = await ev([
    "const input = $('searchInput');",
    "input.value = 'zzzz';",
    "input.dispatchEvent(new Event('input', { bubbles: true }));",
    "const empty = !!document.querySelector('#screen .empty__text');",
    "$('clearSearch').click();",
    "return { empty, restored: names().length, keywordGone: !$('searchInput').value };"
  ].join("\n"));
  ok(r.empty, "无结果时没显示空态");
  ok(r.restored > 0, "清空后没恢复列表");
  ok(r.keywordGone, "清空后搜索框里还有字");
  return r;
});

await test("05 加减菜：1→2→1→0，购物车条同步显隐", async () => {
  await goto("");
  const r = await ev([
    "const id = qa('#screen [data-plus]')[0].dataset.plus;",
    "const m = () => document.querySelector('#screen [data-minus=\"' + id + '\"]').click();",
    "addDish(id);",
    "const b1 = badge(), on1 = $('cartbar').classList.contains('cartbar--on'), t1 = $('cartTitle').textContent;",
    "addDish(id); const b2 = badge();",
    "m(); const b3 = badge();",
    "m();",
    "return { dish: id, b1, b2, b3, b4: badge(), on1, t1, on4: $('cartbar').classList.contains('cartbar--on') };"
  ].join("\n"));
  ok(r.b1 === "1", "第一次加菜后角标应为 1，实际 " + r.b1);
  ok(r.b2 === "2", "第二次加菜后角标应为 2，实际 " + r.b2);
  ok(r.b3 === "1", "减 1 份后角标应为 1，实际 " + r.b3);
  ok(r.b4 === "0", "再减 1 份后角标应为 0，实际 " + r.b4);
  ok(r.on1 === true, "有菜时购物车条没出现");
  ok(r.on4 === false, "空车时购物车条没隐藏");
  return r;
});

await test("06 下单：开面板 → 换时间 → 写备注 → 告诉大厨", async () => {
  const r = await ev([
    "const ids = Array.from(new Set(qa('#screen [data-plus]').map(b => b.dataset.plus))).slice(0, 2);",
    "addDish(ids[0]); addDish(ids[1]);",
    "const cartBefore = badge();",
    "$('cartbar').click();",
    "const sheetOn = $('sheet').classList.contains('sheet--on');",
    "const maskOn = $('mask').classList.contains('mask--on');",
    "const sheetItems = qa('#sheet .sitem').length;",
    "const timeBefore = $('pickTime').textContent;",
    "$('pickTime').click();",
    "const timeAfter = $('pickTime').textContent;",
    "const ta = $('remarkInput');",
    "ta.value = '少放辣，多留点汤';",
    "ta.dispatchEvent(new Event('input', { bubbles: true }));",
    "const foot = document.querySelector('#sheet .sheet__total').textContent;",
    "$('submitOrder').click();",
    "return { ids, cartBefore, sheetOn, maskOn, sheetItems, timeBefore, timeAfter, foot,",
    "  afterNav: $('navbar').textContent,",
    "  afterTab: document.querySelector('#tabbar .tab--on').textContent,",
    "  sheetClosed: !$('sheet').classList.contains('sheet--on'),",
    "  cartAfter: badge(), detail: !!document.querySelector('#screen .detail-hero') };"
  ].join("\n"));
  ok(r.cartBefore === "2", "下单前应有 2 份，实际 " + r.cartBefore);
  ok(r.sheetOn && r.maskOn, "购物车面板没打开");
  ok(r.sheetItems === 2, "面板里的菜数应为 2，实际 " + r.sheetItems);
  ok(r.timeBefore !== r.timeAfter, "期望时间没切换: " + r.timeBefore);
  ok(r.afterNav === "订单详情", "下单后没跳详情，navbar=" + r.afterNav);
  ok(r.afterTab.indexOf("订单") >= 0, "tab 没切到订单");
  ok(r.sheetClosed, "下单后面板没关闭");
  ok(r.cartAfter === "0", "下单后购物车没清空");
  ok(r.detail, "详情页没渲染出来");
  return r;
});

await test("07 详情页内容：状态 / 菜名 / 份数 / 备注 / 进度", async () => {
  const r = await ev([
    "return { status: status(),",
    "  names: qa('#screen .item__name').map(e => e.textContent),",
    "  counts: qa('#screen .item__count').map(e => e.textContent),",
    "  total: document.querySelector('#screen .item__total').textContent,",
    "  info: qa('#screen .info-row').map(e => e.innerText.replace(/\\n/g, '=')),",
    "  steps: qa('#screen .tl__text').map(e => e.textContent),",
    "  urgeBtn: !!document.querySelector('#screen [data-urge]'),",
    "  cancelBtn: !!document.querySelector('#screen [data-cancel]') };"
  ].join("\n"));
  ok(r.status === "待接单", "新订单状态应为待接单，实际 " + r.status);
  ok(r.names.length === 3, "应列出 2 道菜 + 合计行，实际 " + r.names.length);
  ok(r.counts.length === 2, "份数列应有 2 项，实际 " + r.counts.length);
  ok(r.info.join("|").indexOf("少放辣，多留点汤") >= 0, "备注丢失: " + r.info.join("|"));
  ok(r.info.join("|").indexOf("30 分钟后") >= 0, "期望时间丢失: " + r.info.join("|"));
  ok(r.steps.length === 1, "新订单进度应只有 1 条，实际 " + r.steps.length);
  ok(r.urgeBtn && r.cancelBtn, "待接单时应有「催一催」和「取消点菜」");
  return r;
});

await test("08 小可爱取消点菜 → 状态变已取消且按钮消失", async () => {
  const r = await ev([
    "click('#screen [data-cancel]');",
    "return { status: status(),",
    "  cancelGone: !document.querySelector('#screen [data-cancel]'),",
    "  urgeGone: !document.querySelector('#screen [data-urge]'),",
    "  steps: qa('#screen .tl__text').map(e => e.textContent) };"
  ].join("\n"));
  ok(r.status === "已取消", "取消后状态应为已取消，实际 " + r.status);
  ok(r.cancelGone && r.urgeGone, "已取消的订单不该还有操作按钮");
  ok(r.steps.length === 2, "进度应有 2 条，实际 " + r.steps.length);
  return r;
});

await test("09 再下一单 + 大厨开关：订单页出现「接单开做」", async () => {
  await goto("");
  const r = await ev([
    "const id = qa('#screen [data-plus]')[0].dataset.plus;",
    "addDish(id);",
    "$('cartbar').click();",
    "$('submitOrder').click();",
    "const newStatus = status();",
    "click('#tabbar [data-tab=\"my\"]');",
    "const roleBefore = document.querySelector('#screen .profile__tag').textContent;",
    "click('#screen [data-toggle-chef]');",
    "const roleAfter = document.querySelector('#screen .profile__tag').textContent;",
    "click('#tabbar [data-tab=\"orders\"]');",
    "const btn = document.querySelector('#screen [data-advance]');",
    "return { newStatus, roleBefore, roleAfter, hasAdvance: !!btn, label: btn ? btn.textContent : '',",
    "  chefPrompt: document.querySelector('#screen .order__btn') ? 'yes' : 'no' };"
  ].join("\n"));
  ok(r.newStatus === "待接单", "新订单应为待接单，实际 " + r.newStatus);
  ok(r.roleBefore.indexOf("小可爱") >= 0, "初始身份不对: " + r.roleBefore);
  ok(r.roleAfter.indexOf("大厨") >= 0, "切换后身份不对: " + r.roleAfter);
  ok(r.hasAdvance && r.label === "接单开做", "订单页没出现「接单开做」，实际 " + r.label);
  return r;
});

await test("10 大厨流程：接单开做 → 制作中 → 做好啦 → 已完成 + 时间线", async () => {
  const r = await ev([
    "const seen = [];",
    "click('#screen [data-advance]');",
    "seen.push(document.querySelector('#screen .badge').textContent);",
    "const label2 = document.querySelector('#screen [data-advance]').textContent;",
    "click('#screen [data-advance]');",
    "seen.push(document.querySelector('#screen .badge').textContent);",
    "const btnGone = !document.querySelector('#screen [data-advance]');",
    "click('#screen [data-order]');",
    "return { seen, label2, btnGone, steps: qa('#screen .tl__text').map(e => e.textContent),",
    "  detailStatus: status() };"
  ].join("\n"));
  ok(r.label2 === "做好啦", "制作中时按钮应为「做好啦」，实际 " + r.label2);
  ok(r.seen[0] === "制作中", "接单后应为制作中，实际 " + r.seen[0]);
  ok(r.seen[1] === "已完成", "做好后应为已完成，实际 " + r.seen[1]);
  ok(r.btnGone, "已完成订单不该再显示操作按钮");
  ok(r.detailStatus === "已完成", "详情页状态不对: " + r.detailStatus);
  ok(r.steps.length === 3, "进度应有 3 条（提交/接单/做好），实际 " + r.steps.length);
  return r;
});

await test("11 催一催：次数累加 + 文案更新（制作中的订单）", async () => {
  await goto("?demo=1");
  const r = await ev([
    "click('#tabbar [data-tab=\"orders\"]');",
    "click('#screen [data-order]');",
    "const before = document.querySelector('#screen .pref-hint').textContent;",
    "click('#screen [data-urge]');",
    "const t1 = document.querySelector('#screen .pref-hint').textContent;",
    "click('#screen [data-urge]');",
    "const t2 = document.querySelector('#screen .pref-hint').textContent;",
    "return { nav: $('navbar').textContent, before, t1, t2,",
    "  canCancel: !!document.querySelector('#screen [data-cancel]'), s: status() };"
  ].join("\n"));
  ok(r.nav === "订单详情", "没进入详情页: " + r.nav);
  ok(r.s === "制作中", "示例订单应为制作中，实际 " + r.s);
  ok(r.before.indexOf("1 次") >= 0, "初始催单次数不对: " + r.before);
  ok(r.t1.indexOf("2 次") >= 0, "催 1 次后应为 2 次，实际 " + r.t1);
  ok(r.t2.indexOf("3 次") >= 0, "催 2 次后应为 3 次，实际 " + r.t2);
  ok(r.canCancel === false, "制作中的订单不该出现取消按钮");
  return r;
});

await test("12 收藏：预置 1 道 → 点新卡片变 2 道 → 再点收回 → 清空见空态", async () => {
  await goto("");
  const r = await ev([
    "click('#tabbar [data-tab=\"favorites\"]');",
    "const seedCount = names().length;",
    "click('#tabbar [data-tab=\"menu\"]');",
    "const seedId = 'fanqie-chaodan', seedName = dishById(seedId).name;",
    "const target = qa('#screen [data-dish]').map(e => e.dataset.dish).filter(id => id !== seedId)[0];",
    "const targetName = dishById(target).name;",
    "document.querySelector('#screen [data-dish=\"' + target + '\"]').click();",
    "click('#tabbar [data-tab=\"favorites\"]');",
    "const afterAdd = names();",
    "document.querySelector('#screen [data-dish=\"' + target + '\"]').click();",
    "const afterRemove = names();",
    "click('#tabbar [data-tab=\"menu\"]');",
    "document.querySelector('#screen [data-dish=\"' + seedId + '\"]').click();",
    "click('#tabbar [data-tab=\"favorites\"]');",
    "return { seedName, targetName, seedCount, afterAdd, afterRemove, afterEmpty: names(),",
    "  emptyShown: !!document.querySelector('#screen .empty__text') };"
  ].join("\n"));
  ok(r.seedCount === 1, "预置收藏应为 1 道，实际 " + r.seedCount);
  ok(r.afterAdd.length === 2, "收藏后应有 2 道，实际 " + r.afterAdd.length);
  ok(r.afterAdd.indexOf(r.targetName) >= 0, "新收藏的菜没出现在收藏页: " + r.targetName);
  ok(r.afterRemove.length === 1, "取消后应剩 1 道，实际 " + r.afterRemove.length);
  ok(r.afterRemove.indexOf(r.targetName) < 0, "取消的菜还在收藏页");
  ok(r.afterEmpty.length === 0 && r.emptyShown, "收藏清空后没显示空态");
  return r;
});

await test("13 我的页口味：辣度 / 不吃 选择同步到点菜页提示条", async () => {
  await goto("");
  const r = await ev([
    "const before = document.querySelector('#screen .pref-hint').textContent;",
    "click('#tabbar [data-tab=\"my\"]');",
    "click('#screen [data-spicy=\"3\"]');",
    "click('#screen [data-dislike=\"姜\"]');",
    "const spicyOn = document.querySelector('#screen [data-spicy=\"3\"]').className;",
    "click('#tabbar [data-tab=\"menu\"]');",
    "return { before, after: document.querySelector('#screen .pref-hint').textContent, spicyOn };"
  ].join("\n"));
  ok(r.before.indexOf("微辣") >= 0 && r.before.indexOf("香菜") >= 0, "初始口味提示不对: " + r.before);
  ok(r.after.indexOf("特辣") >= 0, "辣度没同步到点菜页: " + r.after);
  ok(r.after.indexOf("姜") >= 0, "忌口没同步到点菜页: " + r.after);
  ok(r.spicyOn.indexOf("pchip--on") >= 0, "辣度胶囊没高亮: " + r.spicyOn);
  return r;
});

await test("14 照这个再来一单：回到点菜页且购物车有菜", async () => {
  await goto("?demo=1&order=1");
  const r = await ev([
    "const items = qa('#screen .item__name').length;",
    "click('#screen [data-reorder]');",
    "return { items, tab: document.querySelector('#tabbar .tab--on').textContent, cart: badge(),",
    "  cartOn: $('cartbar').classList.contains('cartbar--on'), nav: $('navbar').textContent };"
  ].join("\n"));
  ok(r.items === 4, "示例订单应有 3 道菜 + 合计行，实际 " + r.items);
  ok(r.tab.indexOf("点菜") >= 0, "没回到点菜页: " + r.tab);
  ok(Number(r.cart) === 4, "示例订单 4 份应全部回到购物车，实际 " + r.cart);
  ok(r.cartOn, "购物车条没出现");
  ok(r.nav === "今天想吃什么", "导航标题没复位: " + r.nav);
  return r;
});

await test("15 返回订单按钮 + tab 切换不残留详情态", async () => {
  await goto("");
  const r = await ev([
    "click('#tabbar [data-tab=\"orders\"]');",
    "const listNav = $('navbar').textContent;",
    "click('#tabbar [data-tab=\"menu\"]');",
    "click('#tabbar [data-tab=\"orders\"]');",
    "return { listNav, backNav: $('navbar').textContent, hasBack: !!$('backToList') };"
  ].join("\n"));
  ok(r.listNav === "点菜记录", "订单页标题不对: " + r.listNav);
  ok(r.hasBack === false, "列表页不该出现返回按钮");
  ok(r.backNav === "点菜记录", "回到订单页标题不对: " + r.backNav);
  return r;
});

await test("16 全程无 JS 报错 / console.error", async () => {
  ok(pageErrors.length === 0, "捕获到 " + pageErrors.length + " 条: " + pageErrors.slice(0, 3).join(" | "));
  return { errors: 0 };
});

ws.close();
edge.kill();
try { rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}

console.log("\n=== 结果: " + pass + " 通过 / " + fails.length + " 失败 ===");
if (fails.length) { fails.forEach(f => console.log("  - " + f)); process.exit(1); }