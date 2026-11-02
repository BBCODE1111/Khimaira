const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'../dist'),output=process.env.KHIMAIRA_IMAGE_OUTPUT||'/tmp/khimaira-melody-image';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.webp':'image/webp'};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.chord-event').first().waitFor();
  await page.locator('#melodyTools summary').click();
  const download=async(name)=>{const pending=page.waitForEvent('download');await page.click('#melodyImage');const file=await pending;assert.equal(file.suggestedFilename(),'KHIMAIRA-chord-melody.png');const bytes=await fs.readFile(await file.path());assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.ok(bytes.readUInt32BE(16)>1400);assert.ok(bytes.readUInt32BE(20)>800);await fs.writeFile(path.join(output,name),bytes);await page.waitForFunction(()=>!document.getElementById('melodyImage').disabled);return bytes;};
  const first=await download('chord-melody-zh.png');assert.equal(await page.locator('#melodyGrid .melody-card').count(),4);
  const frets=await page.locator('#melodyGrid .melody-frets').allTextContents(),state=await page.evaluate(()=>localStorage.getItem('khimaira-v5'));
  const second=await download('chord-melody-repeat.png');assert.deepEqual(second,first,'download keeps existing exact voicings');assert.deepEqual(await page.locator('#melodyGrid .melody-frets').allTextContents(),frets);assert.equal(await page.evaluate(()=>localStorage.getItem('khimaira-v5')),state);
  await page.evaluate(()=>scrollTo(0,0));await page.locator('[data-language="en"]').click();await download('chord-melody-en.png');assert.match(await page.textContent('#melodyExportStatus'),/Image exported/);
  await page.locator('#advancedInput summary').click();await page.fill('#chartInput','C:2 Dm7:1 G7:1 | N.C. | D7/F# | Bdim7');await page.click('#applyChart');assert.equal(await page.locator('#melodyGrid .melody-card').count(),0);await download('chord-melody-mixed.png');assert.equal(await page.locator('#melodyGrid .melody-card').count(),5);
  await page.setViewportSize({width:390,height:844});await page.locator('#melodyImage').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await download('chord-melody-mobile.png');await page.screenshot({path:path.join(output,'button-mobile.png')});
  // Exercise the maximum supported chart without waiting for 64 solver calls.
  const max=await page.evaluate(async()=>{const {melodyImageModel,renderMelodyImage}=await import('./chord-melody-image.js');const {parseChart}=await import('./solutions.js');const bars=parseChart(Array(16).fill('C Dm Em F').join('|')),model=melodyImageModel(bars,[]),canvas=renderMelodyImage(model,{language:'en'});return {cards:model.cards.length,width:canvas.width,height:canvas.height,pixel:[...canvas.getContext('2d').getImageData(10,canvas.height-10,1,1).data]};});
  assert.equal(max.cards,64);assert.ok(max.width*max.height<=15000000);assert.ok(max.height<16000);assert.equal(max.pixel[3],255);
  assert.deepEqual(errors,[]);console.log('PASS chord melody PNG: one-click generation, exact voicings, real downloads, Chinese/English, stale-score refresh, rests, slash chords, mobile, all 64 slots');
 }finally{await browser?.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
