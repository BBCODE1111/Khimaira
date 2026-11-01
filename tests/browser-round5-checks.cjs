const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);
module.exports=async function round5Checks(page,output){
 await page.setViewportSize({width:1440,height:1000});
 const load=async text=>{await page.locator('#advancedInput').evaluate(e=>{e.open=true;});await page.fill('#chartInput',text);await page.click('#applyChart');};
 const chart='C | Am | Em | F | G | C';
 await load(chart);await page.selectOption('#style','Jazz');await page.selectOption('#randomness','high');
 await page.locator('#harmonyOptions').evaluate(e=>{e.open=true;});
 await page.uncheck('#preserveBass');
 const switches={morphInversion:['inversion'],morphParallel:['parallel'],morphIIV:['ii-V','approach']};
 for(const id of Object.keys(switches))await page.check('#'+id);
 // Positive controls prevent a broken/no-op MORPH from passing negative checks.
 const observed=new Set();let targets=0;
 for(let i=0;i<16;i++){
  await page.click('#generate');const s=await read(page);
  for(const [bar,b] of s.score.entries())for(const [chord,c] of b.chords.entries()){
   observed.add(c.morph?.technique);
   if(c.morph?.target&&c.morph.target.bar>0){
    const trace=page.locator(`.chord-event[data-bar="${bar}"][data-chord="${chord}"] .morph-trace`);
    assert.ok((await trace.textContent()).includes(`（第 ${c.morph.target.bar+1} 小節）`),'M08 target bar must match provenance');targets++;
   }
  }
 }
 for(const technique of ['inversion','parallel','ii-V'])assert.ok(observed.has(technique),'M02 positive control '+technique);
 assert.ok(targets>0,'M08 non-first-bar targets exercised');
 const historyBefore=(await read(page)).morphHistory;
 await page.click('#keyLock');await page.click('#keyLock');assert.deepEqual((await read(page)).morphHistory,historyBefore,'AUTO keeps same-key history');
 assert.match(await page.locator('.morph-restores button').first().evaluate(e=>getComputedStyle(e).fontFamily),/DM Sans/,'restore chord names distinguish case');
 for(const [id,forbidden] of Object.entries(switches)){
  await page.uncheck('#'+id);await load(chart);
  for(let i=0;i<12;i++){
   await page.click('#generate');const s=await read(page);
   assert.ok(s.score.flatMap(b=>b.chords).every(c=>!forbidden.includes(c.morph?.technique)),'M02 disabled '+id);
  }
  await page.check('#'+id);
 }
 await page.check('#preserveBass');await load(chart);
 for(let i=0;i<12;i++){
  await page.click('#generate');
  assert.ok((await read(page)).score.flatMap(b=>b.chords).every(c=>!['inversion','ii-V','approach'].includes(c.morph?.technique)),'M03 preserve bass forbids inversion and ii–V');
 }
 await page.uncheck('#preserveBass');
 // A manual edit of the V half keeps the whole source region restorable.
 await load(chart);let replacement;
 for(let i=0;i<20;i++){
  await page.click('#generate');const s=await read(page);
  replacement=s.score.flatMap((b,bar)=>b.chords.map((c,chord)=>({bar,chord,morph:c.morph}))).find(c=>c.morph?.part==='V');
  if(replacement)break;
 }
 assert.ok(replacement,'ii–V restore fixture');
 await page.locator(`.chord-event[data-bar="${replacement.bar}"][data-chord="${replacement.chord}"]`).click();
 await page.locator('#editorRoots [data-root="0"]').click();await page.selectOption('#editQuality','m7');await page.click('#editorApply');
 const edited=await read(page),address=replacement.morph.source;
 await page.locator(`.bar[data-index="${address.bar}"] .morph-restores button`).first().click();
 assert.deepEqual((await read(page)).score[address.bar].chords,[edited.backbone.degrees[address.bar].chords[address.chord]],'restore entire edited ii–V source');
 await page.click('#undo');assert.deepEqual((await read(page)).score,edited.score);
 // Download via the actual SUSTAIN button while a short-note ARP is selected.
 await load('C:3 Dm7:1 | G7:2 Am:2');await page.selectOption('#pattern','arp');
 await page.locator('#performanceOptions').evaluate(e=>{e.open=true;});
 await page.selectOption('#midiSplit','merged');await page.selectOption('#midiPedal','off');
 const pending=page.waitForEvent('download');await page.click('#midiSustain');const download=await pending;
 assert.equal(await download.failure(),null);const file=path.join(output,'round5-sustain.mid');await download.saveAs(file);
 const bytes=await fs.readFile(file),{readMelodyMidi}=await import('../dist/melody-reference.js');
 const notes=readMelodyMidi(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).flatMap(t=>t.notes);
 const spans=[{beat:0,duration:3,pcs:[0,4,7]},{beat:3,duration:1,pcs:[2,5,9,0]},{beat:4,duration:2,pcs:[7,11,2,5]},{beat:6,duration:2,pcs:[9,0,4]}];
 assert.ok(notes.length>0,'M07 nonempty SUSTAIN');
 for(const n of notes){const span=spans.find(s=>Math.abs(s.beat-n.beat)<1/480);assert.ok(span,'M07 SUSTAIN starts at chord onset');assert.equal(n.duration,span.duration,'M07 SUSTAIN duration equals chord beats');assert.ok(span.pcs.includes(n.note%12),'MIDI pitches belong to chord');}
 for(const span of spans)assert.ok(notes.some(n=>n.beat===span.beat),'M07 every chord exported');
 await load(chart);await page.click('#generate');
 for(const width of [320,375,390]){
  await page.setViewportSize({width,height:667});await page.locator('#scoreTools').evaluate(e=>{e.open=true;});
  assert.ok(await page.locator('#compareA').isVisible(),'M11 mobile A visible');
  const select=await page.locator('#morphHistory').boundingBox();assert.ok(select&&select.x>=0&&select.x+select.width<=width-12,'R05-P2-02 bounded history '+width);
  assert.ok(await page.locator('#compareA').isVisible(),'M11 mobile A visible');
  await page.click('#compareA');const s=await read(page);assert.deepEqual(s.score,s.backbone.degrees,'M11 mobile A clickable');
  await page.click('#compareB');
  const markers=page.locator('#grid .morph-marker');assert.ok(await markers.count()>0);
  assert.ok(await markers.first().isVisible());assert.ok(await markers.first().locator('..').getAttribute('aria-label'));
 }
 await page.setViewportSize({width:667,height:375});
 const misses=await page.evaluate(()=>{const bad=[];for(let y=0;y<=document.documentElement.scrollHeight-innerHeight;y+=25){window.scrollTo(0,y);const e=document.getElementById('dockMorph'),r=e.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||!e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)))bad.push(y);}return bad;});
 assert.deepEqual(misses,[],'R05-P2-13 landscape MORPH');
 await page.setViewportSize({width:1440,height:1000});
 await page.click('#loopButton');const loop=await page.isChecked('#loop');await page.reload();await page.locator('.chord-event').first().waitFor();
 assert.equal(await page.isChecked('#loop'),loop);assert.equal(await page.getAttribute('#loopButton','aria-pressed'),String(loop));
 if(!loop)await page.click('#loopButton');
 console.log('PASS round 5: M02/M03/M07/M08/M11, MIDI pitches/durations, 3 mobile widths, landscape, LOOP persistence');
};
