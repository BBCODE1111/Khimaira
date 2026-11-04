import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,chordTones,keyName,mod,analyzeHarmony} from '../dist/music.js';
import {parseDegreeChart,formatDegreeChart,materializeChart,chartToDegrees} from '../dist/degree-chart.js';
import {convertDegreeMode} from '../dist/mode-conversion.js';
import {mutate,styles} from '../dist/style-engine.js';
import {voicePlan} from '../dist/performance.js';
const sound=bars=>bars.map(b=>b.chords.map(c=>{const p=parse(c.symbol);assert.ok(p,c.symbol);return {root:p.root,bass:p.bass,pcs:[...p.pcs].sort((a,b)=>a-b),beats:c.beats};}));

test('explicit simultaneous alterations survive token order in all 12 roots',()=>{
 const cases=[['7(b9,#9)',[0,4,7,10,13,15]],['7(#9,b9)',[0,4,7,10,13,15]],['7(b5,#5)',[0,4,6,8,10]],['7(#5,b5)',[0,4,6,8,10]],['9(b9,#9)',[0,4,7,10,13,15]],['7(b9,#9,no5)',[0,4,10,13,15]],['13(b13,13)',[0,4,7,10,14,20,21]]];
 for(let root=0;root<12;root++)for(const [q,expected] of cases){const c=parse(keyName(root)+q);assert.deepEqual(c.intervals,expected,c.symbol);}
 assert.deepEqual(chordTones('F7(b9,#9)'),['F','A','C','Eb','Gb','G#']);
 assert.deepEqual(chordTones('D7(b5,#5)'),['D','F#','Ab','A#','C']);
 for(const voicing of ['close','open','rootless']){
  const notes=voicePlan([{symbol:'F7(b9,#9)'}],{voicing})[0].notes.map(n=>mod(n-5));
  for(const pitch of [4,10,1,3])assert.ok(notes.includes(pitch),`${voicing} must sound third, seventh and both ninths`);
 }
});
test('diminished sevenths retain seventh-letter spelling with added tones',()=>{
 for(const [symbol,expected] of [['Bdim7(9)',['B','D','F','Ab','C#']],['Cdim7(11)',['C','Eb','Gb','Bbb','F']],['F#dim7(9,11)',['F#','A','C','Eb','G#','B']],['Abdim7(9)',['Ab','Cb','Ebb','Gbb','Bb']]])assert.deepEqual(chordTones(symbol),expected,symbol);
 assert.deepEqual(chordTones('Cm6(9)'),['C','Eb','G','A','D'],'sixth chord must still use A');
});
test('Roman copy and reload preserves diminished extensions, half-diminished extensions and rests in all keys',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const key={root,mode},source=parseDegreeChart('Cdim7(9)/Bbb:2 Bm7b5(11):2 | N.C. | G7(b9,#9) | C',key);
  const text=formatDegreeChart(source,key),copy=parseDegreeChart(text,key);
  assert.deepEqual(copy,source,text);assert.ok(text.includes('N.C.'));
  const labels=analyzeHarmony(materializeChart(source,key),key).events;
  assert.match(labels[0].label,/°7\(9\)/);assert.match(labels[1].label,/ø7\(11\)/);
 }
});
test('mode conversion preserves explicit extensions and inversion roles without reclassifying diminished quality',()=>{
 const cases=[['Dm9/A','major','Dm7b5(9)/Ab'],['Dm6(9)/E','major','Dm7b5(9)/E'],['Dm11/C','major','Dm7b5(9,11)/C'],['Dm13/B','major','Dm7b5(9,11,13)/B'],['Cm(11)/Eb','minor','C(11)/E'],['Dm7b5(9,11)/Ab','minor','Dm7(9,11)/A'],['Cm7b5(11)/Bb','minor','Cm7b5(11)/Bb']];
 for(const [input,from,expected] of cases){
  const source=parseDegreeChart(input),original=structuredClone(source),out=convertDegreeMode(source,from,from==='major'?'minor':'major');
  assert.equal(materializeChart(out)[0].chords[0].symbol,expected);assert.deepEqual(source,original);
 }
});
test('extended formulas transpose through 12 × 12 keys, preserving pitches, basses and Roman reload',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const key={root,mode},degrees=parseDegreeChart('I7(b9,#9)/3 | vii°7(9)/b6 | iiø7(11)/4 | N.C.',key),before=sound(materializeChart(degrees,key));
  for(let to=0;to<12;to++){
   const target={root:to,mode},moved=materializeChart(degrees,target),actual=sound(moved),delta=to-root;
   for(let b=0;b<before.length;b++)for(let i=0;i<before[b].length;i++){
    const a=actual[b][i],s=before[b][i];assert.equal(a.root,mod(s.root+delta));assert.equal(a.bass,mod(s.bass+delta));assert.deepEqual(a.pcs,s.pcs.map(p=>mod(p+delta)).sort((a,b)=>a-b));assert.equal(a.beats,s.beats);
   }
   assert.deepEqual(parseDegreeChart(formatDegreeChart(degrees,target),target),degrees);
  }
 }
});
test('49 styles × 24 keys × 3 levels × 3 seeds retain sound through Roman copy and mode conversion',()=>{
 let cases=0;
 for(const style of Object.keys(styles))for(let root=0;root<12;root++)for(const mode of ['major','minor'])for(const randomness of ['low','medium','high'])for(const seed of [0,17,91]){
  const key={root,mode},bars=mutate(Array.from({length:4},()=>({chords:[]})),{style,key:root,mode,randomness,seed}),degrees=chartToDegrees(bars,key);
  const context=`${style}/${root}/${mode}/${randomness}/${seed}`;
  if(style==='Jazz'&&root===1&&mode==='minor'&&randomness==='medium'&&seed===0){
   assert.equal(parse(bars[0].chords[0].symbol).rootName,'C#','C# minor tonic must not be spelled Db');
   assert.equal(parse(bars[1].chords[0].symbol).rootName,'D#','C# minor supertonic must use D#');
  }
  assert.deepEqual(sound(materializeChart(parseDegreeChart(formatDegreeChart(degrees,key),key),key)),sound(bars),context);
  for(const bar of bars)assert.equal(bar.chords.reduce((n,c)=>n+c.beats,0),4,context);
  const changed=materializeChart(convertDegreeMode(degrees,mode,mode==='major'?'minor':'major'),key);sound(changed);
  cases++;
 }
 assert.equal(cases,Object.keys(styles).length*24*9);
});
