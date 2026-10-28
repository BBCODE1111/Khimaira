import test from 'node:test';import assert from 'node:assert/strict';
import {styles} from '../dist/style-engine.js';
import {examplePool} from '../dist/example-pool.js';
import {examplesForKey,exampleTonality} from '../dist/keyed-examples.js';
import {createHarmony,applyHarmonyAction as act,harmonyView,effectiveKey} from '../dist/harmony-state.js';
import {chartToDegrees} from '../dist/degree-chart.js';
import {parseChart,serialize} from '../dist/solutions.js';
test('all style examples filter major/minor and transpose exactly to each of 12 chosen tonics',()=>{
 let examples=0;
 for(const style of Object.keys(styles))for(const mode of ['major','minor'])for(let root=0;root<12;root++){
  const key={root,mode},pool=examplesForKey(style,key),original=examplePool(style);
  for(const p of pool){
   const source=original.find(x=>x.id===p.id),from=exampleTonality(source);
   assert.ok(from.mode===mode||from.mode===mode+'-blues',p.id+' '+from.mode+' in '+mode);
   assert.deepEqual(chartToDegrees(parseChart(p.chart),key),chartToDegrees(parseChart(source.chart),from));examples++;
  }
 }
 assert.ok(examples>1000);
});
test('selected key survives style, exact LOAD, alternating INSPIRE/fusion and GENERATE; backbone remains original',()=>{
 for(const mode of ['major','minor'])for(const style of Object.keys(styles)){
  let s=createHarmony({text:mode==='major'?'F | Dm | Bb | C':'Fm | Db | Bbm | C7',key:{root:5,mode},locked:true});
  const backbone=structuredClone(s.backbone),key=structuredClone(effectiveKey(s));s=act(s,{type:'style',style});assert.deepEqual(effectiveKey(s),key);
  const pool=examplesForKey(style,key);
  if(pool.length){
   s=act(s,{type:'example',id:pool[0].id});assert.equal(serialize(harmonyView(s).bars),serialize(parseChart(pool[0].chart)));assert.deepEqual(s.backbone,backbone);
   for(const kind of ['example','fusion']){const old=structuredClone(s);s=act(s,{type:'inspire',kind});assert.equal(s.origin.kind,kind);assert.deepEqual(effectiveKey(s),key);assert.deepEqual(s.backbone,backbone);assert.deepEqual(act(s,{type:'undo'}),old);}
  }else {s=act(s,{type:'inspire'});assert.equal(s.origin.kind,'backbone');assert.deepEqual(effectiveKey(s),key);assert.deepEqual(s.backbone,backbone);}
  s=act(s,{type:'generate'});assert.deepEqual(effectiveKey(s),key);assert.deepEqual(s.backbone,backbone);
 }
});
test('minor-only examples cannot be loaded into a major session; modal examples retain their declared mode',()=>{
 let s=createHarmony({key:{root:2,mode:'major'},locked:true,style:'Gothic'});
 assert.equal(examplesForKey('Gothic',s.key).length,0);assert.throws(()=>act(s,{type:'example',id:examplePool('Gothic')[0].id}),/不適用/);
 for(const style of ['Indian Yaman','Greek Hijaz','Celtic Dorian']){
  s=createHarmony({style});const key=effectiveKey(s),pool=examplesForKey(style,key);assert.ok(pool.length);
  for(const p of pool)assert.equal(p.mode,key.mode);
 }
});
