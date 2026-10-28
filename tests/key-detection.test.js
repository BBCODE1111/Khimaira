import test from 'node:test';import assert from 'node:assert/strict';
import {parseChart} from '../dist/solutions.js';
import {detectKey} from '../dist/key-detection.js';
import {keyCases} from './key-cases.js';
import {readFileSync} from 'node:fs';
const labelled49=JSON.parse(readFileSync(new URL('./key-detection-cases.json',import.meta.url))).cases;
assert.equal(labelled49.length,49);
for(const {chart,expected} of labelled49)test(`user-labelled key: ${chart}`,()=>{
 const actual=detectKey(parseChart(chart)).primary;
 const answers=expected.map(name=>{const chord=parse(name);return {root:chord.root,mode:chord.minor?'minor':'major'};});
 assert.ok(answers.some(key=>key.root===actual?.root&&key.mode===actual?.mode),`${chart}: expected ${expected.join(' / ')} (first preferred), got ${actual?.tonic} ${actual?.mode}`);
});
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

import {reportedCases,theoryCases,newCases,sectionCases} from './functional-key-cases.js';
import {analyzeHarmony,transposeSymbol,parse} from '../dist/music.js';
import {chartToDegrees,degreeLabels,parseDegreeChart,materializeChart,formatDegreeChart} from '../dist/degree-chart.js';
import {cadenceTo} from '../dist/style-engine.js';
const matches=(k,r,m)=>k.root===r&&k.mode===m;
for(const [name,cases] of [['5 reported regressions',reportedCases],['17 theory examples',theoryCases],['36 new independently labelled examples',newCases]])test(name,()=>{
 let correct=0;
 for(const [chart,root,mode,alts=[]] of cases){
  const bars=parseChart(chart),d=detectKey(bars),answers=[[root,mode],...alts];
  if(answers.some(([r,m])=>matches(d.primary,r,m)))correct++;
  assert.ok(answers.some(([r,m])=>d.candidates.some(k=>matches(k,r,m))),chart+' expected key absent');
  if(alts.length)for(const [r,m] of answers)assert.ok(d.candidates.some(k=>matches(k,r,m)),chart+' ambiguous answer missing');
  assert.deepEqual(d.analysis,analyzeHarmony(bars,d.primary));
  assert.deepEqual(degreeLabels(chartToDegrees(bars,d.primary),d.primary).flat(),d.analysis.events.map(c=>c.label));
 }
 assert.ok(correct/cases.length>=(name.startsWith('36')?.95:1),`${name}: ${correct}/${cases.length}`);
});
test('reported functional regressions transpose through all 12 tonics without special-casing absolute chords',()=>{
 for(const [chart,root,mode] of reportedCases)for(let semitones=0;semitones<12;semitones++){
  const target=(root+semitones)%12,bars=parseChart(chart).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,semitones,target,mode)}))}));
  assert.ok(matches(detectKey(bars).primary,target,mode),chart+' shift '+semitones);
 }
});
test('functional labels identify loop secondary dominants, ii–V, borrowed cadences, subV and inversions',()=>{
 const key={root:0,mode:'major'},a=analyzeHarmony(parseChart('Dm | G | C | A7'),key);
 assert.deepEqual(a.events.map(c=>c.label),['ii','V','I','V7/ii']);assert.equal(a.events[1].cadence,'ii-V-I');assert.equal(a.events[3].target,0);
 assert.equal(analyzeHarmony(parseChart('Dm | G | C | A7'),key,{loop:false}).events[3].role,'unexplained');
 assert.deepEqual(analyzeHarmony(parseChart('C | E7 | Am | D7 | G7 | C'),key).events.map(c=>c.label),['I','V7/vi','vi','V7/V','V7','I']);
 assert.deepEqual(analyzeHarmony(parseChart('C7 | F7 | C7 | G7'),key).events.map(c=>c.label),['I7','IV7','I7','V7']);
 assert.equal(analyzeHarmony(parseChart('C | Db7#11 | C'),key).events[1].label,'subV7#11');
 const g={root:7,mode:'major'},bars=parseDegreeChart('Am11/G | D7 | Gmaj7/D',g);
 assert.deepEqual(degreeLabels(bars,g).flat(),['ii11/G','V7','Imaj7/D']);
 const readable=formatDegreeChart(bars,g,{bassNames:true});assert.deepEqual(parseDegreeChart(readable,g),bars);
 for(const text of ['C/E | Db7#11/Ab | C/G','Dm | Eb7#11/Bb | Dm | G7']){
  const d=parseDegreeChart(text,key),human=formatDegreeChart(d,key,{bassNames:true});assert.deepEqual(parseDegreeChart(human,key),d);
 }
 // A major seventh is not a dominant seventh; isolated II7 does not gain a fictitious target.
 assert.equal(analyzeHarmony(parseChart('C | D7 | Fm | C'),key).events[1].label,'II7');
 assert.equal(analyzeHarmony(parseChart('Cmaj7 | F'),key).events[0].relation,null);
 assert.deepEqual(analyzeHarmony(parseChart('C | F | G | C'),key).events.map(c=>c.label),['I','IV','V','I']);
 assert.equal(analyzeHarmony(parseChart('C | Gm7 | C | F | G7 | C'),key).events[2].label,'V/IV');
});
test('tritone substitutes use a chromatic second above the spelled target and retain extensions',()=>{
 for(const [target,wanted] of [['Dm','Eb7#11'],['Gm','Ab7#11'],['C','Db7#11'],['F#','G7#11'],['Bb','Cb7#11']]){
  const [ii,sub]=cadenceTo(target,{tritone:true,rich:true});assert.equal(sub,wanted);assert.equal((parse(sub).root-parse(target).root+12)%12,1);assert.ok(parse(ii));
 }
});
test('A/B sections are independently labelled with no cross-section loop or automatic transposition',()=>{
 for(const {chart,sections} of sectionCases){const bars=parseChart(chart),before=JSON.stringify(bars);
  const result=detectKey(bars,{sections:sections.map(([start,end],i)=>({start,end,label:i?'B':'A'}))});
  assert.equal(result.primary,null);assert.equal(JSON.stringify(bars),before);
  result.sections.forEach((section,i)=>{assert.ok(matches(section.primary,sections[i][2],sections[i][3]),chart+' '+section.label);assert.equal(section.analysis.loop,false);});
 }
 assert.throws(()=>detectKey(parseChart('C | F'),{sections:[{start:0,end:3}]}));
});

