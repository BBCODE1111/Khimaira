import test from 'node:test';import assert from 'node:assert/strict';
import {createHarmony,applyHarmonyAction as act,harmonyView,effectiveKey} from '../dist/harmony-state.js';
import {serialize} from '../dist/solutions.js';
const text=s=>serialize(harmonyView(s).bars).replaceAll(':4','');
test('explicit mode conversion maps diatonic functions, retains V, borrowed/applied chords and original backbone',()=>{
 const s=createHarmony({text:'C | Dm | Em | F | G7 | Am | Bdim | D7/F# | Fm | Bb',locked:true});
 assert.throws(()=>act(s,{type:'convertMode',mode:'minor'}),/確認/);
 const m=act(s,{type:'convertMode',mode:'minor',confirmed:true});
 assert.equal(text(m),'| Cm | Dm7b5 | Eb | Fm | G7 | Ab | Bb | D7/F# | Fm | Bb |');
 assert.deepEqual(m.backbone.originalDegrees,s.backbone.originalDegrees);assert.deepEqual(m.backbone.enteredKey,s.backbone.enteredKey);
 assert.deepEqual(act(m,{type:'undo'}),s);
 const major=act(createHarmony({text:'Cm | Dm7b5 | Eb | Fm | G7 | Ab | Bb | Db | E7/G#',key:{root:0,mode:'minor'},locked:true}),{type:'convertMode',mode:'major',confirmed:true});
 assert.equal(text(major),'| C | Dm7 | Em | F | G7 | Am | G | Db | E7/G# |');
});
test('mode conversion preserves inversion roles and non-chord pedals across all tonics',()=>{
 for(let root=0;root<12;root++){
  const c=createHarmony({text:'I/3 | ii7/4 | iii/5 | IV/6 | V7/7 | vi/1 | vii°/2 | I/b2',key:{root,mode:'major'},locked:true});
  const m=act(c,{type:'convertMode',mode:'minor',confirmed:true});
  const expected=createHarmony({text:'i/b3 | iiø7/4 | bIII/5 | iv/b6 | V7/7 | bVI/1 | bVII/2 | i/b2',key:{root,mode:'minor'},locked:true});
  assert.deepEqual(m.score,expected.score);
  const generated=act(m,{type:'generate'});assert.equal(generated.key.mode,'minor');assert.deepEqual(act(generated,{type:'restore'}).score,m.backbone.degrees);
 }
});
test('locking or transposing an AUTO modal style keeps the visible mode',()=>{
 const s=act(createHarmony(),{type:'style',style:'Dorian folk'});
 assert.equal(effectiveKey(s).mode,'dorian');
 assert.equal(effectiveKey(act(s,{type:'lock'})).mode,'dorian');
 assert.equal(effectiveKey(act(s,{type:'transpose',key:{root:2,mode:'dorian'}})).mode,'dorian');
});

test('generated 6/9 chords and harmonic-minor tonic extensions convert into supported qualities',()=>{
 const major=createHarmony({text:'C69/E | Am7 | F69/A | G7',locked:true});
 const minor=act(major,{type:'convertMode',mode:'minor',confirmed:true});
 assert.equal(text(minor),'| Cm6(9)/Eb | Abmaj7 | Fm6(9)/Ab | G7 |');
 assert.equal(text(act(minor,{type:'convertMode',mode:'major',confirmed:true})),text(major));
 const harmonic=createHarmony({text:'CmMaj7 | Fm | Dm7b5 | G7',key:{root:0,mode:'minor'},locked:true});
 assert.equal(text(act(harmonic,{type:'convertMode',mode:'major',confirmed:true})),'| Cmaj7 | F | Dm7 | G7 |');
});
