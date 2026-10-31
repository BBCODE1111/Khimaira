const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg','.webp':'image/webp'};
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
(async()=>{
 const output=process.env.KHIMAIRA_BROWSER_OUTPUT?path.join(process.env.KHIMAIRA_BROWSER_OUTPUT,'web-ci'):await fs.mkdtemp(path.join(os.tmpdir(),'khimaira-web-ci-'));
 await fs.mkdir(output,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{}),args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];
  const url=`http://127.0.0.1:${server.address().port}/`;
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>{
   window.__energy=0;
   const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(target,...args){
    const result=connect.call(this,target,...args);
    if(target instanceof AudioDestinationNode){
     const analyser=this.context.createAnalyser();connect.call(this,analyser);
     const data=new Float32Array(analyser.fftSize);
     const timer=setInterval(()=>{analyser.getFloatTimeDomainData(data);window.__energy=Math.max(window.__energy,...data.map(Math.abs));},50);
     setTimeout(()=>clearInterval(timer),30000);
    }
    return result;
   };
  });
  await page.goto(url);await page.locator('.chord-event').first().waitFor();
  await page.locator('#advancedInput summary').click();
  await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
  const loaded=await read(page);
  await page.selectOption('#randomness','high');await page.click('#generate');
  const morphed=await read(page);assert.deepEqual(morphed.backbone,loaded.backbone);assert.deepEqual(morphed.key,loaded.key);
  assert.equal(morphed.score.length,loaded.score.length);assert.ok(morphed.score.flatMap(b=>b.chords).every(c=>c.morph?.source));
  await page.click('#nextSong');const inspired=await read(page);assert.deepEqual(inspired.backbone,loaded.backbone);
  await page.click('#restore');assert.deepEqual((await read(page)).score,loaded.score);
  await page.click('#undo');assert.deepEqual((await read(page)).score,inspired.score);
  await page.click('#useCurrent');await page.click('#confirmApply');const kept=await read(page);assert.deepEqual(kept.backbone.degrees,inspired.score);
  await page.click('#undo');assert.deepEqual((await read(page)).backbone,loaded.backbone);
  await page.click('#restore');
  // Blank input must not discard the score; NC is a deliberate rest.
  const beforeBlank=await read(page);await page.fill('#chartInput','');await page.click('#applyChart');assert.deepEqual(await read(page),beforeBlank);
  await page.fill('#chartInput','H7');await page.click('#applyChart');assert.match(await page.textContent('#status'),/和弦名稱/);
  for(const chart of ['C7#5 | Caug7 | C+7 | CmM7','Co7 | C9#11 | C7sus2 | N.C.','C7sus | C(add9) | NC | C']){
   await page.fill('#chartInput',chart);await page.click('#applyChart');assert.equal(await page.getAttribute('#chartInput','aria-invalid'),null);
  }
  await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
  // Keyboard buttons keep native Space behavior.
  const rootBefore=(await read(page)).key.root;await page.focus('#transposeUp');await page.keyboard.press('Space');
  assert.equal((await read(page)).key.root,(rootBefore+1)%12);assert.notEqual(await page.getAttribute('#play','aria-pressed'),'true');await page.click('#undo');
  // Visible chromatic roots and contextual spelling in both editors.
  for(const [tonic,spelling] of [['5','Bb'],['7','F#']]){
   await page.click('#keyButton');assert.equal(await page.evaluate(()=>document.activeElement.id),'keyTonic');await page.selectOption('#keyTonic',tonic);await page.click('#applyKey');
   await page.locator('.chord-event').first().click();
   assert.equal(await page.locator('#editorRoots button').count(),12);assert.ok((await page.locator('#editorRoots button').allTextContents()).includes(spelling));
   await page.locator('#editorRoots button').filter({hasText:new RegExp('^'+spelling.replace('#','\\#')+'$')}).click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'editQuality');await page.selectOption('#editQuality','m');await page.click('#editorApply');
   assert.equal(await page.locator('.chord-event strong').first().textContent(),spelling+'m');
   await page.locator('.chord-event').first().click();await page.keyboard.press('Escape');
   await page.waitForFunction(()=>document.activeElement.classList.contains('chord-event'));
  }
  await page.locator('.original-draft').evaluate(e=>{e.open=true;});await page.click('#editBackbone');
  assert.equal(await page.getAttribute('#chordPicker','role'),'dialog');assert.equal(await page.locator('#chordPicker .root-picker button').count(),12);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'editBackbone');
  // Reset to a predictable full four-bar score, then exercise actual audio and MIDI.
  await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');await page.selectOption('#pattern','sustain');
  await page.fill('#tempo','137');await page.locator('#tempo').blur();
  await page.click('#play');await page.waitForFunction(()=>window.__energy>0.00001,null,{timeout:30000});
  await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)>1);await page.click('#stop');
  await page.locator('#performanceOptions summary').click();
  for(const split of ['merged','split'])for(const pedal of ['off','on']){
   await page.selectOption('#midiSplit',split);await page.selectOption('#midiPedal',pedal);
   const pending=page.waitForEvent('download');await page.click('#dockMidi');const download=await pending;
   assert.equal(await download.failure(),null);const file=path.join(output,`${split}-${pedal}.mid`);await download.saveAs(file);
   const bytes=await fs.readFile(file);assert.equal(bytes.toString('ascii',0,4),'MThd');assert.equal(bytes.readUInt16BE(12),480);
   const tempo=bytes.indexOf(Buffer.from([255,81,3]));assert.ok(tempo>0);assert.equal(bytes.readUIntBE(tempo+3,3),Math.round(60000000/137));
   const {readMelodyMidi}=await import('../dist/melody-reference.js');
   const tracks=readMelodyMidi(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
   assert.ok(tracks.flatMap(t=>t.notes).length>0);assert.ok(tracks.flatMap(t=>t.notes).every(n=>n.duration>0&&n.beat+n.duration<=16.001));
   if(split==='split'){assert.equal(tracks.length,2);assert.match(tracks[0].name,/Ch 3$/);assert.match(tracks[1].name,/Ch 2$/);}
  }
  // No same-module duplicate versions on the actual browser network graph.
  const urls=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\.js(?:\?|$)/.test(n)));
  const modules=new Map();for(const entry of urls){const u=new URL(entry);if(!modules.has(u.pathname))modules.set(u.pathname,new Set());modules.get(u.pathname).add(u.search);}
  for(const [name,queries] of modules)assert.equal(queries.size,1,name);
  for(const [width,height] of [[375,667],[390,844]]){
   await page.setViewportSize({width,height});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await page.locator('#grid').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   const rects=await page.locator('#undo,#restore,#useCurrent,#clear,#transposeDown,#transposeUp,#keyButton,#keyLock').evaluateAll(es=>es.map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   for(const r of rects)assert.ok(r.w>=44&&r.h>=44,JSON.stringify(r));
   await page.locator('.chord-event').first().click();await page.locator('#editorRoots [data-root="6"]').click();await page.selectOption('#editQuality','m');await page.click('#editorApply');
   await page.click('#generate');
   assert.equal(await page.locator('#status').evaluate(e=>getComputedStyle(e).position),'static');
   await page.locator('.original-draft').evaluate(e=>{e.open=true;});await page.click('#editBackbone');
   const roots=page.locator('#chordPicker .root-picker button');assert.equal(await roots.count(),12);await roots.nth(6).click();
   await page.selectOption('#chordPicker [aria-label="和弦性質"]','m');
   await page.click('#chordPicker [data-picker-action="apply"]');await page.keyboard.press('Escape');
   const axe=await new AxeBuilder({page}).analyze();const serious=axe.violations.filter(v=>['serious','critical'].includes(v.impact));
   await fs.writeFile(path.join(output,`axe-${width}.json`),JSON.stringify(axe,null,2));assert.deepEqual(serious.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
   await page.screenshot({path:path.join(output,`mobile-${width}.png`),fullPage:true});
  }
  await page.click('#clear');
  assert.ok(await page.locator('#quickProgressions button').count()>0);
  assert.match(await page.locator('#quickProgressions button').first().evaluate(e=>getComputedStyle(e).fontFamily),/DM Sans/);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('PASS web CI: workflow, provenance, input, roots/focus, audio, 4 parsed MIDI exports, cache identity, 2 mobile viewports, axe. Artifacts: '+output);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>{server.close(resolve);});}
})().catch(e=>{console.error(e);process.exitCode=1;});
