import puppeteer from "puppeteer-core";
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",args:["--autoplay-policy=no-user-gesture-required","--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.goto("http://localhost:5174/",{waitUntil:"load",timeout:90000});
for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1000));const ok=await p.evaluate(()=>{const x=[...document.querySelectorAll("button")].find(b=>/enter the tavern/i.test(b.textContent||""));if(x){x.click();return true;}return false;});if(ok)break;}
await new Promise(r=>setTimeout(r,6000));
const info=await p.evaluate(()=>{
  const st=window.__r3f; const gl=st.gl; const scene=st.scene;
  let meshes=0, casters=0, lights=0, shadowLights=0, mats=new Set(), geos=new Set();
  scene.traverse(o=>{ if(o.isMesh){meshes++; if(o.castShadow)casters++; mats.add(o.material); geos.add(o.geometry);} if(o.isLight){lights++; if(o.castShadow)shadowLights++;} });
  const r=gl.info.render, m=gl.info.memory;
  return {calls:r.calls, triangles:r.triangles, meshes, casters, lights, shadowLights, materials:mats.size, geometries:geos.size, texturesInMem:m.textures, programs:gl.info.programs.length, dpr:st.viewport.dpr};
});
console.log(JSON.stringify(info));
await b.close();
