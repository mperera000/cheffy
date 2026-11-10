// Renders intro.html frame by frame in headless Chrome (DevTools protocol, no
// extra packages). Usage: node render.mjs <framesDir> "<query string>"
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const [, , outDir, query = ""] = process.argv;
if (!outDir) {
  console.error("Usage: node render.mjs <framesDir> \"ls=0.5&ld=0.43&ms=1.02&md=0.25\"");
  process.exit(1);
}
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FPS = 30;
const FRAMES = 60; // 2 seconds
const port = 9400 + Math.floor(Math.random() * 400);
const profile = `${outDir}-chrome-profile`;

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--hide-scrollbars", "--window-size=1920,1080", "--force-device-scale-factor=1",
  "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pageSocket() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

try {
  const ws = new WebSocket(await pageSocket());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nextId = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { res, rej } = pending.get(d.id);
      pending.delete(d.id);
      d.error ? rej(new Error(d.error.message)) : res(d.result);
    } else events.push(d);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++nextId;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: new URL(`./intro.html?${query}`, import.meta.url).href });
  for (let i = 0; i < 150 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(100);
  const fonts = await send("Runtime.evaluate", {
    expression: `document.fonts.ready.then(() => document.fonts.check('italic 500 168px "Playfair Display"') && document.fonts.check('500 34px "Inter"'))`,
    awaitPromise: true, returnByValue: true,
  });
  console.log(`fonts loaded: ${fonts.result.value}`);

  mkdirSync(outDir, { recursive: true });
  for (let f = 0; f < FRAMES; f++) {
    await send("Runtime.evaluate", { expression: `render(${(f / FPS).toFixed(4)})` });
    const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    writeFileSync(`${outDir}/f${String(f).padStart(3, "0")}.png`, Buffer.from(data, "base64"));
  }
  ws.close();
  console.log(`rendered ${FRAMES} frames at ${FPS} fps`);
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
