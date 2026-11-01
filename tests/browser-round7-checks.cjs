const assert=require('node:assert/strict');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
async function checkTouch(page,footer=false){
 const selector='#generate,#play,#stop,#applyChart,#nextSong,#undo,#restore,#useCurrent,#clear,#transposeDown,#transposeUp,#keyButton,#keyLock'+(footer?',footer a':'');
 const rects=await page.locator(selector).evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({id:e.id||e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
 assert.ok(rects.length>=8,'touch coverage is not empty');
 for(const r of rects)assert.ok(r.w>=44&&r.h>=44,'R07 touch target '+JSON.stringify(r));
}
module.exports=async function round7Checks(page){
 await page.setViewportSize({width:1440,height:1000});
 await page.click('#stop');
 await page.locator('#advancedInput').evaluate(e=>{e.open=true;});
 await page.fill('#chartInput','C');await page.focus('#chartInput');await page.keyboard.press('End');await page.keyboard.press('Space');
 assert.equal(await page.inputValue('#chartInput'),'C ');
 assert.notEqual(await page.getAttribute('#play','aria-pressed'),'true','Space in input must not start playback');
 // A plain textarea outside a dialog prevents the dialog guard masking M10.
 await page.evaluate(()=>{const e=document.createElement('textarea');e.id='round7Textarea';e.setAttribute('aria-label','Space regression');document.body.append(e);});
 await page.focus('#round7Textarea');await page.keyboard.press('Space');
 assert.equal(await page.inputValue('#round7Textarea'),' ');
 assert.notEqual(await page.getAttribute('#play','aria-pressed'),'true','Space in textarea must not start playback');
 await page.locator('#round7Textarea').evaluate(e=>e.remove());
 await checkTouch(page);
 // M22's exact rule is masked by existing higher-specificity mobile !important
 // styles. Desktop computed dimensions must reject it explicitly.
 const injection=await page.addStyleTag({content:'button{min-height:30px!important;height:30px!important}'});
 await assert.rejects(()=>checkTouch(page),/R07 touch target/);
 await injection.evaluate(e=>e.remove());await checkTouch(page);
 for(const width of [375,390]){await page.setViewportSize({width,height:667});await checkTouch(page,true);}
 // Establish C major before clearing; subsequent construction uses only clicks.
 if((await read(page)).keyMode==='locked')await page.click('#keyLock');
 await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
 await page.locator('#scoreTools').evaluate(e=>{e.open=true;});
 // No keyboard input for the complete 1–16 bar builder flow.
 await page.click('#clear');
 await page.locator('.empty-chord').first().click();
 const action=op=>page.locator(`[data-picker-action="${op}"]`);
 while((await read(page)).score.length>1)await action('removeBar').click();
 assert.ok(await action('removeBar').isDisabled());
 await page.locator('#chordPicker [data-choice="C"]').first().click();
 for(let n=2;n<=16;n++){
  await action('insertBar').click();
  await page.locator(`#chordPicker [data-choice="${['Dm','G','C'][n%3]}"]`).first().click();
  assert.equal((await read(page)).score.length,n);
 }
 assert.ok(await action('insertBar').isDisabled());
 await page.getByRole('button',{name:'關閉和弦選擇',exact:true}).click();
 await page.click('#dockMorph');assert.equal((await read(page)).score.length,16);
 await page.click('#restore');
 await page.locator('.original-draft').evaluate(e=>{e.open=true;});await page.click('#editBackbone');
 await action('removeBar').click();assert.equal((await read(page)).score.length,15);
 await page.getByRole('button',{name:'關閉和弦選擇',exact:true}).click();
 await page.click('#undo');assert.equal((await read(page)).score.length,16);
 await page.setViewportSize({width:1440,height:1000});
 await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
 console.log('PASS R07-03/04/08: actual input/textarea Space, M22 rejected, touch sizes, click-only 1–16 bars, MORPH/UNDO');
};
