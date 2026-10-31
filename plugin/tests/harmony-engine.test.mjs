import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {createHarmony,applyHarmonyAction,harmonyView} from '../../dist/harmony-state.js';
import {styles} from '../../dist/style-engine.js';
import {serialize} from '../../dist/solutions.js';
import {performance,patterns} from '../../dist/performance.js';
import {midiSafeNotes} from '../native/midi-notes.js';
const root=fileURLToPath(new URL('../',import.meta.url)),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'khimaira-key-'));
function engine(product){
 const out=path.join(tmp,product+'.js');execFileSync(process.execPath,[path.join(root,'scripts/bundle-native.mjs'),product,out]);
 const context=vm.createContext({});vm.runInContext('delete Array.prototype.findLast',context);vm.runInContext(fs.readFileSync(out,'utf8'),context);
 return (action,state={},value,key)=>{context.request=JSON.stringify({action,state,value,key});const response=JSON.parse(vm.runInContext('nativeCall(request)',context));assert.ok(response.ok,response.message);return response.result;};
}
const native=engine('Khimaira'),seiren=engine('Seiren');
test.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
test('every non-ARP native pattern recalls old settings and renders the repaired website grid exactly',()=>{
 for(const pattern of Object.keys(patterns).filter(id=>!id.startsWith('arp')))for(const text of ['C:2 G:2 | Am F','C:2.125 G:1.875 | | Dm:1 A7:3'])for(const pianoRevision of [1,2]){
  const state={sourceText:text,pattern,pianoRevision,pianoPhrase:'original',pianoFills:'off',human:0,swing:0,gate:80,seed:17,bpm:137};
  const result=native('restore',state),s=result.ui;
  for(const field of ['pattern','pianoRevision','human','swing','gate','seed','bpm'])assert.equal(s[field],state[field]);
  const expected=midiSafeNotes(performance(s.bars,pattern,{...s,key:s.legacyRenderKey||{root:s.key,mode:s.mode},human:0,swing:0,gate:.8}));
  assert.deepEqual(result.notes,expected,pattern+' '+text+' revision '+pianoRevision);
  assert.deepEqual(native('restore',JSON.parse(JSON.stringify(s))).notes,result.notes,pattern+' repeated recall');
 }
});
test('bundled native engine and website API match every style, mutation, seed and a transposed backbone',()=>{
 let comparisons=0;
 for(const style of Object.keys(styles))for(const target of [5,2]){
  let ui=native('init').ui;ui=native('set',ui,'arp','pattern').ui;ui=native('set',ui,'F | Dm | Bb | C','sourceText').ui;ui=native('load',ui).ui;
  ui=native('lockKey',ui).ui;ui=native('set',ui,style,'style').ui;ui=native('set',ui,'arp','pattern').ui;ui=native('set',ui,target,'key').ui;
  let web=createHarmony({text:'F | Dm | Bb | C',key:{root:5,mode:'major'},style,locked:true});web=applyHarmonyAction(web,{type:'transpose',key:{root:target,mode:'major'}});
  for(const randomness of ['low','medium','high'])for(let i=0;i<5;i++){
   ui=native('set',ui,randomness,'randomness').ui;const result=native('generate',ui);ui=result.ui;
   web=applyHarmonyAction(web,{type:'generate',options:{randomness,length:4,density:ui.density}});
   assert.equal(serialize(ui.bars),serialize(harmonyView(web).bars),style+' '+randomness+' '+i);
   assert.deepEqual(ui.harmony.backbone,web.backbone);assert.equal(ui.key,target);comparisons++;
  }
 }
 assert.equal(comparisons,1470);
});
test('native state serializes degrees, retains draft and requested length, reloads identically, and supports Roman input',()=>{
 let ui=native('init').ui;ui=native('set',ui,5,'key').ui;
 ui=native('set',ui,'I | vi | IV | V','sourceText').ui;ui=native('set',ui,8,'length').ui;ui=native('set',ui,'low','randomness').ui;
 assert.equal(ui.sourceText,'I | vi | IV | V');assert.equal(ui.length,8);
 ui=native('load',ui).ui;assert.equal(serialize(ui.bars),'| F:4 | Dm:4 | Bb:4 | C:4 |');
 ui=native('set',ui,8,'length').ui;ui=native('set',ui,'arp','pattern').ui;ui=native('generate',ui).ui;assert.equal(ui.bars.length,4); // 1.0.5: filled backbone keeps its onset grid and bar count.
 const recalled=native('restore',JSON.parse(JSON.stringify(ui))).ui;
 assert.deepEqual(recalled.bars,ui.bars);assert.deepEqual(recalled.harmony,ui.harmony);assert.equal(recalled.key,5);
});
test('Seiren bundle retains its original state contract and does not receive the key redesign',()=>{
 let ui=seiren('init').ui;assert.equal(ui.harmony,undefined);ui=seiren('set',ui,'| C | Am | F | G |','sourceText').ui;
 ui=seiren('generate',ui).ui;assert.equal(ui.harmony,undefined);assert.equal(ui.key,0);assert.ok(ui.bars.length);
});
test('old state without source text uses its stored source/score rather than the default C backbone',()=>{
 const ui=native('init').ui;delete ui.harmony;delete ui.sourceText;
 ui.bars=[{chords:[{symbol:'F',beats:4}]},{chords:[{symbol:'Dm',beats:4}]},{chords:[{symbol:'Bb',beats:4}]},{chords:[{symbol:'C',beats:4}]}];
 const restored=native('restore',ui).ui;assert.equal(restored.key,5);assert.deepEqual(restored.bars,ui.bars);assert.equal(restored.sourceText,'| F:4 | Dm:4 | Bb:4 | C:4 |');
});
test('native major/minor example filters, LOAD and INSPIRE obey the selected key',()=>{
 for(const mode of ['major','minor']){
  let ui=native('init').ui;ui=native('set',ui,mode==='major'?'D | Bm | G | A':'Dm | Bb | Gm | A7','sourceText').ui;ui=native('load',ui).ui;
  ui=native('set',ui,2,'key').ui;let original=JSON.stringify(ui.harmony.backbone);
  for(const style of ['Jazz','Gospel','Gothic','House']){
   ui=native('set',ui,style,'style').ui;ui=native('set',ui,'arp','pattern').ui;
   const pool=native('examples',ui);if(style==='Gothic'&&mode==='major')assert.equal(pool.length,0);
   if(pool.length){ui=native('example',ui,pool[0].id).ui;assert.equal(ui.key,2);assert.equal(ui.mode,mode);assert.deepEqual(ui.harmony.backbone.degrees,ui.harmony.score);original=JSON.stringify(ui.harmony.backbone);}
   ui=native('inspire',ui,{kind:'fusion'}).ui;assert.equal(ui.key,2);assert.equal(ui.mode,mode);assert.equal(JSON.stringify(ui.harmony.backbone),original);
  }
 }
});

