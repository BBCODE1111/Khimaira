const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');

const root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.webp':'image/webp'};
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')));

(async()=>{
 const output=process.env.KHIMAIRA_BROWSER_OUTPUT?path.join(process.env.KHIMAIRA_BROWSER_OUTPUT,'session'):await fs.mkdtemp(path.join(os.tmpdir(),'khimaira-session-'));
 await fs.mkdir(output,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});
 let browser;
 const errors=[];
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{}),args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);await page.locator('.chord-event').first().waitFor();
  // Both transpose entry points and LOCK must leave a normal Jazz palette.
  for(const method of ['step','dialog','lock']){
   await page.selectOption('#style','Dorian folk');
   if(method==='step')await page.click('#transposeUp');
   if(method==='dialog'){
    await page.click('#keyButton');await page.selectOption('#keyTonic','2');await page.click('#applyKey');
   }
   if(method==='lock')await page.click('#keyLock');
   assert.equal((await read(page)).harmony.key.mode,'major');
   await page.selectOption('#style','Jazz');
   assert.match(await page.textContent('#keyLabel'),/major/);
   assert.ok(await page.locator('#library option').count()>0);
   assert.equal(await page.locator('#loadPreset').isDisabled(),false);
   await page.reload();await page.locator('.chord-event').first().waitFor();
   assert.match(await page.textContent('#keyLabel'),/major/);
  }
  // Recover both review reproductions, malformed JSON, and malformed v5 shape.
  for(const raw of ['{"bars":[{"symbol":"H7"}],"style":"Jazz"}','{"bars":[{"symbol":"C"}],"style":"Nope"}','{broken','{"harmony":{"schema":1,"score":[]}}']){
   await page.evaluate(raw=>{localStorage.clear();localStorage.setItem('khimaira-v5',raw);},raw);
   await page.reload();await page.locator('.chord-event').first().waitFor();
   assert.deepEqual(await page.locator('.chord-event strong').allTextContents(),['C','Am','F','G']);
   const backups=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('khimaira-corrupt-')).map(k=>localStorage.getItem(k)));
   assert.deepEqual(backups,[raw]);assert.equal((await read(page)).harmony.style,'Jazz');
  }
  // A quota failure must not overwrite the damaged original even after edits.
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('khimaira-v5','{unbacked');});
  const blocked=await browser.newPage();blocked.on('pageerror',error=>errors.push(error.message));
  // newPage has isolated storage; seed and deny writes before app startup.
  await blocked.addInitScript(()=>{
   Storage.prototype.setItem.call(localStorage,'khimaira-v5','{unbacked');
   Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};
  });
  await blocked.goto(url);await blocked.locator('.chord-event').first().waitFor();
  await blocked.click('#generate');
  assert.equal(await blocked.evaluate(()=>localStorage.getItem('khimaira-v5')),'{unbacked');
  await blocked.close();
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('.chord-event').first().waitFor();
  await page.selectOption('#randomness','high');await page.locator('#harmonyOptions summary').click();await page.locator('[data-solution="cadence"]').click();
  const morphed=(await read(page)).harmony;
  assert.ok(morphed.score[0].chords.length>1);
  await page.locator('.chord-event[data-bar="0"][data-chord="1"]').click();
  assert.equal(await page.locator('#chordEditor').isVisible(),true);
  await page.selectOption('#editRoot','4');await page.selectOption('#editQuality','m');await page.selectOption('#editBass','');await page.click('#editorApply');
  const edited=(await read(page)).harmony;
  assert.deepEqual(edited.backbone,morphed.backbone);assert.deepEqual(edited.key,morphed.key);
  assert.deepEqual(edited.score.slice(1),morphed.score.slice(1));
  assert.deepEqual(edited.score[0].chords[0],morphed.score[0].chords[0]);
  assert.equal(await page.locator('.chord-event[data-bar="0"][data-chord="1"] strong').textContent(),'Em');
  await page.click('#undo');assert.deepEqual((await read(page)).harmony,morphed);
  await page.click('#restore');assert.deepEqual((await read(page)).harmony.score,morphed.backbone.degrees);
  // Explicit backbone editing remains available and clearly labelled.
  await page.locator('.original-draft summary').click();await page.click('#editBackbone');
  assert.match(await page.textContent('.picker-heading'),/編輯骨幹/);
  await page.locator('#chordPicker [data-choice="Dm"]').click();
  const backboneEdited=(await read(page)).harmony;
  assert.deepEqual(backboneEdited.score,backboneEdited.backbone.degrees);
  assert.equal(await page.locator('.chord-event').first().locator('strong').textContent(),'Dm');
  await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('.chord-event').first().click();
  assert.equal(await page.locator('#chordEditor').isVisible(),true);
  await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`PASS: 3 modal paths, 4 corrupt saves, quota protection, passing-chord edit/UNDO/RESTORE, explicit backbone edit, mobile editor. Artifacts: ${output}`);
 }finally{
  await browser?.close();server.closeAllConnections();await new Promise(resolve=>{server.close(resolve);});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
