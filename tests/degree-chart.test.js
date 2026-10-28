import test from 'node:test';import assert from 'node:assert/strict';
import {parse} from '../dist/music.js';
import {parseDegreeChart,materializeChart,chartToDegrees,formatDegreeChart} from '../dist/degree-chart.js';
const chordNames=bars=>bars.map(b=>b.chords.map(c=>c.symbol).join(' ')).join(' | ');
test('Roman and chord inputs have the same canonical degree representation',()=>{
 for(const [roman,names,key] of [
  ['I | vi | IV | V','F | Dm | Bb | C',{root:5}],
  ['ii7 | V7 | Imaj7','Dm7 | G7 | Cmaj7',{root:0}],
  ['I | V/V | V | I','C | D | G | C',{root:0}],
  ['i | bVI | bVII | i','Am | F | G | Am',{root:9,mode:'minor'}],
  ['I | iv | I','C | Fm | C',{root:0}],
  ['I/3 | V7/V/#4 | V7 | I','C/E | D7/F# | G7 | C',{root:0}],
  ['iiø7 | V7b9 | i','Bm7b5 | E7b9 | Am',{root:9,mode:'minor'}],
  ['I6/9 | imaj7 | vii°7','C69 | CmMaj7 | Bdim7',{root:0}]
 ])assert.deepEqual(parseDegreeChart(roman,key),parseDegreeChart(names,key),roman);
});
test('all 12 source tonics through all 12 destinations preserve degrees and exact return spelling',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const key={root,mode},degrees=parseDegreeChart('I/3 | V7/V/#4 | iv:2 bVImaj7:2 | vii°7 | i | bVI | bVII | V7b9',key);
  const original=materializeChart(degrees,key),saved=JSON.stringify(degrees);
  for(let target=0;target<12;target++){
   const moved=materializeChart(degrees,{root:target,mode});
   assert.deepEqual(chartToDegrees(moved,{root:target,mode}),degrees);
   assert.deepEqual(materializeChart(degrees,key),original);assert.equal(JSON.stringify(degrees),saved);
   for(const b of moved)for(const c of b.chords)assert.ok(parse(c.symbol),c.symbol);
  }
 }
 const f=materializeChart(parseDegreeChart('I | vi | IV | V'),{root:5});assert.equal(chordNames(f),'F | Dm | Bb | C');
 const d=materializeChart(parseDegreeChart('I | vi | IV | V'),{root:2});assert.equal(chordNames(d),'D | Bm | G | A');
});
test('degree display/input round-trips timing, accidentals, extensions and basses',()=>{
 const key={root:5},d=parseDegreeChart('Fmaj9/A:2 C7/Bb:2 | D7/F# | Bbm6 | C7b9',key);
 assert.deepEqual(parseDegreeChart(formatDegreeChart(d),key),d);
 assert.equal(formatDegreeChart(parseDegreeChart('F | Dm | Bb | C',key)),'| I | vi | IV | V |');
 assert.equal(formatDegreeChart(parseDegreeChart('I | V/V | V | I')),'| I | V/V | V | I |');
 for(const text of ['I:3 V:2','VIII','I/9','ii7:0','I:NaN'])assert.throws(()=>parseDegreeChart(text));
});

test('contextual functions serialize losslessly even when readable subV uses an enharmonic spelling',()=>{
 for(const [tonic,sub] of [['Ab','A7#11'],['Eb','E7#11'],['Db','D7#11'],['Gb','G7#11'],['Cb','C7#11']]){
  const key={root:parse(tonic).root,tonic,mode:'major'},degrees=parseDegreeChart(sub+' | '+tonic,key);
  assert.deepEqual(parseDegreeChart(formatDegreeChart(degrees,key),key),degrees);
 }
});
