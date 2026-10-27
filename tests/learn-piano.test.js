import test from 'node:test';
import assert from 'node:assert/strict';
import {mutate} from '../dist/style-engine.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {parse,mod,midiBytes} from '../dist/music.js';
import {performance} from '../dist/performance.js';
import {pianoPatterns} from '../dist/piano-patterns.js';
import {parseMelody,melodyText,readMelodyMidi,protectMelody} from '../dist/melody-reference.js';

test('learned pop grammar retains durations, tonal endings, targets and reproducibility in every key',()=>{
 for(const style of ['Mandopop','Japanese rock','K-pop','American pop','Ballad','R&B','Soul'])
 for(let key=0;key<12;key++)for(const mode of ['major','minor'])for(const randomness of ['low','medium','high'])
 for(const count of [4,8,12,16])for(const loop of [true,false])for(let seed=0;seed<6;seed++){
  const source=Array.from({length:count},()=>({chords:[]})),opts={style,key,mode,randomness,seed,loop,density:2};
  const bars=mutate(source,opts);assert.equal(bars.length,count);
  assert.equal(serialize(bars),serialize(mutate(source,opts)));
  for(const b of bars){assert.equal(b.chords.reduce((s,c)=>s+c.beats,0),4);assert.ok(b.chords.every(c=>parse(c.symbol)),serialize(bars));}
  if(!loop){const last=parse(bars.at(-1).chords.at(-1).symbol);assert.equal(last.root,key);assert.equal(last.minor,mode==='minor');}
 }
 const canon=mutate(Array.from({length:8},()=>({chords:[]})),{style:'Mandopop',key:4,seed:1,randomness:'low'});
 assert.deepEqual(canon.slice(0,7).map(b=>parse(b.chords[0].symbol).bass),[4,3,1,11,9,8,6]);
 const target=mutate(Array.from({length:8},()=>({chords:[]})),{style:'Mandopop',seed:5,randomness:'high'});
 assert.equal(target[1].chords[0].symbol,'G#dim7');assert.equal(target[2].chords[0].symbol,'Am9');
 assert.equal(target[5].chords.at(-1).symbol,'C#dim7');assert.equal(target[6].chords[0].symbol,'Dm9');
});
test('learned ideas respect original/color controls, family choice, density and A-prime',()=>{
 const source=parseChart('| E | B/D# | C#m | A |');
 assert.deepEqual(mutate(source,{method:'original',style:'Mandopop'}),source);
 assert.deepEqual(mutate(source,{freedom:'color',style:'Mandopop',key:4}).flatMap(b=>b.chords.map(c=>parse(c.symbol).root)),[4,11,1,9]);
 const empty=Array.from({length:8},()=>({chords:[]}));
 assert.ok(mutate(empty,{style:'Mandopop',ideaFamily:'canon',seed:0}).every(b=>b.reason.includes('canon')));
 const out=mutate(empty,{style:'Mandopop',seed:0});assert.notEqual(serialize(out.slice(0,4)),serialize(out.slice(4)));
 assert.ok(mutate(empty,{style:'Mandopop',density:1,seed:2}).every(b=>b.chords.length===1&&b.chords[0].beats===4));
});
test('twelve piano patterns are distinct, bounded, deterministic and playable on split chords',()=>{
 const ids=Object.keys(pianoPatterns);assert.equal(ids.length,12);const signatures=new Set();
 for(const id of ids){
  const bars=parseChart('| Cmaj9 | Am7:1 D7:1 G7:2 | Fm6 | C |'),opts={human:.3,seed:17,pianoFills:'phrase'};
  const notes=performance(bars,id,opts);assert.deepEqual(notes,performance(bars,id,opts));
  assert.ok(notes.length>0);assert.ok(notes.every(n=>n.beat>=0&&n.duration>0&&n.beat+n.duration<=16+1e-8&&n.note>=21&&n.note<=108&&n.velocity>0&&n.velocity<=1));
  const last=new Map();for(const n of notes){const prev=last.get(n.note);if(prev)assert.ok(prev.beat+prev.duration<=n.beat+1e-8,id);last.set(n.note,n);}
  for(const beat of [0,4,5,6,8,12])assert.ok(notes.some(n=>n.part==='bass'&&Math.abs(n.beat-beat)<.01),id+' chord bass '+beat);
  assert.ok(notes.every(n=>n.beat>=4&&n.beat<5?n.beat+n.duration<=5+1e-8:n.beat>=5&&n.beat<6?n.beat+n.duration<=6+1e-8:true));
  signatures.add(JSON.stringify(performance(parseChart('| C | C |'),id,{human:0,pianoFills:'off'}).map(n=>[n.beat,n.part,n.note])));
 }assert.equal(signatures.size,12);
 const block=performance(parseChart('| C |'), 'pianoQuarter',{human:0,pianoFills:'off'});
 assert.deepEqual([...new Set(block.map(n=>n.beat))],[0,1,2,3]);
});
test('fills wait for phrase ends and real melody rests; busy melodies thin offbeats',()=>{
 const bars=parseChart('| C | C | C | C |');
 const plain=performance(bars,'pianoAnswer',{human:0,pianoFills:'phrase'});
 assert.ok(plain.filter(n=>n.fill).length===2);assert.ok(plain.filter(n=>n.fill).every(n=>n.beat>=15));
 const held=performance(bars,'pianoAnswer',{human:0,pianoFills:'phrase',melodyText:'R:12 G5:4'});
 assert.equal(held.filter(n=>n.fill).length,0);
 assert.equal(performance(bars,'pianoAnswer',{human:0,pianoFills:'off'}).filter(n=>n.fill).length,0);
 const busy=performance(bars,'pianoPush',{human:0,pianoFills:'off',melodyText:Array(8).fill('G5:0.5').join(' ')});
 const base=performance(bars,'pianoPush',{human:0,pianoFills:'off'});
 assert.ok(busy.filter(n=>n.beat<4&&n.part==='upper').length<base.filter(n=>n.beat<4&&n.part==='upper').length);
 assert.deepEqual(performance(bars,'pianoPush',{human:0,pianoFills:'off',melodyFollow:'off',melodyText:'F4:4'}),base);
});
test('melody protection handles notes starting during sustained chords without changing bass or lead',()=>{
 const melody=parseMelody('R:1 F4:3'),copy=structuredClone(melody),notes=[{beat:0,duration:4,note:36,part:'bass',velocity:.7},{beat:0,duration:4,note:64,part:'upper',velocity:.7},{beat:0,duration:4,note:60,part:'upper',velocity:.7}];
 const out=protectMelody(notes,melody);assert.equal(out.some(n=>n.note===64),false);assert.deepEqual(out[0],notes[0]);assert.deepEqual(melody,copy);
 assert.throws(()=>parseMelody('H4:1'));assert.throws(()=>parseMelody('C4:0'));assert.throws(()=>parseMelody('C4:65'));
 assert.deepEqual(parseMelody('E4:1 R:1 Bb4:2'),[{beat:0,duration:1,note:64},{beat:2,duration:2,note:70}]);
});
test('melody MIDI import round-trips beats and rests and rejects malformed/polyphonic references',()=>{
 const source=[{beat:1,duration:.5,note:64,velocity:.7},{beat:2,duration:1,note:67,velocity:.7}];
 const bytes=midiBytes(source,4),tracks=readMelodyMidi(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert.equal(tracks.length,1);assert.deepEqual(parseMelody(melodyText(tracks[0].notes)),source.map(({velocity,...n})=>n));
 assert.throws(()=>readMelodyMidi(new ArrayBuffer(4)));assert.throws(()=>readMelodyMidi(bytes.buffer.slice(0,bytes.byteLength-2)));
 assert.throws(()=>melodyText([{beat:0,duration:2,note:60},{beat:1,duration:2,note:64}]));
});
