import test from 'node:test';import assert from 'node:assert/strict';
import {createHarmony,applyHarmonyAction,harmonyView} from '../dist/harmony-state.js';
import {chordChoices,extraChordChoices,editBackbone} from '../dist/chord-input.js';
import {serialize} from '../dist/solutions.js';
import {normalizeKey,materializeChart} from '../dist/degree-chart.js';
const act=(s,operation,extra={})=>applyHarmonyAction(s,{type:'backboneEdit',operation,...extra});
test('no-text chord choices enter both acceptance charts including split major seventh to dominant',()=>{
 let s=act(createHarmony({locked:true}),'clearAll');
 for(const [bar,symbol] of ['C','G','Am','F'].entries())s=act(s,'select',{bar,symbol});
 assert.equal(serialize(harmonyView(s).bars),'| C:4 | G:4 | Am:4 | F:4 |');
 for(const [bar,symbol] of ['Dm7','G7','Cmaj7','Fmaj7'].entries())s=act(s,'select',{bar,symbol});
 s=act(s,'split',{bar:2});s=act(s,'select',{bar:2,chord:1,symbol:'C7'});
 assert.equal(serialize(harmonyView(s).bars),'| Dm7:4 | G7:4 | Cmaj7:2 C7:2 | Fmaj7:4 |');
 const bone=structuredClone(s.backbone);s=applyHarmonyAction(s,{type:'generate'});assert.deepEqual(s.backbone,bone);
 s=applyHarmonyAction(s,{type:'restore'});assert.deepEqual(s.score,bone.degrees);
});
test('backbone edits reanalyse only in AUTO and retain pitches, while LOCK warns',()=>{
 for(const locked of [false,true]){
  let s=createHarmony({locked,text:'F | Dm | Bb | C'});s=act(s,'select',{bar:0,symbol:'Fmaj7'});
  assert.equal(s.key.root,locked?0:5);assert.equal(harmonyView(s).bars[0].chords[0].symbol,'Fmaj7');assert.equal(s.keyMode,locked?'locked':'auto');
 }
});
test('clear, copy, swap, split, quick chips and undo preserve complete bars and settings',()=>{
 let s=createHarmony({locked:true});const original=structuredClone(s);
 for(const operation of [{operation:'clear',bar:1},{operation:'copy',bar:0},{operation:'move',bar:0,to:3},{operation:'split',bar:2},{operation:'quick',name:'卡農'}]){
  const next=act(s,operation.operation,operation);assert.equal(next.keyMode,'locked');assert.equal(next.style,s.style);
  const undo=applyHarmonyAction(next,{type:'undo'});assert.deepEqual(undo,s);s=next;
 }
 assert.equal(s.score.length,8);assert.equal(original.score.length,4);
 assert.throws(()=>editBackbone(harmonyView(s).bars,{operation:'select',bar:-1,symbol:'C'},s.key));
 assert.throws(()=>editBackbone(harmonyView(s).bars,{operation:'select',bar:0,chord:9,symbol:'C'},s.key));
});
test('diatonic, seventh, secondary, borrowed and inversion choices remain valid through all keys',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor','dorian','phrygian','lydian','mixolydian']){
  const key=normalizeKey({root,mode}),s=createHarmony({key,locked:true,text:'I'});
  assert.equal(chordChoices(key).length,7);
  for(const c of [...chordChoices(key),...extraChordChoices(key)]){
   const next=act(s,'select',{symbol:c.symbol});assert.equal(materializeChart(next.backbone.degrees,key)[0].chords[0].symbol,c.symbol);
  }
 }
});

test('incomplete AUTO tap input keeps the palette stable until a complete phrase or strong cadence',()=>{
 let s=act(createHarmony(),'clearAll');
 for(const [bar,symbol] of ['F','G','Em','Am'].entries()){
  s=act(s,'select',{bar,symbol});assert.equal(s.keyMode,'auto');
  if(bar<3){assert.equal(s.key.root,0);assert.ok(chordChoices(s.key).some(c=>c.symbol==='G'));}
 }
 assert.ok(s.key.root===0||s.key.root===9);assert.equal(serialize(harmonyView(s).bars),'| F:4 | G:4 | Em:4 | Am:4 |');
 s=act(createHarmony(),'clearAll');for(const [bar,symbol] of ['Gm7','C7','Fmaj7'].entries())s=act(s,'select',{bar,symbol});assert.equal(s.key.root,5);
});
