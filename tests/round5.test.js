import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTheory} from '../packages/music-core/core.js';
import {createHarmony,applyHarmonyAction,harmonyView} from '../dist/harmony-state.js';
import {mutate} from '../dist/style-engine.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {encodeSession,decodeSession} from '../dist/session-codec.js';
import {readSession} from '../dist/session-storage.js';
const generate=(s,options={})=>applyHarmonyAction(s,{type:'generate',options:{randomness:'high',density:3,...options}});

test('R05-P2-09 six Khimaira aliases have exact intervals; Seiren acceptance unchanged',()=>{
 const k=createTheory('khimaira-v1'),s=createTheory('seiren-v1');
 for(const [symbol,intervals] of Object.entries({'Am7-5':[0,3,6,10],Cm69:[0,3,7,9,14],Cmi7:[0,3,7,10],C13sus4:[0,5,7,10,14,21],G7sus4b9:[0,5,7,10,13],Cmadd11:[0,3,7,17]})){
  assert.deepEqual(k.parse(symbol)?.intervals,intervals,symbol);assert.equal(s.parse(symbol),null,symbol);
 }
 assert.equal(k.parse('H7'),null);
});
test('R05-P2-06 LOCK → AUTO keeps six A/B entries when key is unchanged',()=>{
 let s=createHarmony();for(let i=0;i<8;i++)s=generate(s);
 assert.equal(s.morphHistory.length,6);const before=structuredClone(s);
 s=applyHarmonyAction(applyHarmonyAction(s,{type:'lock'}),{type:'auto'});
 assert.deepEqual(s.morphHistory,before.morphHistory);assert.equal(s.compareIndex,before.compareIndex);assert.deepEqual(s.score,before.score);
 let wrong=createHarmony({locked:true,key:{root:2,mode:'major'}});wrong=generate(wrong);wrong=applyHarmonyAction(wrong,{type:'auto'});
 assert.equal(wrong.warning.type,'history-cleared');assert.equal(wrong.morphHistory.length,0);
});
test('R05-P2-05 parallel-only uses two eligible slots on every Jazz high seed',()=>{
 const source=parseChart('C | Am | F | G');
 for(let seed=1;seed<=60;seed++){
  const bars=mutate(source,{style:'Jazz',seed,randomness:'high',freedom:'morph',density:2,tonality:{root:0,mode:'major'},techniques:{inversion:false,parallel:true,iiV:false}});
  assert.equal(bars.flatMap(b=>b.chords).filter(c=>c.morph?.technique==='parallel').length,2,'seed '+seed);
 }
});
test('R05-P2-10 manual pitch edit retains source region, restore and undo',()=>{
 let s=createHarmony({text:'C | Am | Em | F | G | C'}),slot;
 for(let seed=1;seed<40;seed++){s=generate(s,{seed});slot=harmonyView(s).bars.flatMap((b,bar)=>b.chords.map((c,chord)=>({bar,chord,c}))).find(x=>x.c.morph?.part==='V');if(slot)break;}
 assert.ok(slot);const address=slot.c.morph.source,bars=harmonyView(s).bars;
 bars[slot.bar].chords[slot.chord].symbol='Cm7';bars[slot.bar].chords[slot.chord].morph={source:address,technique:'manual'};
 s=applyHarmonyAction(s,{type:'replaceScore',bars});const edited=structuredClone(s);
 s=applyHarmonyAction(s,{type:'restoreSource',source:address});
 assert.deepEqual(s.score[address.bar].chords,[s.backbone.degrees[address.bar].chords[address.chord]]);
 assert.deepEqual(applyHarmonyAction(s,{type:'undo'}).score,edited.score);
 // Text edits with unchanged onsets/durations retain the same restoration region.
 const text=bars[slot.bar].chords.map(c=>c.symbol+':'+c.beats).join(' ');
 const typed=applyHarmonyAction(edited,{type:'edit',bar:slot.bar,text});
 assert.doesNotThrow(()=>applyHarmonyAction(typed,{type:'restoreSource',source:address}));
 const moved=structuredClone(edited);moved.score[address.bar].chords[0].beats-=.5;
 assert.throws(()=>applyHarmonyAction(moved,{type:'restoreSource',source:address}),/時值/);
});
test('R05-P2-15 empty and all-rest MORPH is an idea; RESTORE preserves rests',()=>{
 for(const text of ['N.C.','N.C. | N.C. | N.C. | N.C.']){
  const initial=createHarmony({text});const idea=generate(initial,{length:4});assert.equal(idea.origin.type,'idea');assert.deepEqual(applyHarmonyAction(idea,{type:'restore'}).score,initial.score);
 }
});
test('R05-P2-16 low colour tries another eligible slot, modal low explicitly retains colour',()=>{
 let unchanged=0;
 for(let seed=1;seed<=100;seed++){
  const source=parseChart('C | Am | F | G');
  const output=mutate(source,{style:'Jazz',seed,randomness:'low',tonality:{root:0,mode:'major'}});
  if(serialize(output)===serialize(source))unchanged++;
 }
 assert.equal(unchanged,0);
 const source=parseChart('Am | D | Am | D');
 for(let seed=1;seed<=10;seed++)assert.equal(serialize(mutate(source,{style:'Celtic Dorian',seed,randomness:'low',tonality:{root:7,mode:'dorian'}})),serialize(source));
});
test('R05-P2-17 45 MORPHs at 16 bars save below 500KB and retain all undo/A/B data',()=>{
 let s=createHarmony({text:Array(4).fill('C | Am | F | G').join(' | ')});
 for(let i=0;i<45;i++)s=generate(s);
 const saved={harmony:s},raw=encodeSession(saved);assert.ok(Buffer.byteLength(raw)<500000,Buffer.byteLength(raw)+' bytes');
 const restored=decodeSession(JSON.parse(raw));assert.deepEqual(restored,saved);
 const session=readSession({getItem:key=>key==='khimaira-v5'?raw:null,setItem(){throw Error('unexpected backup');}});
 assert.equal(session.message,'');assert.deepEqual(session.harmony,s);
 // Pooling must never alias mutable score/backbone/history objects in memory.
 const beforeEdit=structuredClone(session.harmony);
 const edit=applyHarmonyAction(session.harmony,{type:'edit',bar:0,text:'Dm7'});
 assert.deepEqual(applyHarmonyAction(edit,{type:'undo'}),beforeEdit.history.length===32?{...beforeEdit,history:beforeEdit.history.slice(1)}:beforeEdit);
 const isolated=decodeSession(JSON.parse(raw));isolated.harmony.history.at(-1).backbone.degrees[0].chords[0].beats=1;
 assert.equal(isolated.harmony.backbone.degrees[0].chords[0].beats,4);
 let a=s,b=session.harmony;
 while(a.history.length){a=applyHarmonyAction(a,{type:'undo'});b=applyHarmonyAction(b,{type:'undo'});assert.deepEqual(b,a);}
 assert.deepEqual(decodeSession(saved),saved);
 assert.throws(()=>decodeSession({harmony:{history:[{ref:0}]},undoPool:{version:1,values:[{loop:{ref:0}}]}}),/reference/);
 console.log('R05 storage bytes:',Buffer.byteLength(raw),'unpooled:',Buffer.byteLength(JSON.stringify(saved)));
});
test('R05-P2-12/14 release status and documented 16-bar product limit',()=>{
 const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8'),version=JSON.parse(readFileSync(new URL('../dist/version.json',import.meta.url)));
 assert.equal(version.version,'1.0.8');assert.equal(version.channel,'release-candidate');
 assert.match(readme,/已發布.*1\.0\.7.*web-v1\.0\.7/);assert.match(readme,/1\.0\.8 待發布/);assert.match(readme,/最多 16 小節/);
 assert.throws(()=>createHarmony({text:Array(17).fill('C').join(' | ')}),/16/);
});
