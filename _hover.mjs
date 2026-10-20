// Hover-stutter probe: hovering a song trigger must not change the light
// count or compile new shader programs (either one freezes the frame).
import puppeteer from "puppeteer-core";
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",args:["--autoplay-policy=no-user-gesture-required","--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.goto("http://localhost:5174/",{waitUntil:"load",timeout:90000});
for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));const ok=await p.evaluate(()=>{const x=[...document.querySelectorAll("button")].find(b=>/enter the tavern/i.test(b.textContent||""));if(x){x.click();return true;}return false;});if(ok)break;}
await new Promise(r=>setTimeout(r,7000));
const snap=()=>p.evaluate(()=>{const st=window.__r3f;let lights=0;st.scene.traverse(o=>{if(o.isLight)lights++;});return {programs:st.gl.info.programs.length,lights,calls:st.gl.info.render.calls};});
const screenOf=(x,y,z)=>p.evaluate(([x,y,z])=>{const st=window.__r3f;const v=new st.camera.position.constructor(x,y,z);v.project(st.camera);const r=st.gl.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};},[x,y,z]);
const before=await snap();
const keg=await screenOf(2.9,0.95,-0.5);
await p.mouse.move(keg.x,keg.y);await new Promise(r=>setTimeout(r,1500));
const hoverKeg=await snap();
const bread=await screenOf(-1.65,0.15,1.35);
await p.mouse.move(bread.x,bread.y);await new Promise(r=>setTimeout(r,1500));
const hoverBread=await snap();
await p.mouse.move(640,120);await new Promise(r=>setTimeout(r,1500));
const after=await snap();
await p.evaluate(()=>window.__store.getState().selectSong("yennifer-holepez"));await new Promise(r=>setTimeout(r,2500));
const playing=await snap();
console.log(JSON.stringify({before,hoverKeg,hoverBread,after,playing}));
await b.close();
