// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const seiren=path.resolve(process.argv[2]||path.join(__dirname,'../../Seiren'));
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/key-redesign/browser'));
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
 const site=process.env.VERIFY_LIVE==='1'?{url:'https://bbcode1111.github.io/Khimaira/',server:null}:await serve(khimaira);let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1440,height:1400}}),errors=[],missing=[],report=[];
  page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.url().startsWith(site.url)&&r.status()>=400)missing.push(r.url());});
  await page.addInitScript(()=>{window.__musicTestEnergy=0;const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){if(target instanceof AudioDestinationNode){const context=target.context;if(!context.__tap){const tap=context.createScriptProcessor(2048,2,2);tap.onaudioprocess=e=>{for(const sample of e.inputBuffer.getChannelData(0))window.__musicTestEnergy+=sample*sample;};connect.call(tap,target);context.__tap=tap;}connect.call(this,context.__tap);}return connect.call(this,target,...args);};});
  const click=id=>page.locator('#'+id).click(),read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5'))),chords=()=>page.locator('.chord-event strong').allTextContents();
  async function load(text){if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill(text);await click('applyChart');}
  async function tonic(n){await click('keyButton');await page.locator('#keyTonic').selectOption(String(n));await click('applyKey');}
  async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,name+'.png')});}
  await page.goto(site.url);await page.locator('.chord-event').first().waitFor();
  await load('F | Dm | Bb | C');assert.equal(await page.locator('#keyLabel').textContent(),'F major');
  assert.deepEqual(await page.locator('.degree').allTextContents(),['I','vi','IV','V']);
  const f=(await read()).harmony.backbone;const generated=[];
  for(let i=0;i<3;i++){await click('generate');const s=(await read()).harmony;assert.equal(s.key.root,5);assert.deepEqual(s.backbone,f);generated.push(await chords());}
  assert.equal(new Set(generated.map(JSON.stringify)).size,3);report.push({case:'F input → three GENERATE clicks',pass:true,generated});await shot('f-major-generate-desktop');
  await click('restore');assert.deepEqual(await chords(),['F','Dm','Bb','C']);
  await page.locator('#inputFormat').selectOption('roman');assert.equal(await page.locator('#chartInput').inputValue(),'| I | vi | IV | V |');
  await page.locator('#inputFormat').selectOption('chords');await load('G | Em | C | D');assert.equal((await read()).harmony.key.root,7);
  const g=(await read()).harmony.backbone;await tonic(2);assert.deepEqual(await chords(),['D','Bm','G','A']);assert.deepEqual((await read()).harmony.backbone,g);
  for(let i=0;i<3;i++)await click('generate');assert.equal((await read()).harmony.key.root,2);
  await shot('d-major-generate-desktop');const beforeRestore=await chords();await click('restore');assert.deepEqual(await chords(),['D','Bm','G','A']);await click('undo');assert.deepEqual(await chords(),beforeRestore);
  report.push({case:'G → D transpose, GENERATE, RESTORE and UNDO',pass:true});
  await page.locator('.seed-tools summary').click();const p=await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('khimaira-v5')).harmony;return (await import('./keyed-examples.js')).examplesForKey(s.style,s.key)[0];});
  await page.locator('#library').selectOption(p.id);await click('loadPreset');assert.deepEqual((await read()).harmony.score,p.degrees);assert.deepEqual((await read()).harmony.backbone.degrees,p.degrees);const loadedBackbone=(await read()).harmony.backbone;
  const inspire=[];for(let i=0;i<2;i++){await click('nextSong');const s=(await read()).harmony;assert.equal(s.key.root,2);assert.equal(s.key.mode,'major');assert.deepEqual(s.backbone,loadedBackbone);inspire.push(s.origin.kind);}
  assert.ok(inspire.includes('fusion'));assert.ok(inspire.includes('example'));
  report.push({case:'Exact compatible example LOAD adopts backbone; both INSPIRE paths preserve it',pass:true});
  await click('useCurrent');await click('confirmCancel');assert.deepEqual((await read()).harmony.backbone,loadedBackbone);
  const kept=(await read()).harmony.score;await click('useCurrent');await click('confirmApply');assert.deepEqual((await read()).harmony.backbone.degrees,kept);await click('undo');assert.deepEqual((await read()).harmony.backbone,loadedBackbone);
  if((await read()).harmony.keyMode!=='locked')await click('keyLock');await load('F | Dm | Bb | C');assert.equal((await read()).harmony.key.root,2);assert.deepEqual(await chords(),['F','Dm','Bb','C']);assert.equal(await page.locator('#keyWarning').isVisible(),true);
  await click('acceptKeySuggestion');assert.equal((await read()).harmony.key.root,5);assert.deepEqual(await chords(),['F','Dm','Bb','C']);
  await click('keyLock');await load('Am | F | C | G');assert.ok(await page.locator('#keyCandidate').isVisible());const pitches=await chords();await click('keyCandidate');assert.deepEqual(await chords(),pitches);
  report.push({case:'KEEP confirmation, locked input suggestion and candidate reinterpretation',pass:true});
  if((await read()).harmony.keyMode==='locked')await click('keyLock');await load('C | Am | F | G');await click('keyLock');await click('keyButton');await page.locator('#keyMode').selectOption('minor');await click('convertMode');await click('confirmCancel');assert.equal((await read()).harmony.key.mode,'major');
  await click('keyButton');await page.locator('#keyMode').selectOption('minor');await click('convertMode');await click('confirmApply');assert.equal((await read()).harmony.key.mode,'minor');assert.deepEqual(await chords(),['Cm','Ab','Fm','G']);
  const minorIds=await page.locator('#library option').evaluateAll(xs=>xs.map(x=>x.value));
  const expectedIds=await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('khimaira-v5')).harmony;return (await import('./keyed-examples.js')).examplesForKey(s.style,s.key).map(p=>p.id);});assert.deepEqual(minorIds,expectedIds);
  await page.locator('#library').selectOption(minorIds[0]);await click('loadPreset');assert.equal((await read()).harmony.key.mode,'minor');const loadedMinor=await chords();await click('generate');await click('restore');assert.deepEqual(await chords(),loadedMinor);
  report.push({case:'Independent confirmed mode conversion, minor-only examples and RESTORE',pass:true,minorExamples:minorIds.length});
  await click('editChord');await page.locator('#editQuality').selectOption('m11');await click('editorApply');assert.equal((await read()).harmony.origin.type,'edit');await click('restore');assert.deepEqual(await chords(),loadedMinor);
  const saved=await read();await page.reload();await page.locator('.chord-event').first().waitFor();assert.deepEqual((await read()).harmony,saved.harmony);
  if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('i | bVI | iv | V7');await click('generate');assert.equal((await read()).harmony.key.mode,'minor');assert.equal((await read()).sourceDraft,null);
  await page.locator('#tempo').fill('137');await page.locator('#tempo').press('Enter');await page.locator('#midiSplit').selectOption('split');await download(page,'#dockMidi','key-redesign-137bpm.mid');
  const bytes=fs.readFileSync(path.join(output,'key-redesign-137bpm.mid')),tempoAt=bytes.indexOf(Buffer.from([255,81,3]));assert.ok(tempoAt>0);assert.equal(bytes.readUIntBE(tempoAt+3,3),Math.round(60000000/137));
  await click('play');await page.waitForFunction(()=>window.__musicTestEnergy>.01,null,{timeout:30000});assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');assert.ok(await page.locator('.sounding').count()>0);await click('stop');
  report.push({case:'Bar edit / Roman input / reload / 137 BPM MIDI / real Web Audio output and highlighting',pass:true});
  if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('not-a-chord');await click('generate');assert.equal((await read()).sourceDraft,'not-a-chord');assert.equal((await read()).harmony.key.mode,'minor');
  if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('i | bVI | iv | V7');await click('applyChart');
  await page.locator('#style').selectOption('Dorian folk');assert.equal((await read()).harmony.key.mode,'minor'); // explicitly locked mode wins
  assert.equal(await page.locator('#loadPreset').isDisabled(),true);await click('nextSong');assert.equal((await read()).harmony.origin.kind,'backbone');
  report.push({case:'Invalid input preserves score; locked mode wins over modal style; empty compatible pool fallback',pass:true});
  await click('keyLock');await click('keyButton');assert.equal(await page.locator('#keyMode').inputValue(),'dorian');assert.equal(await page.locator('#convertMode').isDisabled(),true);await page.keyboard.press('Escape');await click('keyLock');assert.equal((await read()).harmony.key.mode,'dorian');await click('undo');await page.locator('#style').selectOption('Jazz');await load('F | Dm | Bb | C');await tonic(5);await click('generate');
  await page.locator('.seed-tools details').evaluate(el=>el.open=true);await page.evaluate(()=>document.getElementById('status').textContent='');await shot('website-desktop');
  await click('keyButton');await shot('key-menu-desktop');await page.keyboard.press('Escape');
  for(const width of [900,760,390,360]){
   await page.setViewportSize({width,height:width>600?900:844});await page.evaluate(()=>scrollTo(0,0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
   await shot('website-'+width);
   // Mobile scroll: actual buttons must remain reachable, not just visible in DOM.
   if(width===390){await page.locator('#generate').scrollIntoViewIfNeeded();await click('generate');await click('keyButton');await page.locator('#keyTonic').selectOption('2');await click('applyKey');assert.equal((await read()).harmony.key.root,2);await page.screenshot({path:path.join(output,'website-mobile-scrolled.png')});}
  }
  assert.equal(await page.locator('#key').count(),0);assert.equal(await page.locator('#mode').count(),0);assert.equal(await page.locator('#keyButton').count(),1);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);report.push({case:'Unique KEY and desktop / tablet / mobile layout and controls',pass:true});
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,errors,missing},null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();if(site.server){site.server.closeAllConnections();await new Promise(resolve=>site.server.close(resolve));}}
})().catch(e=>{console.error(e);process.exitCode=1;});
