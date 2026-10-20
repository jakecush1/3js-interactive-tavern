import puppeteer from "puppeteer-core";
const OUT=process.argv[2]; const mode=process.argv[3]||"scene"; const W=+(process.argv[4]||390), H=+(process.argv[5]||844);
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",args:["--autoplay-policy=no-user-gesture-required","--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
const p=await b.newPage();
await p.setViewport({width:W,height:H,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
p.on("pageerror",e=>console.log("[pageerror]",e.message.slice(0,300)));
await p.goto("http://localhost:5174/"+(process.argv[6]||""),{waitUntil:"load",timeout:90000});
if(mode!=="start"){for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));const ok=await p.evaluate(()=>{const x=[...document.querySelectorAll("button")].find(b=>/enter the tavern/i.test(b.textContent||""));if(x){x.click();return true;}return false;});if(ok)break;}
await new Promise(r=>setTimeout(r,+(process.env.WAIT||8000)));}
else{await new Promise(r=>setTimeout(r,3500));}
if(mode==="member"){await p.evaluate(()=>{window.__store?.getState?.().focusMember?.("elowen");});await new Promise(r=>setTimeout(r,3000));}
if(mode==="menu"){await p.evaluate(()=>{const b=document.querySelector('button[aria-label="Open menu"]');b&&b.click();});await new Promise(r=>setTimeout(r,1200));}
if(mode==="footer"){await p.evaluate(()=>{const h=[...document.querySelectorAll("h2,h3")].find(e=>/the band/i.test(e.textContent||""));(h||document.body).scrollIntoView({block:"start"});});await new Promise(r=>setTimeout(r,1500));}
if(mode==="shows"){await p.evaluate(()=>{const h=[...document.querySelectorAll("h2,h3")].find(e=>/shows/i.test(e.textContent||""));(h||document.body).scrollIntoView({block:"start"});});await new Promise(r=>setTimeout(r,1500));}
await p.screenshot({path:OUT});console.log("saved",OUT);await b.close();
