// Waits for the scene to actually mount (polls), lets the camera settle,
// then reports the live camera and where the band lands on screen.
import puppeteer from "puppeteer-core";
const W=+(process.argv[2]||390), H=+(process.argv[3]||844), OUT=process.argv[4];
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",args:["--autoplay-policy=no-user-gesture-required","--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
const p=await b.newPage();await p.setViewport({width:W,height:H,deviceScaleFactor:2,isMobile:W<768,hasTouch:W<768});
await p.goto("http://localhost:5174/",{waitUntil:"load",timeout:90000});
for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));const ok=await p.evaluate(()=>{const x=[...document.querySelectorAll("button")].find(b=>/enter the tavern/i.test(b.textContent||""));if(x){x.click();return true;}return false;});if(ok)break;}
let t0=Date.now(), n=0;
while(Date.now()-t0<45000){await new Promise(r=>setTimeout(r,500));n=await p.evaluate(()=>{let n=0;window.__r3f?.scene?.traverse(()=>n++);return n;});if(n>200)break;}
console.log("scene objects",n,"after",Date.now()-t0,"ms");
await new Promise(r=>setTimeout(r,9000));
const info=await p.evaluate(()=>{const st=window.__r3f;const c=st.camera;const V=c.position.constructor;
 const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(c);return [+v.x.toFixed(2),+v.y.toFixed(2)];};
 let lights=0;st.scene.traverse(o=>{if(o.isLight)lights++;});
 return {size:[st.size.width,st.size.height],fov:c.fov,aspect:+c.aspect.toFixed(3),pos:c.position.toArray().map(n=>+n.toFixed(2)),
  bread:proj(-1.65,0.2,1.35),jhole:proj(-2.2,1.0,0.6),freddie:proj(2.2,1.0,0.6),chandelier:proj(0,3.25,0.9),touchAction:st.gl.domElement.style.touchAction,
  lights,calls:st.gl.info.render.calls,programs:st.gl.info.programs.length,shadows:st.gl.shadowMap.enabled,dpr:st.viewport.dpr};});
console.log(JSON.stringify(info));
if(OUT){await p.screenshot({path:OUT});console.log("saved",OUT);}
await b.close();
