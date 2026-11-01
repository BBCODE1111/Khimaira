const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function round8Checks(page,output){
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
 await page.setViewportSize({width:375,height:667});await page.click('#stop');
 assert.equal(await page.getAttribute('#status','role'),'status','M19 status role');
 await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
 await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
 if((await read()).keyMode!=='locked')await page.click('#keyLock');
 await page.click('#clear');await page.locator('.empty-chord').first().focus();await page.keyboard.press('Enter');
 const choose=async symbol=>page.locator(`#chordPicker [data-choice="${symbol}"]`).first().click();
 const action=op=>page.locator(`[data-picker-action="${op}"]`);
 const focusInBar=async bar=>assert.equal(await page.evaluate(()=>{
  const e=document.activeElement;return e.matches('.chord-event,.empty-chord')?[...document.querySelectorAll('#grid .bar')].indexOf(e.closest('.bar')):-1;
 }),bar,'R08-04 focus returns to live bar '+bar);
 for(const [i,symbol] of ['C','Am','F','G'].entries()){
  await choose(symbol);
  const preview=page.locator('.picker-progress');
  const rects=await preview.locator('button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
  const panel=await page.locator('#chordPicker').boundingBox();
  assert.equal(rects.length,4);assert.ok(rects.every(r=>r.top>=panel.y&&r.bottom<=667&&r.left>=0&&r.right<=375),'R08-07 all four preview bars visible');
  for(const op of ['nextBar','insertBar','removeBar']){
   const r=await action(op).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=667,op+' visible');
  }
  if(i<3)await action('nextBar').click();
 }
 assert.deepEqual((await read()).score.map(b=>b.chords.length),[1,1,1,1]);
 await page.keyboard.press('Escape');await focusInBar(3);
 await page.locator('.original-draft').evaluate(e=>{e.open=true;});await page.click('#editBackbone');
 await page.locator('[data-picker-bar="1"]').click();
 await action('insertBar').click();await choose('Dm');
 assert.match(await page.locator('[data-picker-bar="2"]').textContent(),/Dm/,'M17 inserted bar receives next choice');
 assert.match(await page.locator('[data-picker-bar="1"]').textContent(),/Am/,'M17 old bar remains unchanged');
 await page.keyboard.press('Escape');await focusInBar(2);
 await page.click('#editBackbone');await page.locator('[data-picker-bar="2"]').click();
 await action('removeBar').click();await page.keyboard.press('Escape');await focusInBar(2);
 await page.click('#editBackbone');await page.locator('[data-picker-bar="1"]').click();await choose('Dm');
 if(output)await page.screenshot({path:path.join(output,'round8-picker-375.png')});
 await page.keyboard.press('Escape');await focusInBar(1);
 // The approved mobile score strip remains horizontally scrollable.
 assert.ok(await page.locator('#grid').evaluate(e=>e.scrollWidth>e.clientWidth),'R08-02 retain horizontal score');
 await page.setViewportSize({width:1440,height:1000});
 if((await read()).keyMode==='locked')await page.click('#keyLock');
 await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
 console.log('PASS R08-02/04/05/07: horizontal score, live focus, preview, click-only builder, M17/M19 assertions');
};
