// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/genre-rhythm/browser'));
fs.mkdirSync(output,{recursive:true});
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'};
async function serve(root){
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});
  });
  await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});
  return {server,url:`http://127.0.0.1:${server.address().port}/`};
}
async function download(page,selector,name){
  const pending=page.waitForEvent('download');await page.locator(selector).click();
  const item=await pending;assert.equal(await item.failure(),null);
  const destination=path.join(output,name);await item.saveAs(destination);
  const bytes=fs.readFileSync(destination);assert.equal(bytes.subarray(0,4).toString(),'MThd');assert.ok(bytes.length>40);
  return bytes.length;
}
(async()=>{
 const site=await serve(khimaira);let browser;const report=[];
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const [width,height] of [[1440,1000],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(site.url);await page.locator('.chord-event').first().waitFor();assert.equal(await page.locator('#advancedInput').getAttribute('open'),null);
  await page.locator('#keyLock').click();await page.locator('#clear').click();assert.equal(await page.locator('#quickProgressions button').count(),5);
  const close=async()=>{if(await page.locator('#chordPicker').isVisible())await page.getByRole('button',{name:'關閉和弦選擇',exact:true}).click();};
  const open=async bar=>{await close();await page.locator(`.bar[data-index="${bar}"]`).locator('.chord-event,.empty-chord').first().click();};
  const choose=async(bar,symbol,more=false)=>{await open(bar);if(more)await page.locator('#chordPicker summary').click();await page.locator(`#chordPicker [data-choice="${symbol}"]`).first().click();await close();};
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')));
  for(const [bar,symbol] of ['C','G','Am','F'].entries())await choose(bar,symbol);
  let s=await read();assert.deepEqual(s.harmony.backbone.degrees.map(b=>b.chords[0].degree),[1,5,6,4]);
  await page.screenshot({path:path.join(output,`tap-pop-${width}.png`),fullPage:true});
  for(const [bar,symbol] of ['Dm7','G7','Cmaj7','Fmaj7'].entries()){
   if(symbol==='G7'){await open(bar);await page.locator('#chordPicker summary').click();await page.locator('#chordPicker [aria-label="任意根音"]').selectOption('7');await page.locator('#chordPicker [aria-label="和弦性質"]').selectOption('7');await page.locator('#chordPicker [data-picker-action="apply"]').click();await close();}
   else await choose(bar,symbol,true);
  }
  await open(2);await page.locator('[data-picker-action="split"]').click();await page.locator('[data-half="1"]').click();await page.locator('#chordPicker summary').click();
  await page.locator('#chordPicker [aria-label="和弦性質"]').selectOption('7');await page.locator('[data-picker-action="apply"]').click();
  s=await read();const expected=s.harmony.backbone.degrees;assert.equal(expected[2].chords[0].quality,'maj7');assert.equal(expected[2].chords[1].quality,'7');
  await page.screenshot({path:path.join(output,`tap-jazz-picker-${width}.png`)});await close();
  await page.locator('#generate').click();assert.deepEqual((await read()).harmony.backbone.degrees,expected);await page.locator('#restore').click();assert.deepEqual((await read()).harmony.score,expected);
  await open(1);await page.locator('[data-picker-action="copy"]').click();await close();await page.locator('#undo').click();assert.deepEqual((await read()).harmony.score,expected);
  if(width>600){await page.locator('.bar').nth(0).dragTo(page.locator('.bar').nth(1));await close();await page.locator('#undo').click();assert.deepEqual((await read()).harmony.score,expected);}
  await page.reload();await page.locator('.chord-event').first().waitFor();assert.deepEqual((await read()).harmony.score,expected);
  await page.screenshot({path:path.join(output,`tap-jazz-${width}.png`),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await open(0);const sizes=await page.locator('#chordPicker button:visible').evaluateAll(bs=>bs.map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})));assert.ok(sizes.every(r=>r.width>=44&&r.height>=44));await close();
  // Explicit AUTO behavior through a UI load, reinterpret and transpose.
  await page.locator('#advancedInput summary').click();await page.locator('#keyLock').click();await page.locator('#chartInput').fill('Em7 | A7 | Dm7 | G7');await page.locator('#applyChart').click();assert.equal((await read()).harmony.key.root,0);assert.equal((await read()).harmony.keyMode,'auto');
  await page.locator('#transposeUp').click();assert.equal((await read()).harmony.keyMode,'auto');assert.equal((await read()).harmony.key.root,1);
  assert.deepEqual(errors,[]);report.push({width,height,noTextAcceptance:true,split:true,restore:true,undo:true,recall:true,minimum44px:true,autoTranspose:true,errors});await page.close();
  const fresh=await browser.newPage({viewport:{width,height}});await fresh.goto(site.url);await fresh.locator('.chord-event').first().waitFor();await fresh.locator('#clear').click();
  for(const [bar,symbol] of ['F','G','Em','Am'].entries()){
   await fresh.locator(`[data-empty-bar="${bar}"]`).click();await fresh.locator(`#chordPicker [data-choice="${symbol}"]`).first().click();await fresh.getByRole('button',{name:'關閉和弦選擇',exact:true}).click();
   if(bar<3)assert.equal(await fresh.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony.key.root),0);
  }
  assert.ok([0,9].includes(await fresh.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony.key.root)));await fresh.close();
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();site.server.closeAllConnections();await new Promise(resolve=>{site.server.close(resolve);});}
})().catch(e=>{console.error(e);process.exitCode=1;});
