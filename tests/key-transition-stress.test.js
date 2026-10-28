import test from 'node:test';import assert from 'node:assert/strict';
import {createHarmony,applyHarmonyAction as act,harmonyView,effectiveKey,migrateHarmony} from '../dist/harmony-state.js';
import {parseDegreeChart,formatDegreeChart} from '../dist/degree-chart.js';
import {parse,mod} from '../dist/music.js';import {voicePlan} from '../dist/performance.js';
import {styles} from '../dist/style-engine.js';import {examplesForKey} from '../dist/keyed-examples.js';
const sig=s=>harmonyView(s).bars.map(b=>b.chords.map(c=>({root:parse(c.symbol).root,bass:parse(c.symbol).bass,pcs:parse(c.symbol).pcs,beats:c.beats})));
const corpus=['I/3 | V7/V/#4 | iv:2 bVImaj7:2 | V7b9','i | bVI | iiø7 | V7b9','Imaj9:2 vi7:2 | ii9 | V13 | I69','bIImaj7 | #iv°7 | V7alt | imaj7','I | | V7sus4 | I'];
test('4320 repeated transpose transitions preserve pitches, duration, degrees, recall and undo',()=>{
 let moves=0;
 for(const mode of ['major','minor'])for(let root=0;root<12;root++)for(const text of corpus){
  let s=createHarmony({text,key:{root,mode},locked:true});const original=structuredClone(s),initial=sig(s);
  for(let round=0;round<3;round++)for(let to=0;to<12;to++){
   const before=structuredClone(s),old=sig(s),delta=mod(to-s.key.root);s=act(s,{type:'transpose',key:{root:to,mode}});moves++;
   const shifted=sig(s);for(let b=0;b<old.length;b++)for(let c=0;c<old[b].length;c++){
    assert.equal(shifted[b][c].root,mod(old[b][c].root+delta));assert.equal(shifted[b][c].bass,mod(old[b][c].bass+delta));assert.equal(shifted[b][c].beats,old[b][c].beats);
    assert.deepEqual([...shifted[b][c].pcs].sort((a,b)=>a-b),old[b][c].pcs.map(n=>mod(n+delta)).sort((a,b)=>a-b));
   }
   assert.deepEqual(s.backbone,original.backbone);assert.deepEqual(act(s,{type:'undo'}),before.history.length<32?before:{...before,history:before.history.slice(1)});
   assert.deepEqual(parseDegreeChart(formatDegreeChart(s.score),s.key),s.score);
   s=migrateHarmony(JSON.parse(JSON.stringify({harmony:s})));
   for(const segment of voicePlan(harmonyView(s).bars))assert.ok(segment.notes.every(Number.isFinite));
  }
  s=act(s,{type:'transpose',key:{root,mode}});assert.deepEqual(sig(s),initial);assert.deepEqual(s.score,original.score);
 }
 assert.equal(moves,4320);
});
test('24 keys × 49 styles: mode conversion, transpose, all generation levels, examples, inspire, restore and recall',()=>{
 for(let root=0;root<12;root++)for(const from of ['major','minor']){
  const target=from==='major'?'minor':'major';let initial=createHarmony({text:from==='major'?'I | vi | IV | V7':'i | bVI | iv | V7',key:{root,mode:from},locked:true});
  const converted=act(initial,{type:'convertMode',mode:target,confirmed:true});assert.equal(converted.key.mode,target);assert.deepEqual(converted.backbone.originalDegrees,initial.backbone.degrees);
  for(const style of Object.keys(styles)){
   let s=act(converted,{type:'style',style});s=act(s,{type:'transpose',key:{root:(root+5)%12,mode:target}});let backbone=structuredClone(s.backbone);const key=structuredClone(s.key);
   for(const randomness of ['low','medium','high']){s=act(s,{type:'generate',options:{randomness}});assert.deepEqual(s.backbone,backbone);assert.deepEqual(effectiveKey(s),key);}
   const pool=examplesForKey(style,key);if(pool.length){s=act(s,{type:'example',id:pool[0].id});assert.deepEqual(s.score,pool[0].degrees);assert.deepEqual(s.backbone.degrees,s.score);backbone=structuredClone(s.backbone);}
   s=act(s,{type:'inspire'});assert.deepEqual(s.backbone,backbone);assert.deepEqual(effectiveKey(s),key);const before=structuredClone(s);
   s=act(s,{type:'restore'});assert.deepEqual(s.score,backbone.degrees);assert.deepEqual(act(s,{type:'undo'}),before);assert.deepEqual(migrateHarmony(JSON.parse(JSON.stringify({harmony:s}))),s);
  }
 }
});
test('all relative major/minor reinterpretations, AUTO, LOCKED input and KEEP restore',()=>{
 for(let root=0;root<12;root++){
  let s=createHarmony({text:'I | vi | IV | V7',key:{root,mode:'major'},locked:true});const pitches=sig(s),score=structuredClone(s.score);
  s=act(s,{type:'reinterpret',key:{root:mod(root+9),mode:'minor'}});assert.deepEqual(sig(s),pitches);assert.notDeepEqual(s.score,score);
  s=act(s,{type:'auto'});assert.equal(s.key.root,root);assert.equal(s.key.mode,'major');assert.deepEqual(sig(s),pitches);
  s=act(s,{type:'lock'});s=act(s,{type:'load',text:'F | Dm | Bb | C'});assert.equal(s.key.root,root);assert.equal(harmonyView(s).bars[0].chords[0].symbol,'F');
  s=act(s,{type:'generate'});const kept=structuredClone(s.score);s=act(s,{type:'keep',confirmed:true});s=act(s,{type:'transpose',key:{root:mod(root+2),mode:'major'}});s=act(s,{type:'generate'});s=act(s,{type:'restore'});assert.deepEqual(s.score,kept);
 }
});

test('every style/level generated score can convert major/minor before another transpose',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor'])for(const style of Object.keys(styles))for(const randomness of ['low','medium','high']){
  let s=createHarmony({text:mode==='major'?'I | vi | IV | V7':'i | bVI | iv | V7',key:{root,mode},locked:true,style});
  s=act(s,{type:'generate',options:{randomness}});s=act(s,{type:'convertMode',mode:mode==='major'?'minor':'major',confirmed:true});
  s=act(s,{type:'transpose',key:{root:(root+7)%12,mode:s.key.mode}});for(const bar of harmonyView(s).bars)for(const chord of bar.chords)assert.ok(parse(chord.symbol),chord.symbol);
 }
});
