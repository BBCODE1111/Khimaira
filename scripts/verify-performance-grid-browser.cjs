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
 const site=await serve(khimaira);let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],report=[];
  page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.url().startsWith(site.url)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>{window.__musicTestEnergy=0;const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){if(target instanceof AudioDestinationNode){const context=target.context;if(!context.__tap){const tap=context.createScriptProcessor(2048,2,2);tap.onaudioprocess=e=>{for(const sample of e.inputBuffer.getChannelData(0))window.__musicTestEnergy+=sample*sample;};connect.call(tap,target);context.__tap=tap;}connect.call(this,context.__tap);}return connect.call(this,target,...args);};});
  await page.goto(site.url);await page.locator('.chord-event').first().waitFor();
  if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('C:2 G:2 | Am:2 F:2 | Dm:2 G7:2 | C');await page.locator('#applyChart').click();
  await page.locator('#performanceOptions summary').click();
  await page.locator('#human').press('Home');await page.locator('#swing').press('Home');
  await page.locator('#tempo').fill('137');await page.locator('#tempo').press('Enter');
  for(const pattern of ['house','funk','afrobeats','rnb','neosoul','jazz','amapiano','arp']){
   await page.locator('#pattern').selectOption(pattern);
   const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')));
   assert.equal(before.pattern,pattern);
   const filename=`grid-${pattern}.mid`;await download(page,'#dockMidi',filename);
   const bytes=fs.readFileSync(path.join(output,filename));
   const tempoAt=bytes.indexOf(Buffer.from([255,81,3]));assert.ok(tempoAt>0);assert.equal(bytes.readUIntBE(tempoAt+3,3),Math.round(60000000/137));
   const decoded=await page.evaluate(async values=>{
    const {readMelodyMidi}=await import('./melody-reference.js');
    const {performance}=await import('./performance.js');
    const s=JSON.parse(localStorage.getItem('khimaira-v5'));
    const actual=readMelodyMidi(new Uint8Array(values).buffer).flatMap(t=>t.notes).map(n=>[n.note,Math.round(n.beat*480),Math.round(n.duration*480)]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
    const value=id=>document.getElementById(id).value;
    const options={...s.pianoSettings,key:s.legacyRenderKey||s.harmony.key,seed:42,bpm:+value('tempo'),voicing:value('voicing'),gate:+value('gate')/100,human:+value('human')/100,swing:+value('swing')/100,rate:+value('rate'),bassMode:value('bassMode'),balladEntry:value('balladEntry'),arpFoundation:value('arpFoundation'),arpMode:value('arpMode'),arpRate:value('arpRate'),arpOctaves:+value('arpOctaves'),arpPhase:value('arpPhase'),arpAccent:value('arpAccent'),arpSeed:+value('arpSeed')};
    const {harmonyView}=await import('./harmony-state.js');
    const expected=performance(harmonyView(s.harmony).bars,s.pattern,options).map(n=>[n.note,Math.round(n.beat*480),Math.round((n.beat+n.duration)*480)-Math.round(n.beat*480)]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
    return {actual,expected,s};
   },[...bytes]);
   assert.ok(decoded.actual.length>0);assert.deepEqual(decoded.actual,decoded.expected,pattern+" exported timing differs from renderer");
   await page.reload();await page.locator('.chord-event').first().waitFor();
   assert.equal(await page.locator('#pattern').inputValue(),pattern);
   await download(page,'#dockMidi',`recalled-${pattern}.mid`);assert.deepEqual(fs.readFileSync(path.join(output,`recalled-${pattern}.mid`)),bytes);
   const energy=await page.evaluate(()=>window.__musicTestEnergy);await page.locator('#play').click();
   await page.waitForFunction(start=>window.__musicTestEnergy>start+.01,energy,{timeout:30000});await page.locator('#stop').click();
   report.push({pattern,notes:decoded.actual.length,bpm:137,recalledMidiIdentical:true,rendererMidiParity:true,realAudio:true});
  }
  await page.locator('#pattern').selectOption('house');
  await page.evaluate(()=>document.getElementById('status').textContent='');
  for(const [width,height] of [[900,650],[760,560],[390,844]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.join(output,`split-grid-${width}x${height}.png`)});
   await page.screenshot({path:path.join(output,`split-grid-${width}-full.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();site.server.closeAllConnections();await new Promise(resolve=>site.server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
