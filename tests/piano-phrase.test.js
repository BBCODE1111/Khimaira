import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance,voicePlan} from '../dist/performance.js';
import {pianoPatterns} from '../dist/piano-patterns.js';
import {texturePatterns,applyPianoPhrase} from '../dist/piano-motion.js';
import {phraseCorpus} from '../packages/piano-motion/compatibility-corpus.mjs';
import {midiBytes} from '../dist/music.js';
import {readMelodyMidi} from '../dist/melody-reference.js';
const ids=Object.keys({...pianoPatterns,...texturePatterns});
const chart=Array.from({length:8},()=>({chords:[{symbol:'C',beats:4}]}));
const signature=notes=>notes.map(n=>[n.beat,n.note,n.duration]);
const opts={human:0,pianoFills:'off',key:{root:0,mode:'major'}};
test('all 18 original performances retain the deployed 2592-case event contract',()=>{
 const expected=JSON.parse(readFileSync(new URL('../packages/piano-motion/fixtures/khimaira-before-phrases.json',import.meta.url)));
 const meters=[[4,{numerator:4,denominator:4}]];
 assert.deepEqual(phraseCorpus(performance,ids,meters,{pianoRevision:1}),expected);
 assert.deepEqual(phraseCorpus(performance,ids,meters,{pianoPhrase:'original',pianoRevision:1}),expected);
});
test('each of 18 patterns offers three real phrase variations without changing the chart',()=>{
 assert.equal(ids.length,18);const before=structuredClone(chart);
 for(const id of ids){
  const all=['original','space','two','four'].map(pianoPhrase=>performance(chart,id,{...opts,pianoPhrase}));
  assert.equal(new Set(all.map(n=>JSON.stringify(signature(n)))).size,4,id);
  for(const pianoPhrase of ['space','two','four'])assert.deepEqual(performance(chart,id,{...opts,pianoPhrase}),performance(chart,id,{...opts,pianoPhrase}),id);
  assert.ok(all[1].length<all[0].length,id+' sparse');
  for(const notes of all.slice(1))assert.deepEqual(notes.filter(n=>n.part==='bass'),all[0].filter(n=>n.part==='bass'),id+' bass anchors');
 }assert.deepEqual(chart,before);
});
test('phrase variations preserve chord boundaries, rests, tied notes and same-key release',()=>{
 const bars=[{chords:[{symbol:'N.C.',beats:.5},{symbol:'C',beats:1.75},{symbol:'Dm7',beats:1.75}]},{chords:[]},{chords:[{symbol:'Fmaj7',beats:4}]},{chords:[{symbol:'G7',beats:4}]},{chords:[]}];
 for(const id of ids)for(const pianoPhrase of ['space','two','four']){
  const plan=voicePlan(bars),notes=performance(bars,id,{...opts,pianoPhrase});assert.ok(notes.length);
  const last=new Map;for(const n of notes){const c=plan.find(c=>n.beat>=c.beat-1e-7&&n.beat<c.beat+c.beats-1e-7);assert.ok(c,id);assert.ok(n.beat+n.duration<=c.beat+c.beats+1e-7,id);assert.ok(n.note>=21&&n.note<=108&&n.velocity>0&&n.velocity<=1);const previous=last.get(n.note);if(previous)assert.ok(previous.beat+previous.duration<=n.beat+1e-7,id);last.set(n.note,n);}
 }
 for(const pianoPhrase of ['space','two','four']){
  const space=performance(chart,'textureSpace',{...opts,pianoPhrase});assert.ok(space.filter(n=>n.part==='upper').every(n=>n.beat%4>=3||n.beat%4+n.duration<1));
  const tied=performance(chart,'textureTied',{...opts,pianoPhrase,gate:.1});assert.ok(!tied.some(n=>n.part==='upper'&&Math.abs(n.beat%4-2)<1e-7));assert.ok(tied.some(n=>n.beat%4===1.75&&n.duration===1.25));
 }
});
test('phrase answers respect melody gaps, keep FILLS off and survive reference protection',()=>{
 for(const id of ids)for(const pianoPhrase of ['two','four']){
  const occupied=performance(chart,id,{...opts,pianoPhrase,melodyText:'C5:32'});
  assert.ok(!occupied.some(n=>n.articulation==='phrase'&&n.beat<.75||n.fill),id);
  const sparse=performance(chart,id,{...opts,pianoPhrase,melodyText:'C5:1 R:31'});assert.ok(sparse.length);
  assert.ok(!sparse.some(n=>n.fill),id+' fills remain off');
  assert.deepEqual(performance(chart,id,{...opts,pianoPhrase,melodyFollow:'off',melodyText:'C5:32'}),performance(chart,id,{...opts,pianoPhrase}));
 }
});
test('all 18 phrase performances export matching MIDI pitch, onset and duration',()=>{
 for(const id of ids)for(const pianoPhrase of ['space','two','four']){
  const notes=performance(chart,id,{...opts,pianoPhrase}),bytes=midiBytes(notes,32,{split:true});
  const decoded=readMelodyMidi(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).flatMap(t=>t.notes).sort((a,b)=>a.beat-b.beat||a.note-b.note);
  assert.equal(decoded.length,notes.length);
  decoded.forEach((n,i)=>{assert.equal(n.note,notes[i].note);assert.ok(Math.abs(n.beat-notes[i].beat)<.003);assert.ok(Math.abs(n.duration-notes[i].duration)<.003);});
 }
});
test('phrase planner is pure, bounded on incomplete bars and ignores unsupported patterns',()=>{
 const plan=voicePlan(chart),base=performance(chart,'pianoHalf',opts),copy=structuredClone(base);
 for(const pianoPhrase of ['space','two','four','auto']){
  applyPianoPhrase(base,plan,'pianoHalf',{pianoPhrase});assert.deepEqual(base,copy);
  const short=[{beat:0,beats:2.75,notes:[36,60,64,67]}];const out=applyPianoPhrase([{beat:0,note:60,duration:2.75,velocity:.6,role:'chords'}],short,'pianoHalf',{pianoPhrase,totalBeats:2.75});assert.ok(out.every(n=>n.beat+n.duration<=2.75&&!['phrase','fill'].includes(n.articulation)));
 }assert.deepEqual(performance(chart,'jazz',{...opts,pianoPhrase:'four'}),performance(chart,'jazz',opts));
});
