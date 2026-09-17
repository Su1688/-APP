import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const EDGE = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9422;
const PAGE = pathToFileURL(join(process.cwd(), "preview", "index.html")).href;
const OUT = join(process.cwd(), "preview", "shots");
const PROFILE = mkdtempSync(join(tmpdir(), "edge-shot-"));
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const W = Number(process.env.VW || 390);
const H = Number(process.env.VH || 844);
const DSF = Number(process.env.VD || 2);
const SUFFIX = process.env.SUFFIX == null || process.env.SUFFIX === "" ? "-phone" : process.env.SUFFIX;

const SHOTS = [
  { n: "menu",      q: "" },
  { n: "sheet",     q: "?demo=1&sheet=1" },
  { n: "orders",    q: "?demo=1&view=orders" },
  { n: "detail",    q: "?demo=1&order=1" },
  { n: "chef",      q: "?demo=1&chef=1&view=orders" },
  { n: "my",        q: "?view=my" },
  { n: "favorites", q: "?view=favorites" }
];

const edge = spawn(EDGE, ["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",
  "--remote-debugging-port="+PORT, "--user-data-dir="+PROFILE, "about:blank"], { stdio: "ignore" });

let target = null;
for (let i = 0; i < 80 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch("http://127.0.0.1:"+PORT+"/json/list")).json()).filter(t=>t.type==="page")[0] || null; } catch(e){}
}
if (!target) { edge.kill(); throw new Error("Edge CDP 未就绪"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", ()=>rej(new Error("ws fail"))); });
let msgId = 0; const waiting = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); } });
const send = (method, params) => new Promise((resolve, reject) => { const id = ++msgId; waiting.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params: params||{}})); });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DSF, mobile: true, screenWidth: W, screenHeight: H });

async function goto(q) {
  await send("Page.navigate", { url: PAGE + q });
  for (let i = 0; i < 120; i++) {
    await sleep(80);
    const r = await send("Runtime.evaluate", { expression: "document.readyState + '|' + location.search", returnByValue: true });
    if (r.result && r.result.value === "complete|" + q) { await sleep(300); return; }
  }
  throw new Error("goto timeout " + q);
}

console.log("视口 " + W + "x" + H + " @DSF" + DSF + "（设备仿真）");
for (const s of SHOTS) {
  await goto(s.q);
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const p = join(OUT, s.n + SUFFIX + ".png");
  if (existsSync(p)) unlinkSync(p);
  writeFileSync(p, Buffer.from(r.data, "base64"));
  const diag = await send("Runtime.evaluate", { expression: "document.documentElement.scrollWidth", returnByValue: true });
  console.log("  " + s.n.padEnd(10) + " scrollWidth=" + diag.result.value + "  -> preview/shots/" + s.n + SUFFIX + ".png");
}
ws.close(); edge.kill();
try { rmSync(PROFILE, { recursive: true, force: true }); } catch(e){}
