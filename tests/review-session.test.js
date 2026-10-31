import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarmony,applyHarmonyAction as act,effectiveKey,harmonyView,migrateHarmony} from '../dist/harmony-state.js';
import {styles} from '../dist/style-engine.js';
import {examplesForKey} from '../dist/keyed-examples.js';
import {readSession} from '../dist/session-storage.js';
import {serialize} from '../dist/solutions.js';

test('all 21 modal styles project colour without polluting the tonal key through transpose, LOCK and Jazz',()=>{
 const modal=Object.keys(styles).filter(style=>styles[style].world||['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(style));
 assert.equal(modal.length,21);
 for(const style of modal)for(const mode of ['major','minor'])for(const locked of [false,true]){
  let s=createHarmony({style,key:{root:0,mode},locked,text:mode==='minor'?'i | iv | V | i':'I | IV | V | I'});
  const keyMode=s.keyMode;
  s=act(s,{type:'transpose',key:{root:1,mode:effectiveKey(s).mode}});
  assert.equal(s.key.mode,mode,style);assert.equal(s.keyMode,keyMode);
  const transposed=structuredClone(s);
  s=act(s,{type:'lock'});assert.equal(s.key.mode,mode);assert.equal(s.keyMode,'locked');
  assert.equal(effectiveKey(s).mode,effectiveKey(transposed).mode);
  assert.deepEqual(act(s,{type:'undo'}),transposed);
  s=act(s,{type:'style',style:'Jazz'});
  assert.equal(effectiveKey(s).root,1);assert.equal(effectiveKey(s).mode,mode);
  assert.ok(examplesForKey('Jazz',effectiveKey(s)).length,style);
 }
});

test('modal save migration repairs current and undo keys without changing score, spelling or pitches',()=>{
 for(const mode of ['major','minor']){
  let s=createHarmony({text:'I | vi | IV | V',key:{root:0,mode},locked:true});
  s=act(s,{type:'transpose',key:{root:1,mode}});
  const expected=harmonyView(s).bars;
  s.key.mode='dorian';s.history[0].key.mode='hijaz';
  const raw=JSON.stringify(s),repaired=migrateHarmony({harmony:s});
  assert.equal(repaired.key.mode,mode);assert.equal(repaired.history[0].key.mode,mode);
  assert.deepEqual(harmonyView(repaired).bars,expected);
  assert.deepEqual(repaired.score,s.score);assert.deepEqual(repaired.backbone.degrees,s.backbone.degrees);
  assert.equal(JSON.stringify(s),raw);
 }
});

function storage(raw,key='khimaira-v5'){
 const values=new Map(raw===undefined?[]:[[key,raw]]);
 return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
}
test('invalid JSON, chord, style, schema, score and undo snapshots are backed up verbatim before fallback',()=>{
 const bad=createHarmony();bad.history=[{...structuredClone(bad),style:'Nope'}];
 const invalid=[
  '{broken','null','[]',JSON.stringify({bars:[{symbol:'H7'}],style:'Jazz'}),
  JSON.stringify({bars:[{symbol:'C'}],style:'Nope'}),
  JSON.stringify({harmony:{schema:99}}),JSON.stringify({harmony:bad}),
  JSON.stringify({harmony:{...createHarmony(),score:[]}}),
  JSON.stringify({harmony:{...createHarmony(),score:[{chords:[{degree:1,quality:'',alteration:0,beats:-4}]}]}})
 ];
 for(const raw of invalid){
  const db=storage(raw),result=readSession(db,()=>123);
  assert.equal(db.getItem('khimaira-corrupt-123'),raw);
  assert.equal(db.getItem('khimaira-v5'),raw);
  assert.equal(result.saved,null);assert.equal(result.canSave,true);
  assert.equal(serialize(harmonyView(result.harmony).bars),'| C:4 | Am:4 | F:4 | G:4 |');
 }
});
test('backup collisions preserve both originals and failed backup disables all session writes',()=>{
 const db=storage('{bad');db.setItem('khimaira-corrupt-123','previous');
 readSession(db,()=>123);
 assert.equal(db.getItem('khimaira-corrupt-123'),'previous');assert.equal(db.getItem('khimaira-corrupt-123-1'),'{bad');
 db.setItem=()=>{throw Error('quota');};
 const result=readSession(db,()=>123);assert.equal(result.canSave,false);assert.equal(db.getItem('khimaira-v5'),'{bad');
 assert.match(result.message,/不會覆寫/);
});
test('valid v3/v4/v5 sessions migrate without quarantine and preserve performance fields',()=>{
 for(const key of ['khimaira-v3','khimaira-v4','khimaira-v5']){
  const saved=key==='khimaira-v5'?{harmony:createHarmony(),tempo:101}:{bars:[{symbol:'C'}],style:'Jazz',tempo:101};
  const db=storage(JSON.stringify(saved),key),result=readSession(db);
  assert.equal(result.saved.tempo,101);assert.equal(db.values.size,1);assert.equal(result.message,'');
 }
});
test('editing a MORPH passing chord changes only that slot; RESTORE and UNDO retain both versions',()=>{
 const original=createHarmony();
 const morphed=act(original,{type:'generate',options:{randomness:'high',density:3,seed:1}});
 const bars=harmonyView(morphed).bars;
 assert.ok(bars[0].chords.length>1);
 const expected=structuredClone(bars);expected[0].chords[1].symbol='Em';
 const edited=act(morphed,{type:'replaceScore',bars:expected});
 assert.deepEqual(harmonyView(edited).bars,expected);assert.deepEqual(edited.backbone,original.backbone);
 assert.deepEqual(edited.key,morphed.key);assert.deepEqual(act(edited,{type:'undo'}),morphed);
 assert.deepEqual(act(edited,{type:'restore'}).score,original.score);
});
