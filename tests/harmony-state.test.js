import test from 'node:test';import assert from 'node:assert/strict';
import {createHarmony,applyHarmonyAction as act,harmonyView,migrateHarmony,effectiveKey} from '../dist/harmony-state.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {examplesForKey} from '../dist/keyed-examples.js';
const view=s=>serialize(harmonyView(s).bars);
test('F input overrides stale AUTO C; G→D transposes both charts and GENERATE keeps that key',()=>{
 let f=createHarmony({text:'F | Dm | Bb | C'});assert.equal(f.key.root,5);const original=JSON.stringify(f.backbone);
 for(let i=0;i<8;i++){f=act(f,{type:'generate'});assert.equal(f.key.root,5);assert.equal(JSON.stringify(f.backbone),original);}
 let g=createHarmony({text:'G | Em | C | D'}),degrees=structuredClone(g.backbone.degrees);
 g=act(g,{type:'transpose',key:{root:2}});assert.equal(view(g),'| D:4 | Bm:4 | G:4 | A:4 |');assert.deepEqual(g.backbone.degrees,degrees);
 g=act(g,{type:'generate'});assert.equal(g.key.root,2);g=act(g,{type:'restore'});assert.equal(view(g),'| D:4 | Bm:4 | G:4 | A:4 |');
});
test('reinterpret preserves pitches while transpose preserves degrees; LOCKED input warns without retuning',()=>{
 const s=createHarmony({text:'Am | F | C | G',key:{root:0},locked:true});
 const r=act(s,{type:'reinterpret',key:{root:9,mode:'minor'}});assert.equal(view(r),view(s));assert.notDeepEqual(r.score,s.score);
 assert.deepEqual(r.backbone.originalDegrees,s.backbone.originalDegrees);assert.deepEqual(act(r,{type:'undo'}),s);
 const locked=act(s,{type:'load',text:'F | Dm | Bb | C'});assert.equal(locked.key.root,0);assert.equal(locked.warning.suggested.root,5);
 assert.equal(view(locked),'| F:4 | Dm:4 | Bb:4 | C:4 |');
 const auto=act(locked,{type:'auto'});assert.equal(auto.key.root,5);assert.equal(view(auto),view(locked));assert.equal(auto.keyMode,'auto');
});
test('EDIT preserves backbone; explicit example LOAD adopts it, MORPH/RESTORE preserve it; KEEP confirms',()=>{
 let s=createHarmony(),backbone=structuredClone(s.backbone);
 s=act(s,{type:'edit',bar:0,text:'Cmaj9'});assert.deepEqual(s.backbone,backbone);
 const example=examplesForKey(s.style,s.key)[0];
 const beforeLoad=structuredClone(s);s=act(s,{type:'example',id:example.id});assert.deepEqual(s.backbone.degrees,example.degrees);assert.deepEqual(act(s,{type:'undo'}),beforeLoad);assert.equal(s.key.mode,'major');
 s=act(s,{type:'generate'});const before=structuredClone(s);s=act(s,{type:'restore'});assert.deepEqual(s.score,s.backbone.degrees);assert.deepEqual(act(s,{type:'undo'}),before);
 assert.throws(()=>act(before,{type:'keep'}),/KEEP/);const kept=act(before,{type:'keep',confirmed:true});assert.deepEqual(kept.backbone.degrees,before.score);assert.deepEqual(act(kept,{type:'undo'}),before);
});
test('legacy migration preserves sounding score, original backbone and performance fields',()=>{
 const old={bars:parseChart('Gmaj7 | Em7 | C | D7'),sourceText:'F | Dm | Bb | C',key:0,mode:'major',pattern:'arp',arpSwing:16,arpGate:82};
 const saved=JSON.stringify(old),s=migrateHarmony(old);assert.equal(s.key.root,5);assert.equal(view(s),serialize(old.bars));assert.equal(JSON.stringify(old),saved);
 assert.deepEqual(migrateHarmony({harmony:s,key:11,bars:parseChart('B')}),s);
});
test('style change cannot silently convert major/minor, while modal identity is supplied by the style',()=>{
 let s=createHarmony();for(const style of ['Requiem','Minor blues','Dorian folk','Indian Yaman','Jazz']){
  s=act(s,{type:'style',style});assert.equal(s.key.root,0);assert.equal(s.key.mode,'major');
  if(style==='Dorian folk')assert.equal(effectiveKey(s).mode,'dorian');if(style==='Indian Yaman')assert.equal(effectiveKey(s).mode,'yaman');
 }
 assert.throws(()=>act(s,{type:'transpose',key:{root:0,mode:'minor'}}),/調式轉換/);
});
test('only LOCK locks: reinterpret, transpose and confirmed mode conversion retain AUTO/LOCK',()=>{
 for(const locked of [false,true]){
  const s=createHarmony({text:'C | Am | F | G',locked}),mode=locked?'locked':'auto';
  for(const action of [{type:'reinterpret',key:{root:9,mode:'minor'}},{type:'transpose',key:{root:5,mode:'major'}},{type:'convertMode',mode:'minor',confirmed:true}])assert.equal(act(s,action).keyMode,mode);
  const shifted=act(s,{type:'transpose',key:{root:5,mode:'major'}});
  assert.equal(act(shifted,{type:'style',style:'House'}).key.root,5);
  assert.equal(act(shifted,{type:'generate',options:{randomness:'low'}}).key.root,5);
  assert.equal(act(shifted,{type:'load',text:'Dm | G | C | A7'}).key.root,locked?5:0);
 }
});
