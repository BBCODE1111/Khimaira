import test from 'node:test';
import assert from 'node:assert/strict';
import {performance,voicePlan} from '../dist/performance.js';
import {applyPianoPhrase,phraseProfiles,sparseVoices,renderTexture,pentatonicRun} from '../dist/piano-motion.js';
import {midiBytes} from '../dist/music.js';
import {midiControls} from '../packages/piano-motion/midi-test-reader.mjs';
import {pedalIntervals,pedalMidiEvents} from '../dist/piano-pedal.js';
const bars=Array.from({length:8},()=>({chords:[{symbol:'C',beats:4}]})),opts={human:0,pianoFills:'off',key:{root:0,mode:'major'}};
test('sparse voicing keeps the third and top; rhythm anchors survive light support',()=>{
 const group=[60,64,67,71].map(note=>({note}));assert.deepEqual(sparseVoices(group,{root:0}).map(n=>n.note),[64,71]);
 assert.deepEqual(sparseVoices(group,{root:2}).map(n=>n.note),[60,71]);
 for(const [id,anchors] of [['pianoBackbeat',[1,3]],['pianoKpop',[.75,2.75]],['pianoQuarter',[1,3]]]){
  const ns=performance(bars,id,{...opts,pianoPhrase:'space'}).filter(n=>n.part==='upper');
  for(let bar=0;bar<8;bar++)for(const a of anchors)assert.ok(ns.some(n=>Math.abs(n.beat-(bar*4+a))<.02),id+' '+a);
 }
 assert.equal(Object.keys(phraseProfiles).filter(id=>!phraseProfiles[id].anchors).length,0);
});
test('two opens with the written pattern and replies preserve held keys',()=>{
 const original=performance(bars,'pianoWhole',opts),two=performance(bars,'pianoWhole',{...opts,pianoPhrase:'two'});
 assert.deepEqual(two.filter(n=>n.beat<4),original.filter(n=>n.beat<4));
 const base=[{beat:4,note:60,duration:4,velocity:.6,role:'chords',articulation:'held'},{beat:4,note:64,duration:4,velocity:.6,role:'chords',articulation:'held'},{beat:4,note:67,duration:4,velocity:.6,role:'chords',articulation:'held'}];
 const out=applyPianoPhrase(base,[{beat:4,beats:4,notes:[36,60,64,67],root:0}],'pianoWhole',{pianoPhrase:'two',totalBeats:8});
 assert.ok(out.some(n=>n.articulation==='phrase'));assert.ok(out.filter(n=>n.articulation==='held').every(n=>n.duration===4));
});
test('triplet and pentatonic identities are in the body with decorative fills off',()=>{
 const tri=performance(bars,'textureTriplet',opts).filter(n=>n.part==='upper'&&n.beat<4);
 for(const beat of [3,3+1/3,3+2/3])assert.ok(tri.some(n=>Math.abs(n.beat-beat)<1e-6));
 const pen=performance(bars,'texturePentatonic',opts).filter(n=>n.part==='upper'&&[2.5,3].includes(n.beat));
 assert.equal(pen.length,2);assert.ok(pen.some(n=>![0,4,7].includes(n.note%12)));assert.ok(Math.abs(pen[0].note-pen[1].note)<=4);
 for(const key of [{root:0,mode:'major'},{root:9,mode:'minor'}])for(const down of [true,false])for(const target of [60,64,67,69,72]){
  const run=pentatonicRun(target,key,down);assert.equal(run.at(-1),target);assert.ok(run.slice(1).every((n,i)=>Math.abs(n-run[i])<=4));
 }
});
test('ballad rolls from the beat in 20 ms steps and short replies use seeded dynamics',()=>{
 for(const bpm of [60,72,120,180]){
  const notes=performance(bars,'pianoBallad',{...opts,bpm}).filter(n=>n.part==='upper'&&n.beat<1);
  assert.equal(notes[0].beat,0);for(let i=1;i<notes.length;i++)assert.ok(Math.abs((notes[i].beat-notes[i-1].beat)*60/bpm-.02)<1e-6);
 }
 const replies=performance(bars,'pianoWhole',{...opts,pianoPhrase:'four',human:.5}).filter(n=>n.articulation==='phrase');assert.ok(new Set(replies.map(n=>n.velocity)).size>1);
});
test('optional CC64 is off by default, changes 10 ticks around harmony, and is released at end',()=>{
 const chart=[{chords:[{symbol:'C',beats:4}]},{chords:[{symbol:'G',beats:4}]}],notes=performance(chart,'pianoHalf',opts),chordSpans=voicePlan(chart).map(c=>({start:c.beat,end:c.beat+c.beats,symbol:c.symbol}));
 assert.deepEqual(midiBytes(notes,8),midiBytes(notes,8,{pedal:false}));assert.equal(midiControls(midiBytes(notes,8)).controls.length,0);
 for(const split of [false,true]){
  const {ppq,controls}=midiControls(midiBytes(notes,8,{pedal:true,split,chordSpans}));
  assert.ok(controls.some(c=>c.tick===4*ppq-10&&c.value===0));assert.ok(controls.some(c=>c.tick===4*ppq+10&&c.value===127));assert.equal(controls.at(-1).value,0);
  if(split)assert.ok(controls.every(c=>c.channel===1));
 }
 const spans=pedalIntervals({chordSpans:[{start:0,end:4,symbol:'C'},{start:4,end:8,symbol:'N.C.'}],notes:[{start:0,end:1}],melody:[{start:2,end:3}],totalBeats:8});
 assert.ok(spans.every(s=>s.end<=4));assert.ok(pedalMidiEvents(spans,480).some(e=>e.tick===950&&e.bytes[2]===0));
});
