import puppeteer from "puppeteer-core";
const OUT=process.argv[2];
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",args:["--autoplay-policy=no-user-gesture-required","--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
p.on("pageerror",e=>console.log("[pageerror]",e.message));
p.on("console",m=>{const t=m.text(); if(/error|Error|warn/.test(t)&&!/deprecated/.test(t))console.log("[c]",t.slice(0,300));});
const t0=Date.now();
await p.goto("http://localhost:5174/"+(process.argv[3]||""),{waitUntil:"load",timeout:90000});
console.log("loaded in",Date.now()-t0);
for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));const ok=await p.evaluate(()=>{const x=[...document.querySelectorAll("button")].find(b=>/enter the tavern/i.test(b.textContent||""));if(x){x.click();return true;}return false;});if(ok){console.log("clicked at",i);break;}}
await new Promise(r=>setTimeout(r,9000));
if(process.env.SCROLL){await p.evaluate(()=>{const h=[...document.querySelectorAll("h2,h3")].find(e=>/upcoming shows|shows/i.test(e.textContent||""));(h||document.body).scrollIntoView({block:"start"});});await new Promise(r=>setTimeout(r,1500));}
await p.screenshot({path:OUT});console.log("saved",OUT);await b.close();
