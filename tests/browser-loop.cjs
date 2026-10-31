// Host/CI only. No physical audio device: virtual Web Audio for UI and OfflineAudioContext for PCM.
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
const click=(page,id)=>page.locator('#'+id).evaluate(e=>e.click());
const beat=page=>page.locator('#position').getAttribute('data-beat').then(Number);
(async()=>{
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{}),args:['--disable-audio-output']});
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__audioTime=0;window.__attacks=[];const timers=new Map();let nextTimer=100000;
   const nativeSet=window.setTimeout.bind(window),nativeClear=window.clearTimeout.bind(window);
   window.setTimeout=(fn,delay,...args)=>{if(delay!==25||fn.name!=='tick')return nativeSet(fn,delay,...args);const id=nextTimer++;timers.set(id,{at:window.__audioTime+.025,fn});return id;};
   window.clearTimeout=id=>{timers.delete(id);nativeClear(id);};
   window.__advance=seconds=>{
    const target=window.__audioTime+seconds;
    while(true){const entry=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;timers.delete(entry[0]);window.__audioTime=entry[1].at;entry[1].fn();}
    window.__audioTime=target;
   };
   const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
   const node=()=>({gain:param(),frequency:param(),threshold:param(),ratio:param(),connect(target){return target;},disconnect(){}});
   window.AudioContext=class {
    constructor(){this.destination=node();}get currentTime(){return window.__audioTime;}
    resume(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({});}
    createGain(){return node();}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}
    createBufferSource(){const s={...node(),playbackRate:param(),start(when){this.when=when;window.__attacks.push(this);},stop(when){this.end=when??window.__audioTime;this.cancelled=this.end<this.when;}};return s;}
   };
   window.webkitAudioContext=window.AudioContext;
   window.__clipboard='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__clipboard=text;}}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.chord-event').first().waitFor();
  const load=async text=>{await page.locator('#advancedInput').evaluate(e=>{e.open=true;});await page.fill('#chartInput',text);await click(page,'applyChart');};
  const advance=seconds=>page.evaluate(seconds=>window.__advance(seconds),seconds);
  // R03-07/11: actual first-screen click; no scroll before assertion.
  assert.equal(await page.locator('#morphHistory').inputValue(),'');
  assert.match(await page.locator('#morphHistory option:checked').textContent(),/尚無/);
  const dock=await page.locator('#dockMorph').boundingBox();assert.ok(dock&&dock.y>=0&&dock.y+dock.height<=900);
  await page.locator('#dockMorph').click();assert.equal((await read(page)).origin.type,'morph');
  await page.selectOption('#randomness','high');
  // R03-02: second, third and fourth slots; chained tools preserve selected slot.
  for(const [text,index] of [['C:2 Am:2 | Dm7:2 G7:2 | C | C',1],['C | C:1 Dm7:1 G7:2 | C | C',2],['C | C:1 Am:1 Dm7:1 G7:1 | C | C',3]]){
   await load(text);await page.locator(`.chord-event[data-bar="1"][data-chord="${index}"]`).click();await page.keyboard.press('Escape');
   const before=(await read(page)).score[1].chords.slice(0,index);
   for(const id of ['invert','borrow','resolve']){
    await click(page,id);assert.deepEqual((await read(page)).score[1].chords.slice(0,index),before);
    const chosen=page.locator('.chord-event.chosen');assert.equal(await chosen.getAttribute('data-bar'),'1');assert.equal(await chosen.getAttribute('data-chord'),String(index));
   }
  }
  // Functional picker spelling and label/copy parity through actual UI.
  await load('C | Dm | G7 | C');await page.locator('.chord-event').first().click();
  await page.locator('#editorRoots [data-root="1"]').click();await page.selectOption('#editQuality','dim7');await click(page,'editorApply');
  assert.equal(await page.locator('.chord-event strong').first().textContent(),'C#dim7');
  await load('Fm7 | E7 | Ebmaj7');await page.locator('#scoreTools').evaluate(e=>{e.open=true;});await page.selectOption('#textFormat','roman');await click(page,'copyChords');
  assert.deepEqual((await page.evaluate(()=>window.__clipboard)).split('|').map(x=>x.trim()).filter(Boolean),await page.locator('.degree').allTextContents());
  await load('G/B | G7/B | C');assert.ok((await page.locator('.degree').allTextContents()).every(t=>!t.includes('/B')));
  await load('C | Am | F | G');await click(page,'generate');
  assert.match(await page.locator('#morphHistory option:checked').textContent(),/高.*\|/);
  const history=(await read(page)).history.length;
  for(let i=0;i<100;i++)await click(page,i%2?'compareB':'compareA');assert.equal((await read(page)).history.length,history);
  // Exact fractional position is kept while swapping the live score.
  await page.selectOption('#pattern','sustain');await page.fill('#tempo','137');await page.locator('#tempo').dispatchEvent('change');
  if(!await page.isChecked('#loop'))await click(page,'loopButton');await click(page,'play');
  await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true');
  await advance(2.387);
  for(const action of [()=>click(page,'compareA'),()=>click(page,'compareB'),()=>click(page,'generate'),()=>page.selectOption('#style','Rock'),()=>click(page,'undo')]){
   const before=await beat(page);await action();await advance(.025);const after=await beat(page);
   assert.ok(after>=before&&after-before<=.025*137/60+.002,`phase jump ${before} → ${after}`);
   assert.equal(await page.getAttribute('#play','aria-pressed'),'true');
  }
  let previousBpm=137;
  // The sampled tick can still run at the old tempo, so the bound uses the faster of the two.
  for(const bpm of [60,240,137]){const before=await beat(page);await page.fill('#tempo',String(bpm));await page.locator('#tempo').dispatchEvent('change');await advance(.025);const after=await beat(page);assert.ok(after>=before&&after-before<=.025*Math.max(bpm,previousBpm)/60+.002,`tempo jump ${before} → ${after}`);previousBpm=bpm;}
  await click(page,'stop');
  // UI cue selection across requested lengths. 100 loops are evaluated below without DOM overhead.
  for(const length of [1,3,4,16]){
   await load(Array.from({length},()=> 'C:2 G7:2').join(' | '));
   const cue=Math.floor(length/2);await page.locator(`.bar[data-index="${cue}"] .bar-cue`).click();await page.selectOption('#pattern','sustain');
   await click(page,'play');await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true');
   await advance((length-cue)*4*60/137*2+.3);assert.ok((await beat(page))>=cue*4&&(await beat(page))<length*4);
   await click(page,'loopButton');await advance((length-cue)*4*60/137+.3);assert.equal(await page.getAttribute('#play','aria-pressed'),'false');await click(page,'loopButton');
  }
  // R04 P2-B: actual MORPH click at beat 9.925, exact next-bar audio scheduling.
  await load('C | G | Am | F');await page.selectOption('#pattern','sustain');
  await page.fill('#tempo','120');await page.locator('#tempo').dispatchEvent('change');
  await page.locator('.bar[data-index="0"] .bar-cue').click();
  await click(page,'play');await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true');
  const origin=await page.evaluate(()=>window.__audioTime+.04);
  await advance(.04+9.925*.5);
  const attackIndex=await page.evaluate(()=>window.__attacks.length);
  await click(page,'generate');await advance(4);
  const newAttacks=await page.evaluate(index=>window.__attacks.slice(index).filter(v=>!v.cancelled).map(v=>v.when),attackIndex);
  assert.ok(newAttacks.length);for(const when of newAttacks){assert.ok(when>=origin+6-1e-9);assert.ok(Math.abs((when-origin)/.5-Math.round((when-origin)/.5))*.5<.001);}
  await click(page,'stop');
  // R04 P2-C: loop tail resolves to FROM BAR 3, the actual next sounding Dm.
  await load('C | G | Dm | F');await page.locator('.bar[data-index="2"] .bar-cue').click();
  await page.locator('.chord-event[data-bar="3"]').click();await page.keyboard.press('Escape');
  await click(page,'resolve');assert.match(await page.textContent('#status'),/解決到 Dm/);
  await page.locator('.bar[data-index="0"] .bar-cue').click();
  // Tail NEXT routing changes with the actual LOOP control.
  await load('C | Am | F | F');await page.locator('.chord-event').last().click();await page.keyboard.press('Escape');
  await click(page,'loopButton');const beforeTail=await read(page);await click(page,'resolve');assert.deepEqual((await read(page)).score,beforeTail.score);
  assert.match(await page.textContent('#status'),/LOOP/);await click(page,'loopButton');await click(page,'resolve');assert.match(await page.textContent('#status'),/解決到 C/);
  // HUMAN stays explicit, and one click gives exact triplet ticks.
  await page.selectOption('#style','Jazz');await page.selectOption('#pattern','arp');await page.selectOption('#arpRate','24');
  await page.locator('#human').evaluate(e=>{e.value=45;e.dispatchEvent(new Event('change'));});assert.match(await page.textContent('#arpHint'),/HUMAN.*偏移/);
  await click(page,'arpStraight');assert.equal(await page.inputValue('#human'),'0');
  const result=await page.evaluate(async()=>{
   const {BeatPlayer}=await import('./tempo-player.js'),{performance:render}=await import('./performance.js'),{parseChart}=await import('./solutions.js');
   let cases=0,maxDrift=0,attacks=0;
   for(const length of [1,3,4,16]){
    const notes=render(parseChart(Array.from({length},()=> 'C:2 G7:2').join(' | ')),'arp',{human:0,swing:0,arpRate:'24',arpOctaves:1}),voices=[];
    const piano={context:{currentTime:0},note(note,when,duration){const v={note,when,end:when+duration,cancel(){this.cancelled=true;},retime(end){this.end=end;}};voices.push(v);return v;},stop(){}};
    const player=new BeatPlayer(piano,notes,length*4,{bpm:137,loop:true,lead:0}),end=player.timeAt(length*4*100);
    for(let i=0;i*.025<end;i++){piano.context.currentTime=i*.025;if(player.beatAt()>=length*4*99)player.setLoop(false);player.pump();}
    const sounded=voices.filter(v=>!v.cancelled);if(sounded.length!==notes.length*100)throw Error('loop duplicates/loss');
    sounded.forEach((v,i)=>{const n=notes[i%notes.length],cycle=Math.floor(i/notes.length);maxDrift=Math.max(maxDrift,Math.abs(v.when-(cycle*length*4+n.beat)*60/137));});attacks+=sounded.length;cases++;
   }
   // Real offline PCM verifies a sustained tail and first attack meet at the seam.
   const ctx=new OfflineAudioContext(1,48000*5,48000),piano={context:{currentTime:0},note(note,when,duration){const source=ctx.createConstantSource(),gain=ctx.createGain();source.offset.value=.1;source.connect(gain).connect(ctx.destination);source.start(when);source.stop(when+duration);return {cancel(){source.stop();},retime(end){source.stop(end);}};},stop(){}};
   const p=new BeatPlayer(piano,[{note:60,beat:0,duration:4,velocity:.7}],4,{bpm:120,loop:true,lead:0});
   for(let i=0;i<200;i++){piano.context.currentTime=i*.025;p.pump();}
   const pcm=(await ctx.startRendering()).getChannelData(0);
   for(const seam of [2,4])for(let i=seam*48000-2;i<=seam*48000+2;i++)if(Math.abs(pcm[i]-.1)>1e-5)throw Error('offline seam gap or overlap');
   return {cases,attacks,maxDrift,offlineSeams:2};
  });
  assert.ok(result.maxDrift<1e-8);console.log('PASS browser LOOP virtual/offline:',result);
  // R03-12/17: inherited 1.0.5 compact dock stays bounded; scroll region has a keyboard entry.
  for(const [width,height] of [[375,667],[390,844]]){
   await page.setViewportSize({width,height});await load(Array(16).fill('C | G7').join(' | ').split(' | ').slice(0,16).join(' | '));
   const box=await page.locator('.transport').boundingBox();assert.ok(box.height<=height*.25,JSON.stringify(box));
   await page.evaluate(()=>document.querySelectorAll('details').forEach(e=>{e.open=true;}));
   const axe=await new AxeBuilder({page}).withRules(['scrollable-region-focusable']).analyze();assert.deepEqual(axe.violations,[]);
   assert.equal(await page.locator('.tab-scroll').first().getAttribute('tabindex'),'0');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS R03 browser: selection 2–4 chords, spelling/copy, first-screen MORPH, A/B undo/history, live phase, arbitrary cue/LOOP stop, NEXT routing, ARP HUMAN, compact mobile dock and keyboard scroll');
 }finally{await browser?.close();await new Promise(resolve=>{server.close(resolve);});}
})().catch(e=>{console.error(e);process.exitCode=1;});
