import puppeteer from "puppeteer-core";
const [,, OUT, HASH, WAIT, VIEW] = process.argv;
const [vw, vh] = (VIEW || "1280x800").split("x").map(Number);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--autoplay-policy=no-user-gesture-required", "--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage(); await p.setViewport({ width: vw, height: vh });
p.on("pageerror", e => console.log("[pageerror]", e.message));
p.on("console", m => { const t = m.text(); if (/error|Error/.test(t) && !/deprecated/.test(t)) console.log("[c]", t.slice(0, 300)); });
await p.goto("http://localhost:5174/" + (HASH || ""), { waitUntil: "load", timeout: 90000 });
for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 500)); const ok = await p.evaluate(() => { const x = [...document.querySelectorAll("button")].find(b => /enter the tavern/i.test(b.textContent || "")); if (x) { x.click(); return true; } return false; }); if (ok) break; }
if (process.env.PLAY) { await new Promise(r => setTimeout(r, 6000)); await p.evaluate(() => { const x = [...document.querySelectorAll("button,li")].find(b => /serfs and wenches/i.test(b.textContent || "")); if (x) x.click(); }); console.log("play clicked"); }
const waits = (WAIT || "9").split(",").map(Number);
let elapsed = 0;
for (let i = 0; i < waits.length; i++) {
  await new Promise(r => setTimeout(r, (waits[i] - elapsed) * 1000)); elapsed = waits[i];
  const out = waits.length > 1 ? OUT.replace(/\.png$/, `-${waits[i]}.png`) : OUT;
  await p.screenshot({ path: out }); console.log("saved", out);
}
await b.close();
