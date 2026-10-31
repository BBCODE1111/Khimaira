// Invoked by the release browser gate. This file is not executed in the sandbox.
const assert=require('node:assert/strict');
const {default:AxeBuilder}=require('@axe-core/playwright');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
module.exports=async function round4Checks(page){
 await page.setViewportSize({width:1440,height:900});
 await page.reload();await page.locator('.chord-event').first().waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));
 const box=await page.locator('#dockMorph').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=900);
 await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
 await page.fill('#chartInput','C | G | Am | F');await page.click('#applyChart');
 await page.selectOption('#style','Jazz');await page.selectOption('#randomness','high');
 await page.click('#generate');
 for(const [width,height] of [[1440,900],[375,667],[390,844]]){
  await page.setViewportSize({width,height});
  const labels=await page.locator('.chord-event[aria-label]').evaluateAll(es=>es.map(e=>({name:e.getAttribute('aria-label'),visible:e.querySelector('strong').textContent+' '+e.querySelector('.degree').textContent})));
  assert.ok(labels.length);for(const label of labels)assert.ok(label.name.startsWith(label.visible),JSON.stringify(label));
  // This WCAG 2.5.3 rule is not included in the default axe rule selection.
  const axe=await new AxeBuilder({page}).withRules(['label-content-name-mismatch']).analyze();
  assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.click('#nextSong');const preview=await read(page);
 await page.reload();await page.locator('.chord-event').first().waitFor();
 assert.deepEqual((await read(page)).score,preview.score);assert.equal((await read(page)).origin.type,'inspire');
 assert.ok(await page.locator('#seedMood').isVisible());assert.match(await page.textContent('#seedMood'),/INSPIRE.*預覽/);
 await page.click('#restore');assert.deepEqual((await read(page)).score,preview.backbone.degrees);
 assert.equal(await page.locator('#seedMood').isVisible(),false);
 // User decisions 1–2 supersede the former Gb/Gbm palette expectation.
 await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
 await page.fill('#chartInput','Am | Dm | E7 | Am');await page.click('#applyChart');
 // Explicitly use the detected A minor key if a previous scenario left LOCK on.
 if((await read(page)).keyMode==='locked')await page.click('#keyLock');
 await page.locator('.original-draft').evaluate(e=>{e.open=true;});await page.click('#editBackbone');
 assert.equal(await page.locator('#chordPicker [data-root="6"]').textContent(),'F#');
 await page.locator('#chordPicker details').evaluate(e=>{e.open=true;});
 assert.equal(await page.locator('#chordPicker [data-choice="F#m"]').count(),1);
 await page.locator('#chordPicker select[aria-label="和弦性質"]').selectOption('dim7');
 assert.equal(await page.locator('#chordPicker [data-root="1"]').textContent(),'C#');
 await page.locator('#chordPicker select[aria-label="和弦性質"]').selectOption('m7b5');
 assert.equal(await page.locator('#chordPicker [data-root="6"]').textContent(),'F#');
 await page.keyboard.press('Escape');
 await page.locator('.chord-event').first().click();
 await page.selectOption('#editQuality','dim7');await page.click('#editorRoots [data-root="1"]');
 assert.match(await page.textContent('#editorPreview'),/^C#dim7/);
 assert.equal(await page.locator('#editorRoots [data-root="1"]').textContent(),'C#');
 await page.keyboard.press('Escape');
};
