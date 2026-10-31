import test from 'node:test';
import assert from 'node:assert/strict';
import {BeatPlayer} from '../dist/tempo-player.js';
import {playbackSlice} from '../dist/transport.js';
import {performance,voicePlan} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
import {midiBytes,analyzeHarmony} from '../dist/music.js';
import {insertCadence} from '../dist/harmony-actions.js';
import {detectKey} from '../dist/key-detection.js';
import {createHarmony,applyHarmonyAction as act,harmonyView} from '../dist/harmony-state.js';
import {virtualPiano} from './helpers/virtual-piano.js';
import {readMidi} from './helpers/midi-reader.js';
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('100 loops: 1/3/4/16 bars, arbitrary cues, multi-chord bars; zero cumulative grid/MIDI drift',()=>{
 let cases=0,attacks=0,maxGrid=0,maxMidi=0;
 for(const length of [1,3,4,16])for(const startBar of new Set([0,Math.floor(length/2),length-1]))for(const pattern of ['sustain','arp','jazz']){
  const bars=parseChart(Array.from({length},(_,i)=>['C:2 Am:2','Dm7:2 G7:2','Cmaj7:1 Am:1 F:1 G7:1'][i%3]).join(' | '));
  const notes=performance(bars,pattern,{human:0,swing:0,arpRate:'24',arpOctaves:1,seed:42}),clip=playbackSlice(notes,startBar,length),piano=virtualPiano(),bpm=137;
  const p=new BeatPlayer(piano,clip.notes,clip.beats,{bpm,loop:true,lead:0});
  const end=p.timeAt(clip.beats*100),midi=readMidi(midiBytes(clip.notes,clip.beats,{bpm}));
  // Time advances in 25ms scheduler blocks; no sleep or physical audio device.
  for(let block=0;block*.025<end;block++){
   piano.context.currentTime=block*.025;
   if(p.beatAt()>=clip.beats*99&&p.stopBeat===Infinity)p.setLoop(false);
   p.pump();
  }
  piano.context.currentTime=end;assert.equal(p.pump(),false);
  const actual=piano.voices.filter(v=>!v.cancelled).sort((a,b)=>a.when-b.when||a.note-b.note),unit=[...clip.notes].sort((a,b)=>a.beat-b.beat||a.note-b.note);
  assert.equal(actual.length,unit.length*100,`${length}/${startBar}/${pattern} duplicate or missed note`);
  const tickNotes=[...midi.notes].sort((a,b)=>a.start-b.start||a.note-b.note);assert.equal(tickNotes.length,unit.length);
  for(let i=0;i<actual.length;i++){
   const v=actual[i],cycle=Math.floor(i/unit.length),j=i%unit.length,n=unit[j];
   assert.equal(v.note,n.note);const expected=(cycle*clip.beats+n.beat)*60/bpm;
   const gridError=Math.abs(v.when-expected),midiError=Math.abs(v.when-(cycle*clip.beats+tickNotes[j].start/480)*60/bpm);
   maxGrid=Math.max(maxGrid,gridError);maxMidi=Math.max(maxMidi,midiError);near(v.when,expected);near(v.end,(cycle*clip.beats+n.beat+n.duration)*60/bpm);
   assert.ok(midiError<=60/bpm/960+1e-8);assert.ok(v.end<=end+1e-8);
  }
  attacks+=actual.length;cases++;
 }
 console.log('LOOP:',cases,'virtual 100-cycle cases;',attacks,'attacks; max grid drift',maxGrid,'seconds; max MIDI error',maxMidi,'seconds');
});
test('loop tail/head MIDI note-offs and CC64 reset before next cycle; split and merged',()=>{
 for(const split of [false,true]){
  const bars=parseChart('C:2 Am:2 | Dm7:2 G7:2 | Cmaj7'),notes=performance(bars,'sustain'),spans=voicePlan(bars).map(c=>({start:c.beat,end:c.beat+c.beats,symbol:c.symbol}));
  const m=readMidi(midiBytes(notes,12,{split,pedal:true,chordSpans:spans,bpm:137}));
  const cc=m.controls.filter(c=>c.controller===64);assert.equal(cc.at(-1).tick,5760);assert.equal(cc.at(-1).value,0);assert.ok(m.notes.every(n=>n.end<=5760));
  let down=false,last=0;
  for(let cycle=0;cycle<100;cycle++){
   assert.equal(down,false,'pedal stuck at seam');
   for(const event of cc){const tick=cycle*5760+event.tick;assert.ok(tick>=last);down=event.value>=64;last=tick;}
  }
  assert.equal(down,false);
 }
});
test('live changes keep fractional beat and common held voice; future notes cancelled, no stale attacks',()=>{
 let s=createHarmony({text:'C:2 Am:2 | Dm7:2 G7:2 | C | A7',locked:true}),pattern='sustain';
 const piano=virtualPiano(),render=()=>performance(harmonyView(s).bars,pattern,{human:0,swing:0,arpRate:'24'}),p=new BeatPlayer(piano,render(),16,{bpm:137,loop:true,lead:0});p.pump();
 const initial=piano.voices[0];piano.context.currentTime=.17;const before=p.beatAt();p.setNotes(render());near(p.beatAt(),before);assert.equal(piano.voices.filter(v=>v.note===initial.note&&v.when<=.17&&!v.cancelled).length,1);assert.ok(initial.retimes);
 const changes=[()=>{s=act(s,{type:'generate',options:{randomness:'high'}});},()=>{s=act(s,{type:'compare',index:'backbone'});},()=>{s=act(s,{type:'compare',index:0});},()=>{s=act(s,{type:'style',style:'Rock'});pattern='rock';},()=>{s=act(s,{type:'undo'});pattern='arp';}];
 for(let i=0;i<100;i++){
  piano.context.currentTime+=.013;const beat=p.beatAt();
  p.setTempo([60,137,240][i%3]);near(p.beatAt(),beat);
  changes[i%changes.length]();p.setNotes(render());near(p.beatAt(),beat);assert.equal(p.stopBeat,Infinity);
  for(const v of piano.voices.filter(v=>!v.cancelled&&v.when>piano.context.currentTime))assert.ok(v.when<=piano.context.currentTime+p.lookahead+1e-8);
 }
 p.setLoop(false);piano.context.currentTime=p.timeAt(p.stopBeat);assert.equal(p.pump(),false);
 assert.ok(piano.voices.filter(v=>!v.cancelled).every(v=>v.end<=piano.context.currentTime+1e-8));
});
test('disabling LOOP cancels prefetched next-cycle notes and clips held tails; enabling requeues once',()=>{
 const piano=virtualPiano(),p=new BeatPlayer(piano,[{note:60,beat:0,duration:4,velocity:.7},{note:67,beat:3.8,duration:1,velocity:.6}],4,{bpm:120,loop:true,lead:0});
 p.pump();piano.context.currentTime=1.9;p.pump();assert.ok(piano.voices.some(v=>v.when===2));p.setLoop(false);
 assert.ok(piano.voices.filter(v=>v.when===2).every(v=>v.cancelled));assert.ok(piano.voices.filter(v=>!v.cancelled).every(v=>v.end<=2));
 p.setLoop(true);near(piano.voices.find(v=>v.note===67&&!v.cancelled).end,2.4);p.pump();assert.equal(piano.voices.filter(v=>v.when===2&&!v.cancelled).length,1);
 p.setLoop(false);piano.context.currentTime=2;assert.equal(p.pump(),false);
});
test('ii–V NEXT and shared key/secondary analysis respect loop on/off at tail/head',()=>{
 const bars=parseChart('Dm7 | G7 | Cmaj7 | A7'),key={root:0,mode:'major'};
 assert.equal(analyzeHarmony(bars,key,{loop:true}).events.at(-1).label,'V7/ii');
 assert.equal(analyzeHarmony(bars,key,{loop:false}).events.at(-1).target,null);
 assert.equal(detectKey(bars,{loop:true}).primary.root,0);
 const source=parseChart('C | Am | F | F');assert.throws(()=>insertCadence(source,3,0,{loop:false}),/LOOP/);
 const inserted=insertCadence(source,3,0,{loop:true});assert.equal(inserted.target,'C');assert.equal(inserted.bars.at(-1).chords.at(-1).symbol,'G7');
 for(const loop of [false,true])for(let seed=0;seed<30;seed++){
  const s=act(createHarmony({text:'C | Am | F | F',locked:true}),{type:'generate',options:{loop,seed,randomness:'high'}});
  for(const c of s.score.at(-1).chords)if(c.morph.target?.bar===0)assert.ok(loop,'disabled loop created wrap target');
 }
});
