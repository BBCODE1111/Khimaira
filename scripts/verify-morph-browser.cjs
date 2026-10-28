// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const seiren=path.resolve(process.argv[2]||path.join(__dirname,'../../Seiren'));
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/morph-backbone/browser')); 
fs.mkdirSync(output,{recursive:true});
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'};
async function serve(root){
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
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
 const site=await serve(khimaira);const previous=await serve(path.resolve(__dirname,'../../releases/khimaira-genre-rhythm-20261028-rc2/Khimaira/dist'));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const report=[],errors=[];
  for(const [name,url] of [['before',previous.url],['after',site.url]]){
   const page=await browser.newPage({viewport:{width:2400,height:1000}});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.locator('.chord-event').first().waitFor();
   const click=id=>page.locator('#'+id).click();const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')));
   await click('keyButton');await page.locator('#keyTonic').selectOption('2');await click('applyKey');
   await page.locator('.seed-tools summary').click();await page.locator('#library').selectOption('contrast-Jazz-bright');await click('loadPreset');
   const loaded=(await read()).harmony;await page.locator('.score').screenshot({path:path.join(output,name+'-loaded.png')});
   if(name==='after'){
    assert.equal(await page.locator('#generate').textContent(),'MORPH');assert.deepEqual(loaded.score,loaded.backbone.degrees);
    await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('C | unfinished');await click('loadPreset');
    assert.equal((await read()).sourceDraft,null);assert.ok((await page.locator('#chartInput').inputValue()).includes('Gmaj9'));
   }
   await click('generate');const first=(await read()).harmony;report.push({name,loaded:loaded.score,result:first.score});
   if(name==='after')assert.deepEqual(first.backbone,loaded.backbone);else assert.notDeepEqual(first.backbone.degrees,loaded.score);
   await page.locator('.score').screenshot({path:path.join(output,name+'-morph.png')});
   if(name==='after'){
    await page.locator('#harmonyOptions summary').click();await page.locator('#density').selectOption('3');await page.locator('#randomness').selectOption('high');await click('generate');
    await page.locator('.score').screenshot({path:path.join(output,'after-approaches.png')});
    await page.locator('#grid').evaluate(el=>el.scrollLeft=el.scrollWidth);await page.locator('.score').screenshot({path:path.join(output,'after-approaches-right.png')});await page.locator('#grid').evaluate(el=>el.scrollLeft=0);
    const anchorRoots=await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('khimaira-v5')).harmony;const {harmonyView}=await import('./harmony-state.js');const {parse}=await import('./music.js');return harmonyView(s).bars.map(b=>parse(b.chords[0].symbol).root)});assert.deepEqual(anchorRoots,[7,6,4,2]);
    const saved=await read();await page.reload();await page.locator('.chord-event').first().waitFor();assert.deepEqual((await read()).harmony,saved.harmony);
    await click('restore');assert.deepEqual((await read()).harmony.score,loaded.score);
    // Exercise actual UI through all twelve target tonics; no detector is used as an oracle.
    let cases=0;for(let tonic=0;tonic<12;tonic++){
     await click('keyButton');await page.locator('#keyTonic').selectOption(String(tonic));await click('applyKey');
     for(const level of ['low','medium','high']){
      await page.locator('#randomness').selectOption(level);await click('generate');const h=(await read()).harmony;assert.equal(h.key.root,tonic);assert.deepEqual(h.backbone.degrees,loaded.backbone.degrees);
      await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('khimaira-v5')).harmony;const {harmonyView}=await import('./harmony-state.js');const {parse}=await import('./music.js');const {materializeChart}=await import('./degree-chart.js');const source=materializeChart(s.backbone.degrees,s.key),out=harmonyView(s).bars;source.forEach((b,i)=>{let at=0;b.chords.forEach(c=>{let time=0;const anchor=out[i].chords.find(x=>{const found=Math.abs(at-time)<1e-8;time+=x.beats;return found;});if(!anchor||parse(anchor.symbol).root!==parse(c.symbol).root||parse(anchor.symbol).bass!==parse(c.symbol).bass)throw Error('anchor changed');at+=c.beats;});});});cases++;
     }
    }report.push({uiKeyLevelCases:cases});
    await click('keyButton');await page.locator('#keyTonic').selectOption('2');await click('applyKey');await click('generate');
    for(const [width,height] of [[900,650],[760,560],[390,844]]){await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,'morph-'+width+'x'+height+'.png'),fullPage:true});}
   }
   await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'morph-report.json'),JSON.stringify({report,errors},null,2));
  fs.writeFileSync(path.join(output,'comparison.html'),'<!doctype html><meta charset="utf-8"><title>MORPH 前後比較</title><style>body{font:20px system-ui;background:#f1ede3;color:#334332;padding:24px;margin:0}h1{font-size:28px}img{width:100%;border:1px solid #aaa;display:block}section{margin:25px 0}p{margin:10px 0}</style><h1>D major · Jazz Ex1 → MORPH</h1><section><p>載入的骨幹：G → F♯ → E → D（IV → iii → ii → I）</p><img src="after-loaded.png"></section><section><p>修正前：GENERATE 回到舊骨幹，從 D 開始</p><img src="before-morph.png"></section><section><p>修正後：MORPH 保留骨幹根音，改變和弦色彩</p><img src="after-morph.png"></section><section><p>高變化／密：在骨幹尾端加入接向下一目標的 ii–V 或 subV</p><img src="after-approaches.png"><p>同一進行向右捲動：後段與回到 IV 的迴圈接近</p><img src="after-approaches-right.png"></section>');
  const evidence=await serve(output),page=await browser.newPage({viewport:{width:2448,height:1200}});await page.goto(evidence.url+'comparison.html');await page.screenshot({path:path.join(output,'comparison.png'),fullPage:true});evidence.server.closeAllConnections();evidence.server.close();console.log('PASS: before/after reproduction, stale draft LOAD, MORPH, restore, recall, 36 key/level UI cases, responsive screenshots');
 }finally{await browser?.close();for(const s of [site,previous]){s.server.closeAllConnections();s.server.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
