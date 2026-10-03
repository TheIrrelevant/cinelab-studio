/**
 * @file check-studio.mjs
 * @description Real WebGL pixel, depth-of-field, exposure, zoom, hydration and persistence regression checks.
 * @depends playwright, vite, camera-feed-fixture.html; running Next dev server on STUDIO_URL or port 3000
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const base=process.env.STUDIO_URL ?? 'http://localhost:3000';
const output='screenshots/studio-verification';
await mkdir(output,{recursive:true});
const vite=await createServer({configFile:false,server:{host:'127.0.0.1',port:3101,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL ?? 'chrome'});
const results=[];
const pass=(name,details)=>{results.push({name,...details});console.log('PASS',name,details ?? '')};
const mean=(pixels)=>{let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i];return sum/(pixels.length/4)};
const difference=(a,b)=>a.reduce((sum,x,i)=>sum+Math.abs(x-b[i]),0)/a.length;
const sharpness=(p,left)=>{
  let sum=0,count=0;
  for(let y=90;y<180;y++)for(let x=left;x<left+90;x++){
    const i=(y*480+x)*4;sum+=Math.abs(p[i]-p[i+4])+Math.abs(p[i]-p[i+480*4]);count+=2;
  }
  return sum/count;
};
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:3101/scripts/camera-feed-fixture.html');
  await page.waitForFunction(()=>typeof window.capture==='function');
  const capture=(o)=>page.evaluate(o=>window.capture(o),o);
  const near=await capture({focusDistance:2});
  await page.screenshot({path:`${output}/focus-near.png`});
  const far=await capture({focusDistance:5});
  await page.screenshot({path:`${output}/focus-far.png`});
  const nearSharp=sharpness(near,75), nearBlur=sharpness(far,75);
  const farSharp=sharpness(far,315), farBlur=sharpness(near,315);
  assert(nearSharp>nearBlur*1.2 && farSharp>farBlur*1.2,JSON.stringify({nearSharp,nearBlur,farSharp,farBlur}));
  pass('focus switches sharpness between two scene depths',{nearSharp,nearBlur,farSharp,farBlur});
  const stopped=await capture({focusDistance:2,aperture:16});
  assert(sharpness(stopped,315)>farBlur*1.2);
  // 14 mm at f/22 is past its hyperfocal distance: both boards stay sharp wherever it focuses.
  const deepA=await capture({focusDistance:2,focalLengthMm:14,aperture:22});
  const deepB=await capture({focusDistance:5,focalLengthMm:14,aperture:22});
  assert.equal(difference(deepA,deepB),0);
  pass('stopping down increases depth of field; a wide lens at f/22 keeps both depths sharp');
  const dim=await capture({exposure:0.25});
  const bright=await capture({exposure:4});
  assert(mean(bright)>mean(dim)*1.3);
  pass('HDR preview exposure changes pixels',{dim:mean(dim),bright:mean(bright)});
  assert.equal(errors.length,0,errors.join('\n'));

  await page.goto(base);
  await page.getByRole('button',{name:'Light',exact:true}).click();
  await page.getByRole('button',{name:'Camera',exact:true}).click();
  const feed=page.getByLabel('Live camera feed');
  const read=()=>feed.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data));
  await page.waitForFunction(()=>{const c=document.querySelector('canvas[aria-label="Live camera feed"]');return c && c.getContext('2d').getImageData(240,135,1,1).data[3]>0});
  const initial=await read();
  await page.getByRole('slider',{name:'ISO',exact:true}).fill('8');
  await page.waitForTimeout(600);
  const highIso=await read();assert(mean(highIso)>mean(initial)+5);
  await page.getByRole('slider',{name:'Shutter Speed',exact:true}).fill('18');
  await page.waitForTimeout(600);
  const fast=await read();assert(mean(fast)<mean(highIso)-5);
  await page.getByRole('slider',{name:'F',exact:true}).fill('16');
  await page.waitForTimeout(600);
  assert(mean(await read())<mean(fast)-5);
  pass('actual studio ISO, shutter and aperture change rendered pixels');
  await page.getByRole('slider',{name:'ISO',exact:true}).fill('3');
  await page.getByRole('slider',{name:'Shutter Speed',exact:true}).fill('12');
  await page.getByRole('slider',{name:'F',exact:true}).fill('2.8');
  // Put a studio light in front of the lens so zoom has a measurable subject.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cinelab-studio-scene-v1')));
  saved.lights[0].position=[0.7,0,-2];saved.lights[0].height=1.55;
  saved.cameras[0].zoomMm=24;
  await page.evaluate(s=>localStorage.setItem('cinelab-studio-scene-v1',JSON.stringify(s)),saved);
  await page.reload();
  await page.waitForTimeout(1200);
  const wide=await read();
  await page.screenshot({path:`${output}/studio-wide.png`});
  await page.getByRole('slider',{name:'Zoom',exact:true}).fill('70');
  await page.waitForTimeout(700);
  const tele=await read();
  assert(difference(wide,tele)>1);
  pass('zoom changes actual subject framing',{pixelDifference:difference(wide,tele)});
  await page.screenshot({path:`${output}/studio-tele.png`});
  const beforeReload=await page.evaluate(()=>localStorage.getItem('cinelab-studio-scene-v1'));
  await page.reload();
  await page.getByRole('button',{name:'Camera',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Scene asset count"]')?.textContent.includes('1 light · 1 camera'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('cinelab-studio-scene-v1')),beforeReload);
  await page.getByRole('button',{name:'Camera',exact:true}).click();
  await page.getByRole('button',{name:'Light',exact:true}).click();
  await page.waitForTimeout(400);
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('cinelab-studio-scene-v1')));
  assert.deepEqual(restored.cameras.map(c=>c.id),['camera-0','camera-1']);
  assert.deepEqual(restored.lights.map(c=>c.id),['light-0','light-1']);
  assert.equal(restored.cameras[0].zoomMm,70);
  pass('reload preserves edits and new assets have unique IDs');
  await page.evaluate(()=>localStorage.setItem('cinelab-studio-scene-v1','{corrupt'));
  await page.reload();
  await page.getByRole('alert').filter({hasText:'Saved scene could not be loaded'}).waitFor();
  await page.getByRole('button',{name:'Camera',exact:true}).click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>localStorage.getItem('cinelab-studio-scene-v1')),'{corrupt');
  pass('corrupt saved data is preserved after editing a temporary session');
  assert.equal(errors.length,0,errors.join('\n'));
  await page.setViewportSize({width:390,height:844});
  const heading=await page.getByRole('heading',{name:'Studio 01'}).boundingBox();
  const preview=await page.getByRole('region',{name:'Camera preview'}).boundingBox();
  assert(heading.y+heading.height<preview.y);
  await page.screenshot({path:`${output}/studio-mobile.png`});
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    for(const button of await page.getByRole('navigation',{name:'Studio tools'}).getByRole('button').all()) {
      const box=await button.boundingBox();assert(box.x>=0 && box.x+box.width<=width);
    }
  }
  pass('mobile toolbar fits 320/390 px; preview clears the header');
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
} finally {
  await browser.close();await vite.close();
}
