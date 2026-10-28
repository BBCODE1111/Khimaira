import test from 'node:test';
import assert from 'node:assert/strict';
import {performance,voicePlan} from '../dist/performance.js';
import {genreProfiles,genreGrid,genreVoicing,selectGenre} from '../dist/genre-rhythm.js';
import {parseChart} from '../dist/solutions.js';
const opts={genreRevision:2,human:0,swing:0,gate:1,bpm:120,seed:42};
const positions=(notes,part,bar=0)=>[...new Set(notes.filter(n=>n.part===part&&n.beat>=bar*4&&n.beat<(bar+1)*4).map(n=>+((n.beat-bar*4)*4+1).toFixed(5)))];
const expected={house:[[3,11],[3,7,11,15]],classicHouse:[[1,4,7,11,14],[3,7,11,15]],techHouse:[[3],[3,4,7,8,11,12,15,16]],disco:[[3,7,11,15],[1,3,5,7,9,11,13,15]],futureBass:[[1,4,7,9,11,13,15],[1,4,7,9,11,13,15]],progressiveDrop:[[3,7,11,15],[3,7,11,15]],tropicalHouse:[[1,4,7],[1,4,7]],garage:[[1,4,7,11,14],[1,7,11,16]],amapiano:[[1,11],[4,7,11,15]],afrobeats:[[4,7,11,15],[1,7,11]],funk:[[1,4,7,11,14],[1,4,7,8,11,14,16]],soul:[[5,13],[1,7,9,15]],rnb:[[1,11,14],[1,8,11]],neosoul:[[1,7,12],[1,7,10]],lofi:[[1,9],[1,10]]};
test('independent knowledge-table expectations: primary bass/upper grid and fixed pocket',()=>{
 for(const [id,[upper,bass]] of Object.entries(expected)){
  const notes=performance(parseChart('Cmaj9'),id,opts),p=genreProfiles[id];
  // Rolled voices share an attack group; measure first voice only, not roll echoes.
  const normalized=notes.map(n=>({...n,beat:n.beat-(n.part==='upper'||p.pocketBoth?p.pocketMs*.002:0)}));
  for(const [part,want] of [['upper',upper],['bass',bass]]){
   const got=positions(normalized,part).filter(x=>Math.abs(x-Math.round(x))<1e-5);
   assert.deepEqual(got,want,id+' '+part);
  }
 }
});
test('R&B family has four distinct primary upper grids and complete fingerprints',()=>{
 const ids=['rnb','soul','lofi','neosoul'];assert.equal(new Set(ids.map(id=>JSON.stringify(expected[id][0]))).size,4);
 assert.equal(new Set(ids.map(id=>JSON.stringify(performance(parseChart('Cmaj9'),id,{...opts,swing:undefined})))).size,4);
});
test('every modern profile has two distinct fourth/eighth-bar variations',()=>{
 for(const id of Object.keys(genreProfiles)){
  const fingerprint=bar=>JSON.stringify(['bass','upper'].map(part=>genreGrid(id,bar)[part]));
  assert.equal(new Set([0,3,7].map(fingerprint)).size,3,id);
 }
});
test('electronic HUMAN changes velocity only; fixed sidechain is separately maintained',()=>{
 for(const id of Object.keys(genreProfiles).filter(id=>genreProfiles[id].electronic)){
  const bars=parseChart('Cmaj9 | Fmaj9'),a=performance(bars,id,{...opts,human:0}),b=performance(bars,id,{...opts,human:1});
  assert.deepEqual(b.map(({velocity,...n})=>n),a.map(({velocity,...n})=>n),id);
  assert.notDeepEqual(b.map(n=>n.velocity),a.map(n=>n.velocity),id);
 }
});
test('Deep house stabs are quarter-beat, Future bass slices stop before the next onset, ballad begins on grid',()=>{
 const house=performance(parseChart('Cm7'),'house',opts);assert.ok(house.filter(n=>n.part==='upper').every(n=>Math.abs(n.duration-.25)<1e-7));
 const slices=performance(parseChart('Cmaj9'),'futureBass',opts).filter(n=>n.part==='upper');
 assert.equal(slices[0].beat,.016);for(const n of slices){const next=slices.find(s=>s.beat>n.beat+1e-7);if(next)assert.ok(n.beat+n.duration<next.beat);}
 for(const human of [0,1])assert.equal(performance(parseChart('C'),'ballad',{...opts,human})[0].beat,0);
});
test('genre voicings respect registers, chord tones and low-voice spacing in every tonic',()=>{
 for(const [id,p] of Object.entries(genreProfiles))for(const root of ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']){
  const [bass,...upper]=genreVoicing(root+'m9',id);assert.ok(bass>=24&&bass<=48,id);
  assert.ok(upper.every(n=>n>=p.range[0]&&n<=p.range[1]),id);
  for(let i=0;i<upper.length-1;i++)if(upper[i]<52)assert.ok(upper[i+1]-upper[i]>=5,id);
 }
});
test('same harmony never anticipates itself; short intermediate harmony sounds; full pickup retains added seventh',()=>{
 const legacy={...opts,genreRevision:1};
 for(const id of ['pop','house']){
  const notes=performance(parseChart('C | C'),id,legacy);assert.ok(notes.some(n=>n.beat===4&&n.part==='bass'),id);
  const short=performance(parseChart('C:3.5 G:0.5 | C'),id,legacy);assert.ok(short.some(n=>n.beat>=3.5&&n.beat<4&&n.note%12===7),id);
  const split=performance(parseChart('C:2 Am7:2'),id,legacy),onset=id==='pop'?1.5:1.75;
  const target=voicePlan(parseChart('C:2 Am7:2'))[1].notes.slice(1).sort((a,b)=>a-b);
  assert.deepEqual(split.filter(n=>n.part==='upper'&&Math.abs(n.beat-onset)<1e-7).map(n=>n.note).sort((a,b)=>a-b),target,id);
 }
});
test('ordinary bar lines do not add full-chord attacks to sparse legacy templates',()=>{
 for(const id of ['ballad','dembow','afrobeats','alberti']){
  const notes=performance(Array.from({length:26},()=>({chords:[{symbol:'C',beats:4}]})),id,{...opts,genreRevision:1});
  assert.deepEqual(positions(notes,'upper',24),positions(notes,'upper',0),id);
  assert.deepEqual(positions(notes,'bass',24),positions(notes,'bass',0),id);
 }
});
test('new profiles maintain pre-cut attacks, rests, short chords and MIDI-safe boundaries',()=>{
 for(const id of Object.keys(genreProfiles)){
  const single=performance(parseChart('Cmaj7'),id,opts),split=performance(parseChart('Cmaj7:2 G7:2'),id,opts);
  const fp=notes=>notes.filter(n=>n.beat<2).map(n=>[n.beat,n.part]);assert.deepEqual(fp(split),fp(single),id);
  for(const human of [0,1]){
   const bars=[...parseChart('C:.125 G:.125 Am:1.75 F:2'),{chords:[]},{chords:[{symbol:'Dm',beats:2},{symbol:'N.C.',beats:2}]}],notes=performance(bars,id,{...opts,human,swing:.32}),last=new Map();
   for(const n of notes){assert.ok(n.beat>=0&&n.duration>0&&n.beat+n.duration<=10+1e-7,id);assert.ok(n.beat<4||n.beat>=8,id);assert.ok((last.get(n.note)??0)<=n.beat+1e-7,id);last.set(n.note,n.beat+n.duration);}
  }
 }
});
test('version switch is explicit, preserves unrelated parameters, and never changes legacy ARP or POP',()=>{
 const old={genreRevision:1,human:.27,gate:.63,seed:71,swing:.08,pianoRevision:1};
 const selected=selectGenre(old,'house');assert.equal(selected.genreRevision,2);assert.equal(selected.swing,9);
 for(const field of ['human','gate','seed','pianoRevision'])assert.equal(selected[field],old[field]);
 for(const id of ['arp','pianoBallad'])assert.deepEqual(performance(parseChart('C G | Am F'),id,{...opts,genreRevision:1}),performance(parseChart('C G | Am F'),id,opts));
});
test('splitting identical modern harmony cannot cut releases or change notes',()=>{
 for(const id of Object.keys(genreProfiles))assert.deepEqual(performance(parseChart('Cmaj7:2 Cmaj7:2 | Cmaj7'),id,opts),performance(parseChart('Cmaj7 | Cmaj7'),id,opts),id);
});
test('Funk and Soul include weak-slot bass passing tones without changing target pickups',()=>{
 for(const id of ['funk','soul']){
  const notes=performance(parseChart('C7 | C7'),id,opts);assert.ok(notes.some(n=>n.part==='bass'&&n.note%12===11),id);
  assert.ok(notes.filter(n=>n.part==='bass').every(n=>n.note>=24&&n.note<=48),id);
 }
 const n=performance(parseChart('C7 | G7'),'funk',opts).filter(n=>n.part==='bass'&&Math.abs(n.beat-3.75)<1e-8);assert.ok(n.length);assert.ok(n.every(n=>n.note%12===11)); // Passing B belongs to C; G arrives on beat 4.
});

test('genre-specific bass anticipation preserves Funk, Bossa, Pop and Afrobeats downbeats',()=>{
 for(const id of ['funk','bossa','pop','afrobeats']){
  const notes=performance(parseChart('C | Am | F | G'),id,opts);
  for(const [beat,root] of [[4,9],[8,5],[12,7]])assert.ok(notes.some(n=>n.part==='bass'&&Math.abs(n.beat-beat)<1e-7&&n.note%12===root),id+' '+beat);
 }
});
