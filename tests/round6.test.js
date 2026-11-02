import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mutate,styles} from '../dist/style-engine.js';
import {parse,mod,transposeSymbol as transpose} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {insertCadence,cadenceMessage,invertChord} from '../dist/harmony-actions.js';
import {resolveAutomaticBass} from '../dist/morph-techniques.js';
import {examplesForKey} from '../dist/keyed-examples.js';

const fourthSecond=c=>c&&!c.minor&&c.intervals.includes(10)&&mod(c.bass-c.root)===10;
function unresolved(bars,loop=true){
 const events=bars.flatMap(b=>b.chords.length?b.chords:[{symbol:'N.C.'}]).map(c=>parse(c.symbol));
 return events.filter((c,i)=>fourthSecond(c)&&!([1,2].includes(mod(c.bass-(events[i+1]||(loop?events[0]:null))?.bass))));
}
test('R06 N1 reported pop fourth-second inversion resolves; manual INVERT remains free',()=>{
 const bars=mutate(parseChart('C | G | Am | F'),{style:'American pop',randomness:'medium',seed:1,tonality:{root:0,mode:'major'},density:2});
 assert.deepEqual(unresolved(bars),[],serialize(bars));
 assert.equal(invertChord('G7/D'),'G7/F');
});
test('R06 N1 statistical 3920 MORPHs per preserve-bass setting, all 49 styles',()=>{
 const charts=[['C | G | Am | F','major'],['Am | F | C | G','minor']];
 for(const preserveBass of [false,true]){
  let runs=0,inversions=0,jumps=0;
  for(const style of Object.keys(styles))for(const [text,mode] of charts)for(const randomness of ['medium','high'])for(let seed=1;seed<=20;seed++){
   const source=parseChart(text),before=serialize(source);
   const bars=mutate(source,{style,randomness,seed,density:2,preserveBass,tonality:{root:mode==='minor'?9:0,mode}});
   runs++;inversions+=bars.flatMap(b=>b.chords).filter(e=>fourthSecond(parse(e.symbol))).length;jumps+=unresolved(bars).length;
   assert.equal(serialize(source),before);assert.equal(bars.length,source.length);
   for(const [i,bar] of bars.entries()){assert.equal(bar.chords.reduce((n,c)=>n+c.beats,0),4);assert.equal(bar.chords[0].morph.source.bar,i);assert.equal(bar.chords[0].morph.source.onset,0);}
  }
  console.log('R06 statistics',JSON.stringify({preserveBass,runs,inversions,jumps}));
  assert.equal(runs,3920);assert.equal(jumps,0);
 }
});
test('R06 N1 Jazz and Neo-soul: actual next bass, inner-bar, rest, nonloop and all keys',()=>{
 for(const style of ['Jazz','Neo-soul'])for(let key=0;key<12;key++)for(const loop of [false,true])for(const text of ['G13 | Cmaj9/E | Am9 | Dm9','E7b13 | Am9 | Dm7 | G7','C:2 G7:2 | Am | F | C','| C | G7 | | F |'])for(let seed=1;seed<=30;seed++){
  const source=parseChart(text).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:c.symbol==='N.C.'?c.symbol:transpose(c.symbol,key)}))}));
  const bars=mutate(source,{style,seed,loop,randomness:'high',density:3,tonality:{root:key,mode:'major'}});
  assert.deepEqual(unresolved(bars,loop),[],style+' '+serialize(bars));
 }
});
test('R06 N2 NEXT merges same-root tail, reports V, preserves target and duration',()=>{
 const input=parseChart('C | Am | Dm | G'),result=insertCadence(input,3,0,{loop:true});
 assert.equal(serialize([result.bars[3]]),'| G7:4 |');assert.equal(result.kind,'V');assert.match(cadenceMessage(result),/已插入 V，/);
 assert.deepEqual(result.bars.slice(0,3),input.slice(0,3));assert.equal(result.bars[3].reason,'V → C');
 for(const startBar of [0,1])for(const text of ['C | C | Dm | G','C | C | G | Dm','C | C | F | G7']){
  const source=parseChart(text),out=insertCadence(source,3,0,{loop:true,startBar});
  const cs=out.bars[3].chords;
  assert.equal(cs.reduce((n,c)=>n+c.beats,0),4);
  assert.ok(cs.every((c,i)=>!i||parse(c.symbol).root!==parse(cs[i-1].symbol).root),serialize(out.bars));
  if(text.endsWith('G7')){assert.equal(out.kind,'retained');assert.match(cadenceMessage(out),/未插入新和弦/);}
  assert.equal(out.target,'C');assert.deepEqual(out.bars.slice(0,3),source.slice(0,3));
 }
});
test('R06 N3 dance example coverage: every major/minor key, original studies only for additions',()=>{
 for(const style of ['Reggaeton','Amapiano','Dancehall'])for(const mode of ['major','minor'])for(let root=0;root<12;root++){
  const pool=examplesForKey(style,{root,mode});assert.ok(pool.length,style+' '+root+' '+mode);
  assert.ok(pool.every(p=>p.mode===mode));
  if(mode==='major')assert.ok(pool.some(p=>p.type==='study'&&parseChart(p.chart).flatMap(b=>b.chords).some(c=>parse(c.symbol)?.root===root)));
 }
});
test('R06 N4 release metadata and current policy agree',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const version=JSON.parse(read('dist/version.json'));
 assert.equal(version.version,'1.0.12');assert.equal(version.tag,'web-v1.0.12');
 assert.match(read('README.md'),/version\.json/);assert.doesNotMatch(read('README.md'),/\d+\.\d+\.\d+ 待發布/);
 assert.match(read('docs/reviews/CONFIRMED-THEORY.md').split('## 2.')[0],/Jazz.*Neo-soul/);
});

test('R06 N1 final adjacency retains resolving 4/2 and rejects rests/end/wrap conflicts',()=>{
 for(const [text,loop,want] of [
  ['G7 | C/E',false,'G7/F'],['G13 | Cmaj9/E',false,'G13/F'],
  ['E7b13 | Am9/C',false,'E7b13/D'],['G7 | C',false,'G7'],
  ['| G7 | | C/E |',true,'G7'],['G7',false,'G7'],
  ['G7 | C/E',true,'G7/F']
 ]){
  const source=parseChart(text),bars=structuredClone(source),root=parse(bars[0].chords[0].symbol).root;
  bars[0].chords[0].symbol+='/'+(root===4?'D':'F');
  bars[0].chords[0].morph={source:{bar:0,chord:0,onset:0},technique:'inversion'};
  resolveAutomaticBass(bars,source,{loop});assert.equal(bars[0].chords[0].symbol,want);
 }
 const authored=parseChart('G7/F | Am');
 const bars=structuredClone(authored);bars[0].chords[0].morph={source:{bar:0,chord:0,onset:0},technique:'color'};
 assert.equal(resolveAutomaticBass(bars,authored)[0].chords[0].symbol,'G7/F');
 // Both inversions must be reconsidered when the later one is rejected.
 const source=parseChart('G7 | Gb7 | C'),out=structuredClone(source);
 for(const [i,bass] of ['F','Fb'].entries()){
  out[i].chords[0].symbol+='/'+bass;
  out[i].chords[0].morph={source:{bar:i,chord:0,onset:0},technique:'inversion'};
 }
 assert.equal(serialize(resolveAutomaticBass(out,source)),'| G7:4 | Gb7:4 | C:4 |');
});
