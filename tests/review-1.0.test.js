import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse,generate,approach,chordTones,mod,guitarShapes,midiBytes,transposeSymbol,romanNumeral,keyName} from '../dist/music.js';
import {parseChart} from '../dist/solutions.js';
import {mutate,cadenceTo,styles} from '../dist/style-engine.js';
import {insertCadence} from '../dist/harmony-actions.js';
import {voicePlan,performance} from '../dist/performance.js';

test('review aliases accept pasted charts without changing pitch or slash bass',()=>{
 for(const [alias,canonical] of Object.entries({Csus:'Csus4','C+':'Caug','C°':'Cdim','Cm(maj7)':'CmMaj7','C-7':'Cm7',Cadd2:'Cadd9',C2:'Cadd9',Cmaj:'C'})){
  assert.deepEqual(parse(alias+'/E').pcs,parse(canonical).pcs,alias);assert.equal(parse(alias+'/E').bass,4);
  assert.equal(parseChart(`| ${alias} |`)[0].chords[0].symbol,alias);
 }
 assert.deepEqual(parse('C7b5').intervals,[0,4,6,10]);
 assert.deepEqual(chordTones('F#maj7'),['F#','A#','C#','E#']);
 assert.equal(parse('Cdim7/Bbb').bass,9);
});
test('sharp keys spell generated roots and secondary dominants consistently',()=>{
 const empty=Array.from({length:4},()=>({chords:[]}));
 assert.deepEqual(generate(empty,{key:4,random:()=>0}).map(c=>c.symbol),['Emaj7','C#7','F#m7','B7']);
 assert.deepEqual(generate(empty,{key:6,style:'Rock',random:()=>0}).map(c=>c.symbol),['F#','C#','D#m','B']);
 assert.deepEqual(approach('Bdim'),['C#m7b5','F#7b9']);
 assert.equal(cadenceTo('Bdim'),null);
 assert.throws(()=>insertCadence(parseChart('| A | Bdim |'),0,0));
 for(const key of [2,4,6,7,9,11])for(let seed=0;seed<8;seed++){
  const result=mutate(empty,{style:'Jazz',key,seed});assert.ok(result.flatMap(b=>b.chords).every(c=>parse(c.symbol)));
  assert.ok(!result.flatMap(b=>b.chords).some(c=>/^Gb/.test(c.symbol)));
 }
});
test('voicing avoids semitone clashes and puts sharp ninth above third, with five upper voices at most',()=>{
 for(const symbol of ['C7b9','G7alt','Cmaj9','Am9','Fmaj7#11','Cm13','Cmaj7/B'])for(const voicing of ['close','rootless','open']){
  const c=parse(symbol),[bass,...upper]=voicePlan([{symbol}],{voicing})[0].notes;
  assert.ok(upper.length<=5,symbol);assert.ok(upper[0]>=52);assert.ok(upper[0]-bass>=12);
  assert.ok(upper.every(n=>c.pcs.includes(mod(n))));
  if(c.intervals.some(n=>n>=13))assert.ok(!upper.some(n=>mod(n)===c.root),symbol);
  if(c.intervals.includes(15))assert.ok(upper.find(n=>mod(n-c.root)===3)>upper.find(n=>mod(n-c.root)===4));
  if(voicing==='rootless')assert.ok(upper.at(-1)-upper[0]<=24,symbol);
 }
 for(const symbol of ['C7b9','G7alt','Cmaj9','Am9','Fmaj7#11']){
  const upper=voicePlan([{symbol}])[0].notes.slice(1);assert.ok(upper.every((n,i)=>!i||n-upper[i-1]>1),symbol);
 }
});
test('every supported quality has playable candidates in all keys and voicings',()=>{
 for(let key=0;key<12;key++)for(const quality of ['','m','maj7','m7','7b5','m7b5','dim7','7alt','maj9#11','13b9','m13','9sus4','5','mMaj9','7alt(b5,#11,13)'])for(const voicing of ['close','open','rootless']){
  const symbol=keyName(key)+quality,plan=voicePlan([{symbol}],{voicing});assert.ok(plan[0].notes.length>=3,symbol);
  assert.ok(plan[0].notes.slice(1).every(n=>n>=52&&n<=88),symbol);
 }
});
test('extended guitar voicings omit optional fifths and retain thirds, sevenths and top extensions',()=>{
 for(const symbol of ['C13','Cm11']){
  const c=parse(symbol),shapes=guitarShapes(symbol);assert.ok(shapes.length>=2,symbol);
  for(const shape of shapes){const notes=shape.frets.flatMap((f,i)=>f<0?[]:[[40,45,50,55,59,64][i]+f]);assert.equal(mod(notes[0]),c.bass);
   for(const interval of c.intervals.filter(i=>[3,4,10,11,17,21].includes(i)))assert.ok(notes.some(n=>mod(n-c.root)===mod(interval)));
  }
 }
});
test('Funk color mutations retain dominant vamps and minor extensions',()=>{
 for(let seed=0;seed<10;seed++){
  const result=mutate(parseChart('| C | Am | F | G |'),{style:'Funk',seed,freedom:'color'});
  for(const chord of result.flatMap(b=>b.chords)){const c=parse(chord.symbol);assert.ok(c.minor||['9','13'].includes(c.q),chord.symbol);}
 }
});
test('sixteenth swing affects Funk and Fusion; lofi delays every upper attack by 30ms',()=>{
 const bars=parseChart('| Cmaj9 | Am9 |');
 for(const pattern of ['funk','fusion']){
  const straight=performance(bars,pattern,{human:0,swing:0}),swung=performance(bars,pattern,{human:0,swing:.08});
  assert.equal(straight.length,swung.length);assert.ok(swung.some((n,i)=>n.beat!==straight[i].beat));
  assert.ok(swung.every(n=>n.duration>0&&n.beat+n.duration<=8));
 }
 const soul=performance(bars,'soul',{human:0,swing:0,bpm:120}),lofi=performance(bars,'lofi',{human:0,swing:0,bpm:120});
 assert.equal(soul.length,lofi.length);
 soul.forEach((n,i)=>assert.ok(Math.abs(lofi[i].beat-n.beat-(n.part==='upper'?.06:0))<1e-9));
});
test('Rock separates eighth bass and backbeat chords; walking and delayed Ballad are optional',()=>{
 const bars=parseChart('| C | F |'),rock=performance(bars,'rock',{human:0});
 assert.equal(rock.filter(n=>n.part==='bass'&&n.beat<4).length,8);
 assert.ok(rock.filter(n=>n.part==='upper'&&n.beat<4).every(n=>n.beat%1===0));
 const backbeat=rock.find(n=>n.part==='upper'&&n.beat===1),downbeat=rock.find(n=>n.part==='upper'&&n.beat===0);assert.ok(backbeat.velocity>downbeat.velocity&&backbeat.velocity-downbeat.velocity<.1);
 for(const [bassMode,count] of [['root',1],['two',2],['four',4]]){
  const notes=performance(bars,'jazz',{human:0,bassMode});assert.equal(notes.filter(n=>n.part==='bass'&&n.beat<4).length,count);
 }
 const ballad=performance(bars,'ballad',{human:0,balladEntry:'delayed'});assert.equal(ballad.find(n=>n.part==='upper').beat,.5);
});
function decodeTracks(bytes){
 const tracks=[];let p=14;
 while(p<bytes.length){assert.equal(new TextDecoder().decode(bytes.slice(p,p+4)),'MTrk');const size=new DataView(bytes.buffer,bytes.byteOffset+p+4,4).getUint32(0);p+=8;const end=p+size;let tick=0;const notes=[],active=new Map();let name='';
  while(p<end){let d=0,b;do{b=bytes[p++];d=(d<<7)|(b&127);}while(b&128);tick+=d;const status=bytes[p++];
   if(status===255){const type=bytes[p++],len=bytes[p++];if(type===3)name=new TextDecoder().decode(bytes.slice(p,p+len));p+=len;continue;}
   if(status===0xc0){p++;continue;}const note=bytes[p++],velocity=bytes[p++];if(status===0x90){assert.ok(!active.has(note));active.set(note,{note,velocity,start:tick});}else {assert.equal(status,0x80);assert.ok(active.has(note));const n=active.get(note);assert.ok(tick>n.start);notes.push({...n,end:tick});active.delete(note);}
  }assert.equal(active.size,0);tracks.push({name,notes,tick});
 }return tracks;
}
test('MIDI uses 1–127 velocity and split tracks preserve note timing, durations and total length',()=>{
 const extremes=decodeTracks(midiBytes([{beat:0,duration:1,note:60,velocity:0},{beat:1,duration:1,note:64,velocity:1}],4));
 assert.deepEqual(extremes[0].notes.map(n=>n.velocity),[1,127]);
 for(const pattern of ['sustain','funk','rock','jazz','arp']){
  const notes=performance(parseChart('| Cmaj9 | Am9 |'),pattern,{human:0,bassMode:'four'}),merged=decodeTracks(midiBytes(notes,8))[0],split=decodeTracks(midiBytes(notes,8,{split:true}));
  assert.deepEqual(split.map(t=>t.name),['Bass','Chords']);assert.ok(split.every(t=>t.tick===3840));
  const order=(a,b)=>a.start-b.start||a.note-b.note;
  assert.deepEqual(split.flatMap(t=>t.notes).sort(order),merged.notes.sort(order),pattern);
 }
});
test('transpose and Roman numerals retain harmonic roles, slash bass, and pitch round trips',()=>{
 assert.deepEqual(['C','Am','F','G'].map(c=>romanNumeral(c)),['I','vi','IV','V']);
 assert.equal(romanNumeral('Bdim'),'vii°');assert.equal(romanNumeral('F#dim'),'♯iv°');assert.equal(romanNumeral('Gb'),'♭V');assert.equal(romanNumeral('Ab',0,'minor'),'VI');
 assert.equal(transposeSymbol('C/E',4,4),'E/G#');assert.equal(transposeSymbol('Cmaj7',6,6),'F#maj7');
 for(const symbol of ['Cmaj9','F#m7b5/C#','Bb7b9/Ab'])for(let shift=-12;shift<=12;shift++){
  const moved=transposeSymbol(symbol,shift,mod(shift)),back=transposeSymbol(moved,-shift,0);
  assert.deepEqual(parse(back).pcs,parse(symbol).pcs);assert.equal(parse(back).bass,parse(symbol).bass);
 }
});

test('walking bass respects slash-chord tones and does not anticipate across a rest',()=>{
 for(const symbol of ['C/E','Bm7b5/D','Cdim7/Eb']){
  const notes=performance(parseChart(`| ${symbol} |`),'jazz',{human:0,bassMode:'four'}).filter(n=>n.part==='bass'),chord=parse(symbol);
  assert.equal(notes.length,4);assert.ok(notes.every(n=>chord.pcs.includes(mod(n.note))),symbol);
 }
 const notes=performance(parseChart('| C | | F# |'),'jazz',{human:0,bassMode:'four'}).filter(n=>n.part==='bass'&&n.beat<4);
 assert.ok(parse('C').pcs.includes(mod(notes.at(-1).note)));
});
