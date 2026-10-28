import test from 'node:test';import assert from 'node:assert/strict';
import {parseChart} from '../dist/solutions.js';
import {detectKey} from '../dist/key-detection.js';
import {keyCases} from './key-cases.js';
test('28 human-labelled key cases: borrowed plagal cadence, inversions, minor V, blues, sequences and non-tonic entrances',()=>{
 for(const [chart,root,mode,alternatives=[]] of keyCases){
  const d=detectKey(parseChart(chart)),acceptable=[[root,mode],...alternatives];
  assert.ok(acceptable.some(([r,m])=>r===d.primary.root&&m===d.primary.mode),`${chart}: ${JSON.stringify(d.ranked.slice(0,3))}`);
 }
});
test('relative ambiguity retains candidates and silence has no invented detection',()=>{
 for(const [chart,keys] of [['Am | F | C | G',[0,9]],['F | G | Em | Am',[0,9]],['Bb | C | Am | Dm',[2,5]]]){
  const d=detectKey(parseChart(chart));assert.ok(keys.every(root=>d.candidates.some(k=>k.root===root)),chart+JSON.stringify(d.candidates));
 }
 assert.equal(detectKey(parseChart('| |')).primary,null);
});