test('native AUTO modal transpose keeps displayed mode; draft survives and explicit conversion works in every tonic',()=>{
 for(const style of ['Dorian folk','Indian Yaman','Greek Hijaz'])for(let root=0;root<12;root++){
  let ui=native('init').ui;ui=native('set',ui,style,'style').ui;const mode=ui.tonality.mode;
  ui=native('set',ui,'I | V | I','sourceText').ui;ui=native('set',ui,root,'key').ui;
  assert.equal(ui.tonality.mode,mode);assert.equal(ui.harmony.key.mode,'major'); // Stored tonal parent differs from the displayed modal collection.assert.equal(ui.sourceText,'I | V | I');
  ui=native('transpose',ui,1).ui;assert.equal(ui.tonality.mode,mode);
 }
 for(let root=0;root<12;root++){
  let ui=native('init').ui;ui=native('set',ui,root,'key').ui;
  ui=native('convertMode',ui,{mode:'minor',confirmed:true}).ui;assert.equal(ui.mode,'minor');
  const b=ui.harmony.backbone;ui=native('generate',ui).ui;ui=native('restoreBackbone',ui).ui;assert.deepEqual(ui.harmony.score,b.degrees);
 }
});

test('website and bundled native share reported key fixes and contextual inversion/function labels',()=>{
 for(const text of ['Dm | G | C | A7','Dm7 | G7 | Cmaj7 | A7','C | E7 | Am | D7 | G7 | C','Cmaj7 | Am7 | D7 | G7','F#m7 | B7 | Emaj7 | C#7','Gmaj7/D | Am11/G | D7 | Gmaj7']){
  const web=createHarmony({text});let ui=native('init').ui;ui=native('set',ui,text,'sourceText').ui;ui=native('load',ui).ui;
  assert.deepEqual(ui.harmony.key,web.key,text);assert.deepEqual(ui.degreeLabels,harmonyView(web).degreeLabels,text);
  assert.deepEqual(native('restore',JSON.parse(JSON.stringify(ui))).ui.degreeLabels,ui.degreeLabels,text+' recall');
 }
});
test('modern genre selection upgrades only on selection; recall preserves legacy settings and labels',()=>{
 const old={sourceText:'C:2 G:2 | Am F',pattern:'house',human:27,swing:4,gate:63,seed:71};
 const recalled=native('restore',old);assert.equal(recalled.ui.genreRevision,1);assert.match(recalled.ui.performanceLabel,/Flowing/);
 for(const field of ['human','swing','gate','seed'])assert.equal(recalled.ui[field],old[field]);
 const chosen=native('set',recalled.ui,'house','pattern');assert.equal(chosen.ui.genreRevision,2);assert.equal(chosen.ui.swing,9);assert.match(chosen.ui.performanceLabel,/Offbeat/);
 for(const field of ['human','gate','seed'])assert.equal(chosen.ui[field],old[field]);
 assert.deepEqual(native('restore',chosen.ui).notes,chosen.notes);
 for(const pattern of ['house','classicHouse','techHouse','futureBass','progressiveDrop','tropicalHouse','garage','soul','rnb','lofi','neosoul']){
  const result=native('set',chosen.ui,pattern,'pattern'),s=result.ui;
  assert.deepEqual(result.notes,midiSafeNotes(performance(s.bars,pattern,{...s,key:s.legacyRenderKey||{root:s.key,mode:s.mode},human:s.human/100,swing:s.swing/100,gate:s.gate/100})),pattern);
 }
});
test('native tap edits use identical shared backbone actions, AUTO/LOCK and undo',()=>{
 let ui=native('init').ui;ui=native('lockKey',ui).ui;
 let web=createHarmony({locked:true});
 const edits=[{operation:'clearAll'},...['Dm7','G7','Cmaj7','Fmaj7'].map((symbol,bar)=>({operation:'select',bar,symbol})),{operation:'split',bar:2},{operation:'select',bar:2,chord:1,symbol:'C7'},{operation:'copy',bar:0},{operation:'move',bar:0,to:3},{operation:'quick',name:'卡農'}];
 for(const value of edits){ui=native('backboneEdit',ui,value).ui;web=applyHarmonyAction(web,{type:'backboneEdit',...value});assert.deepEqual(ui.harmony.backbone,web.backbone);assert.deepEqual(ui.bars,harmonyView(web).bars);assert.equal(ui.harmony.keyMode,'locked');assert.equal(ui.sourceText,harmonyView(web).sourceText);}
 ui=native('undo',ui).ui;web=applyHarmonyAction(web,{type:'undo'});assert.deepEqual(ui.bars,harmonyView(web).bars);
 ui=native('autoKey',ui).ui;ui=native('set',ui,5,'key').ui;assert.equal(ui.harmony.keyMode,'auto');
 ui=native('reinterpret',ui,{root:2,mode:'minor'}).ui;assert.equal(ui.harmony.keyMode,'auto');
});

