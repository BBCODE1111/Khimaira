import test from 'node:test';
import assert from 'node:assert/strict';
import {renderTexture,textureGrid,texturePatterns} from '../packages/piano-motion/motion.js';
import {performance} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
const ids=Object.keys(texturePatterns),mod=n=>(n%12+12)%12;
const plan=(bb=4)=>Array.from({length:4},(_,i)=>({beat:i*bb,beats:bb,notes:[36,60,64,67]}));
const fills=notes=>notes.filter(n=>n.fill),upper=notes=>notes.filter(n=>n.role==='chords');

test('course rhythms preserve real rests, dotted ratios and one sustained tied attack',()=>{
 assert.equal(ids.length,6);
 const opts={gate:.1,human:0,fillMode:'off'};
 const tied=upper(renderTexture(plan(),'textureTied',opts));
 assert.ok(tied.some(n=>n.beat===1.75&&n.duration===1.25));
 assert.ok(!tied.some(n=>n.beat===2));
 const space=upper(renderTexture(plan(),'textureSpace',opts));
 assert.ok(space.every(n=>n.beat>=3||n.beat+n.duration<1));
 const dotted=textureGrid('textureDotted');
 assert.deepEqual(dotted.filter(n=>n[0]>=1&&n[0]<2).map(n=>n.slice(0,2)),[[1,.75],[1.75,.25]]);
 const signatures=ids.map(id=>JSON.stringify(renderTexture(plan(),id,{fillMode:'off',human:0}).map(n=>[n.beat,n.note,n.duration])));
 assert.equal(new Set(signatures).size,6);
});

test('meter-specific pulses, exact triplets and split harmony never restart the whole pattern',()=>{
 for(const [bb,meter,bass] of [[4,{numerator:4,denominator:4},[0,2]],[3,{numerator:3,denominator:4},[0]],[3,{numerator:6,denominator:8},[0,1.5]]]){
  for(const id of ids){
   const notes=renderTexture(plan(bb),id,{barBeats:bb,meter,fillMode:'off',human:0});
   assert.deepEqual(notes.filter(n=>n.role==='bass'&&n.beat<bb).map(n=>n.beat),bass);
   assert.ok(notes.every(n=>n.duration>0&&n.beat+n.duration<=4*bb+1e-7));
  }
  const opts={barBeats:bb,meter,human:0,fillMode:'phrase'};
  const a=fills(renderTexture(plan(bb),'textureTriplet',{...opts,swing:0})),b=fills(renderTexture(plan(bb),'textureTriplet',{...opts,swing:.32}));
  assert.deepEqual(a,b);assert.equal(a.length,3);
  assert.ok(Math.abs((a[1].beat-a[0].beat)-(meter.denominator===8?.5:1/3))<1e-7);
 }
 const split=[{beat:.5,beats:1.75,notes:[36,60,64,67]},{beat:2.25,beats:1.75,notes:[38,62,65,69]},{beat:8,beats:4,notes:[41,60,65,69]}];
 for(const id of ids){const notes=renderTexture(split,id,{totalBeats:16,fillMode:'off'});
  assert.ok(notes.some(n=>n.beat===2.25&&n.role==='bass'));
  for(const n of notes){const s=split.find(s=>n.beat>=s.beat&&n.beat<s.beat+s.beats);assert.ok(s);assert.ok(n.beat+n.duration<=s.beat+s.beats+1e-7);}
 }
 const tied=renderTexture(split,'textureTied',{fillMode:'off'});
 assert.ok(tied.some(n=>n.beat===3.5));assert.ok(!tied.some(n=>n.beat===3.25));
 assert.equal(fills(renderTexture([{beat:0,beats:2.75,notes:[36,60,64,67]}],'textureTriplet')).length,0);
});

test('fills are true-gap responses; held, new-syllable and dense melody suppress them',()=>{
 for(const id of ids){
  assert.ok(fills(renderTexture(plan(),id)).length>0);
  for(const melody of [[{pitch:72,start:0,end:16}],[{pitch:72,start:15.9,end:17}],Array.from({length:8},(_,i)=>({pitch:60+i,start:12+i*.35,end:12+i*.35+.2}))]){
   const copy=structuredClone(melody);assert.equal(fills(renderTexture(plan(),id,{melody})).length,0);assert.deepEqual(melody,copy);
  }
  assert.equal(fills(renderTexture(plan(),id,{fillMode:'off'})).length,0);
 }
 const busy=Array.from({length:8},(_,i)=>({pitch:72+i,start:i*.5,end:i*.5+.4}));
 assert.ok(renderTexture(plan(),'textureBroken',{melody:busy,fillMode:'off'}).length<renderTexture(plan(),'textureBroken',{fillMode:'off'}).length);
});

test('all keys and both modes retain pentatonic/context gates, resolution and repeatable variation',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const notes=[36,60,mode==='major'?64:63,67].map(n=>n+root),p=plan().map(s=>({...s,notes})),key={root,mode};
  const pent=(mode==='major'?[0,2,4,7,9]:[0,3,5,7,10]).map(n=>mod(n+root));
  for(const id of ids){const opts={key,seed:13,human:.4},out=renderTexture(p,id,opts),f=fills(out);
   assert.deepEqual(out,renderTexture(p,id,opts));assert.ok(f.length);
   assert.ok(notes.map(mod).includes(mod(f.at(-1).note)),'land on current harmony');
   if(id==='texturePentatonic')assert.ok(f.every(n=>pent.includes(mod(n.note))));
   const last=new Map();for(const n of out){const previous=last.get(n.note);if(previous)assert.ok(previous.beat+previous.duration<=n.beat+1e-7);last.set(n.note,n);}
  }
 }
 const p=plan();p[3].notes=[36,60,64,68];
 for(const id of ids){const f=fills(renderTexture(p,id,{key:{root:0,mode:'major'}}));assert.ok(f.every(n=>[0,4,8].includes(mod(n.note))));}
 const a=fills(renderTexture(plan(),'textureTriplet',{seed:1})),b=fills(renderTexture(plan(),'textureTriplet',{seed:2}));assert.notDeepEqual(a.map(n=>n.note),b.map(n=>n.note));
 const next=[...plan(),{beat:16,beats:4,notes:[37,61,65,68]}],f=fills(renderTexture(next,'textureSpace',{key:{root:0,mode:'major'}})).filter(n=>n.beat<16);
 assert.equal(f.at(-1).note,60);assert.ok(f.at(-1).beat+f.at(-1).duration<=16);
});

test('Khimaira adapters retain charts, references, N.C. and all six selectable patterns',()=>{
 const bars=parseChart('| C | C | C | C |'),copy=structuredClone(bars);
 for(const id of ids){
  const base=performance(bars,id,{human:0,key:{root:0,mode:'major'}});assert.ok(base.length);assert.ok(fills(base).length);
  assert.equal(fills(performance(bars,id,{human:0,melodyText:'R:12 G5:4'})).length,0);
  assert.deepEqual(performance(bars,id,{human:0,key:{root:0,mode:'major'},melodyFollow:'off',melodyText:'G5:16'}),base);
  const silent=performance([...parseChart('| C | C | C |'),{chords:[]}],id,{human:0});assert.equal(fills(silent).length,0);assert.ok(silent.every(n=>n.beat+n.duration<=12));
 }assert.deepEqual(bars,copy);
});