test('all 36 new cases retain their manually labelled key across 12 transpositions',()=>{
 for(const [chart,root,mode] of newCases)for(let semitones=0;semitones<12;semitones++){
  const target=(root+semitones)%12,bars=parseChart(chart).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,semitones,target,mode)}))}));
  assert.ok(matches(detectKey(bars).primary,target,mode),chart+' shift '+semitones);
 }
});
test('unresolved ii–V uses the shared functional analysis in all twelve transpositions',()=>{
 for(let shift=0;shift<12;shift++){
  const bars=parseChart('Em7 | A7 | Dm7 | G7').map(b=>({chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,shift,shift,'major')}))}));
  const d=detectKey(bars);assert.equal(d.primary.root,shift);assert.equal(d.primary.mode,'major');
  assert.equal(d.analysis.events.at(-1).impliedTonic.strength,'ii-V');
  assert.equal(d.analysis.events.at(-1).cadence,null,'unresolved is not an observed cadence');
  assert.deepEqual(d.analysis,analyzeHarmony(bars,d.primary));
 }
});
test('minor candidate spellings follow conventional key signatures',()=>{
 for(const [root,tonic] of [[1,'C#'],[6,'F#'],[8,'G#'],[10,'Bb'],[3,'Eb']]){
  const ranked=detectKey(parseChart('E | B | C#m | A')).ranked;
  assert.equal(ranked.find(k=>k.root===root&&k.mode==='minor').tonic,tonic);
 }
});