test('native example LOAD clears stale input draft; MORPH, RESTORE and recall use the loaded backbone',()=>{
 let ui=native('init').ui;ui=native('set',ui,2,'key').ui;
 ui=native('set',ui,'C | unfinished','sourceText').ui;
 const p=native('examples',ui)[0];ui=native('example',ui,p.id).ui;
 assert.equal(ui.sourceDraft,undefined);const loaded=structuredClone(ui.bars),bone=structuredClone(ui.harmony.backbone);
 assert.equal(ui.sourceText,serialize(loaded));ui=native('generate',ui).ui;assert.deepEqual(ui.harmony.backbone,bone);
 ui=native('restoreBackbone',ui).ui;assert.deepEqual(ui.bars,loaded);
 assert.deepEqual(native('restore',JSON.parse(JSON.stringify(ui))).ui.bars,loaded);
 ui=native('set',ui,'IV | iii | ii | I','sourceText').ui;ui=native('generate',ui).ui;assert.equal(ui.sourceDraft,undefined);assert.match(ui.sourceText,/G:4/);
});

test('desktop exact chord actions preserve neighbours, durations and backbone',()=>{
 let ui=native('init').ui;ui=native('set',ui,'C:2 Am:2 | F | G | C','sourceText').ui;ui=native('load',ui).ui;
 const backbone=structuredClone(ui.harmony.backbone);
 ui=native('invert',ui,{bar:0,chord:1}).ui;
 assert.equal(ui.bars[0].chords[0].symbol,'C');assert.equal(ui.bars[0].chords[1].symbol,'Am/C');
 ui=native('parallel',ui,{bar:0,chord:1}).ui;assert.equal(ui.bars[0].chords[1].symbol,'A');
 ui=native('editChord',ui,{bar:0,chord:1,symbol:'Dm9'}).ui;assert.equal(ui.bars[0].chords[1].beats,2);
 ui=native('cadence',ui,{bar:1,chord:0,loop:true}).ui;assert.equal(ui.bars[2].chords[0].symbol,'G');assert.equal(ui.bars[1].chords.length,3);assert.equal(ui.bars[1].chords.reduce((n,c)=>n+c.beats,0),4);
 assert.deepEqual(ui.harmony.backbone,backbone);
 ui=native('undo',ui).ui;assert.equal(ui.bars[1].chords[0].symbol,'F');
});
test('desktop R02 history A/B and source restore use the same website state transitions',()=>{
 let ui=native('init').ui;ui=native('set',ui,'arp','pattern').ui;
 for(let i=0;i<8;i++)ui=native('generate',ui).ui;
 assert.ok(ui.harmony.morphHistory.length>0&&ui.harmony.morphHistory.length<=6);
 const before=structuredClone(ui.harmony);ui=native('compare',ui,'backbone').ui;
 assert.deepEqual(ui.harmony.score,ui.harmony.backbone.degrees);
 ui=native('compare',ui,0).ui;assert.deepEqual(ui.harmony.score,before.morphHistory[0].score);
 const traced=ui.harmony.score.flatMap(b=>b.chords).find(c=>c.morph?.source);assert.ok(traced);
 const expected=applyHarmonyAction(ui.harmony,{type:'restoreSource',source:traced.morph.source});
 ui=native('restoreSource',ui,traced.morph.source).ui;assert.deepEqual(ui.bars,harmonyView(expected).bars);
 assert.deepEqual(native('restore',JSON.parse(JSON.stringify(ui))).ui.harmony,ui.harmony);
});
