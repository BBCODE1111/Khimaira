// Called by browser-web-ci.cjs; host/CI executes this outside the sandbox.
const assert=require('node:assert/strict');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
module.exports=async function round2Checks(page){
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
 await page.fill('#chartInput','C | Am | Em | F | G | C');await page.click('#applyChart');
 await page.selectOption('#style','Jazz');await page.selectOption('#randomness','high');
 await page.locator('#harmonyOptions').evaluate(e=>{e.open=true;});await page.uncheck('#preserveBass');
 for(let i=0;i<7;i++)await page.click('#generate');
 const result=await read(page);assert.equal(result.morphHistory.length,6);
 const traces=page.locator('.morph-trace');assert.ok(await traces.count()>0);
 assert.ok(await traces.first().isVisible());assert.match(await traces.first().textContent(),/(?: → .*・|・時值讓給接近和弦)/);
 assert.match(await traces.first().locator('..').getAttribute('aria-label'),/(?: → .*・|・時值讓給接近和弦)/);
 const restoring=page.locator('.morph-restores button').first();
 await restoring.click();assert.equal((await read(page)).origin.type,'edit');await page.click('#undo');
 assert.deepEqual((await read(page)).score,result.score);
 await page.locator('#scoreTools').evaluate(e=>{e.open=true;});
 await page.click('#compareA');assert.deepEqual((await read(page)).score,result.backbone.degrees);
 await page.selectOption('#morphHistory','0');const b=await read(page);assert.deepEqual(b.score,result.morphHistory[0].score);
 await page.click('#useCurrent');await page.click('#confirmApply');assert.deepEqual((await read(page)).backbone.degrees,b.score);
 assert.equal(await page.locator('.morph-trace').count(),0);await page.click('#undo');
 await page.reload();await page.locator('.chord-event').first().waitFor();
 assert.equal((await read(page)).morphHistory.length,6);assert.equal(await page.isChecked('#preserveBass'),false);
 // R02-04,05,06: both requested mobile sizes, 8-bar score, all scroll positions.
 for(const [width,height] of [[375,667],[390,844]]){
  await page.setViewportSize({width,height});
  await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
  await page.fill('#chartInput','C | G/B | Am | C/G | F | C/E | Dm | G');await page.click('#applyChart');
  await page.evaluate(()=>window.scrollTo(0,700));
  const before=await read(page);
  // Measure rendering in-page, avoiding automation/IPC latency in the 500ms budget.
  const elapsed=await page.evaluate(async()=>{
   const start=performance.now();document.getElementById('dockMorph').click();
   await new Promise(resolve=>{requestAnimationFrame(()=>resolve());});
   for(const id of ['grid','dockStatus','dockMorph']){
    const e=document.getElementById(id),r=e.getBoundingClientRect();
    if(r.top<0||r.bottom>innerHeight||!e.textContent.trim())throw Error(id+' outside viewport or empty');
   }
   return performance.now()-start;
  });assert.ok(elapsed<500,'MORPH feedback '+elapsed+' ms');
  assert.notDeepEqual((await read(page)).score,before.score);
  const expected=await page.evaluate(()=>[...document.querySelectorAll('.chord-event strong')].map(e=>e.textContent));
  const summary=await page.textContent('#grid');for(const symbol of expected)assert.ok(summary.includes(symbol));
  assert.equal(await page.locator('#dockSummary').isVisible(),false);
  const misses=await page.evaluate(()=>{
   const ids=['play','stop','loopButton','dockMidi','transposeDown','keyButton','transposeUp','keyLock','dockMorph'],misses=[];
   const maximum=document.documentElement.scrollHeight-innerHeight;
   for(let y=0;y<=maximum;y+=8){
    window.scrollTo(0,y);
    for(const id of ids){const e=document.getElementById(id),r=e.getBoundingClientRect();
     for(const x of [.1,.5,.9]){const hit=document.elementFromPoint(r.left+r.width*x,r.top+r.height/2);if(!e.contains(hit)){misses.push({y,id,x,hit:hit?.id});if(misses.length>10)return misses;}}
    }
   }return misses;
  });assert.deepEqual(misses,[]);
  await page.locator('.chord-event').first().click();
  const apply=await page.locator('#editorApply').evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,hit:e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};});
  assert.ok(apply.top>=0&&apply.bottom<=height&&apply.hit,JSON.stringify(apply));
  assert.equal(await page.locator('#editRoot').isVisible(),false);
  const centered=await page.locator('#editorRoots button').evaluateAll(es=>es.map(e=>{
   const range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect(),r=e.getBoundingClientRect();return Math.abs((t.left+t.right-r.left-r.right)/2);
  }));assert.ok(centered.every(n=>n<2),JSON.stringify(centered));
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1440,height:1000});
 console.log('PASS round 2 browser checks: visible/accessibility provenance, single restore, six-history A/B/KEEP, persistence, 2 mobile sizes, 500ms feedback, 8px hit-test scan, pinned APPLY, centered roots');
};
