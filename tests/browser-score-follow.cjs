const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function scoreFollowChecks(page,output){
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
 for(const [width,height] of [[375,667],[390,844]]){
  await page.setViewportSize({width,height});
  await page.locator('#scoreTools').evaluate(e=>{e.open=false;});
  await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
  await page.fill('#chartInput','C | Am | F | G | C | Em | Dm | G');await page.click('#applyChart');
  await page.selectOption('#pattern','sustain');await page.fill('#tempo','260');await page.locator('#tempo').blur();
  await page.evaluate(()=>window.scrollTo(0,700));
  const layout=await page.evaluate(()=>{
   const score=document.querySelector('.score').getBoundingClientRect(),dock=document.querySelector('.transport').getBoundingClientRect();
   return {top:score.top,height:score.height,dockTop:dock.top,dockHeight:dock.height,wide:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.ok(Math.abs(layout.top)<2&&layout.height<=180,JSON.stringify(layout));
  assert.ok(layout.dockHeight<=160&&layout.dockTop>layout.height+150,JSON.stringify(layout));assert.equal(layout.wide,false);
  await page.click('#play');
  await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)>=8,{},{timeout:15000});
  const visible=()=>page.evaluate(()=>{
   const chord=document.querySelector('.sounding'),g=document.getElementById('grid').getBoundingClientRect(),r=chord?.getBoundingClientRect();
   return !!r&&r.left>=g.left-1&&r.right<=g.right+1;
  });
  assert.ok(await visible(),'playing chord follows horizontally');
  const y=await page.evaluate(()=>scrollY);
  await page.screenshot({path:path.join(output,`score-follow-${width}.png`)});
  // A vertical gesture/click must not suspend follow; a deliberate horizontal drag must.
  await page.locator('#grid').evaluate(e=>{
   e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:100,clientY:100}));
   e.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:102,clientY:160}));
   e.dispatchEvent(new PointerEvent('pointerup',{pointerId:1}));
  });assert.equal(await page.getAttribute('#scoreFollow','aria-pressed'),'true');
  await page.locator('#grid').evaluate(e=>{
   e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:180,clientY:100}));
   e.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:100,clientY:102}));
   e.dispatchEvent(new PointerEvent('pointerup',{pointerId:1}));e.scrollLeft=0;
  });
  assert.equal(await page.textContent('#scoreFollow'),'回到播放');
  const beat=await page.locator('#position').getAttribute('data-beat');
  await page.waitForFunction(b=>Number(document.getElementById('position').dataset.beat)>Number(b)+4,beat);
  assert.equal(await page.locator('#grid').evaluate(e=>e.scrollLeft),0,'manual browsing is not pulled away');
  assert.equal(await page.evaluate(()=>scrollY),y,'following never scrolls the document');
  await page.click('#scoreFollow');assert.ok(await visible(),'resume returns to the sounding chord');
  await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)>28,null,{timeout:15000});
  await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)<4,null,{timeout:6000});
  assert.ok(await visible(),'loop wrap returns to the first bar');
  await page.click('#stop');
  // Mobile hides verbose traces on the strip, but preserves them in the chord dialog.
  await page.click('#dockMorph');const state=await read();
  const traced=page.locator('.chord-event:has(.morph-trace)').first();
  await traced.click();assert.ok(await page.locator('#editorProvenance').isVisible());
  assert.match(await page.textContent('#editorTrace'),/ → .*・/);
  await page.screenshot({path:path.join(output,`score-details-${width}.png`)});
  await page.click('#editorRestoreSource');assert.equal((await read()).origin.type,'edit');
  await page.click('#undo');assert.deepEqual((await read()).score,state.score);
 }
 // Dense/long symbols retain their width; follow the fourth chord inside a wide bar.
 await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
 await page.fill('#chartInput',Array(4).fill('Cmaj7#11:1 Am9:1 Dm11:1 G13:1 | C | Am | G').join(' | '));
 await page.click('#applyChart');assert.equal(await page.locator('#grid .bar').count(),16);
 await page.evaluate(()=>window.scrollTo(0,700));await page.click('#play');
 await page.waitForFunction(()=>{
  const c=document.querySelector('.sounding[data-bar="0"][data-chord="3"]');if(!c)return false;
  const r=c.getBoundingClientRect(),g=document.getElementById('grid').getBoundingClientRect();return r.left>=g.left&&r.right<=g.right;
 },null,{timeout:10000});
 await page.click('#stop');
 await page.setViewportSize({width:320,height:568});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'320px viewport has no page overflow');
 await page.screenshot({path:path.join(output,'score-small-320.png')});
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>window.scrollTo(0,700));
 assert.ok(await page.locator('.score-shell').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<2),'desktop score and transport stay pinned');
 assert.ok(await page.locator('#play').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(output,'score-desktop.png')});
 console.log('PASS score follow: sticky compact score, horizontal tracking, manual pause/resume, vertical position, loop wrap, mobile provenance/restore, 320px and desktop');
};
