import {test} from 'node:test';import assert from 'node:assert/strict';
import {parse,mod} from '../dist/music.js';import {parseChart,serialize} from '../dist/solutions.js';
import {mutate,reduceDensity,tint} from '../dist/style-engine.js';import {darkStyles} from '../dist/dark-styles.js';
import {performance} from '../dist/performance.js';import {releaseSeconds} from '../dist/piano.js';
test('density one keeps the resolving dominant, including secondary, slash and subV chords',()=>{
 for(const [input,expected] of [['| F#m7 B7 | Emaj7 |','B7'],['| Dm7 G7/B | C |','G7/B'],['| Dm7 Db7 | C |','Db7']]){
  const original=parseChart(input),before=serialize(original),out=reduceDensity(original,{loop:false});assert.equal(out[0].chords[0].symbol,expected);assert.equal(out[0].chords[0].beats,4);assert.equal(serialize(original),before);
 }
 const out=mutate(parseChart('| F#m7 B7 | Emaj7 |'),{key:4,method:'color',density:1,randomness:'low'});assert.deepEqual(out[0].chords.map(c=>parse(c.symbol).root),[6,11]); // MORPH density limits additions; it cannot erase an authored ii.
 assert.equal(reduceDensity(parseChart('| Dm7 G7 | | C |'))[0].chords[0].symbol,'Dm7');
});
test('American pop IV suspension is sus2 in every key',()=>{
 assert.equal(tint('Fsus4','American pop','high',()=>0),'Fsus2');
 const roots=['F','Gb','G','Ab','A','Bb','B','C','Db','D','Eb','E'];
 for(let key=0;key<12;key++){const c=parse(tint(roots[key],'American pop','high',()=>.999,key));assert.equal(c.q,'sus2');assert.ok(c.pcs.includes(mod(key+7)));assert.ok(!c.pcs.includes(mod(key+10)));}
});
test('all dark eight-bar studies develop a new ending while keeping the first phrase',()=>{
 for(const style of Object.keys(darkStyles))for(let seed=0;seed<8;seed++)for(let key=0;key<12;key++){
  const options={style,key,seed,mode:'minor',randomness:'high'},four=mutate(Array.from({length:4},()=>({chords:[]})),options),eight=mutate(Array.from({length:8},()=>({chords:[]})),options);
  assert.equal(serialize(eight.slice(0,4)),serialize(four));assert.notEqual(serialize(eight.slice(0,4)),serialize(eight.slice(4,8)),style);
  assert.ok(eight.every(b=>b.chords.reduce((n,c)=>n+c.beats,0)===4));
 }
});
test('remaining repetitive grooves have at least three onset motifs on identical harmony',()=>{
 const chart=parseChart('| Cm | Cm | Cm | Cm | Cm | Cm | Cm | Cm |');
 for(const pattern of ['ostinato','metal','neoclassical','gothic','dembow','dancehall']){
  const notes=performance(chart,pattern,{human:0,swing:0});
  const signatures=Array.from({length:8},(_,i)=>[...new Set(notes.filter(n=>Math.floor(n.beat/4)===i).map(n=>(n.beat-i*4).toFixed(3)))].join(','));
  assert.ok(new Set(signatures).size>=3,pattern);assert.ok(notes.every(n=>n.duration>0&&n.beat+n.duration<=Math.floor(n.beat/4)*4+4+1e-8));
 }
});
test('short piano notes release for at least 80ms without changing MIDI gate lengths',()=>{
 for(const seconds of [.01,.0625,.125,.29,.5,4])assert.ok(releaseSeconds(seconds)>=.08&&releaseSeconds(seconds)<=.35);
 const notes=performance(parseChart('| C9 |'),'funk',{human:0,gate:.1});assert.ok(notes.some(n=>n.duration<.08));
});
