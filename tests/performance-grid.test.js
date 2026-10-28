import test from 'node:test';
import assert from 'node:assert/strict';
import {performance,patterns,voicePlan} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
import {newGenreIds} from '../dist/genre-rhythm.js';
import {gridTarget} from '../dist/performance-grid.js';
import {parse,mod} from '../dist/music.js';

const opts={human:0,swing:0,gate:.8,pianoFills:'off',pianoPhrase:'original',melodyFollow:'off'};
const ids=Object.keys(patterns).filter(id=>!newGenreIds.includes(id));
const hits=(notes,start=0,end=Infinity)=>[...new Set(notes.filter(n=>n.beat>=start-1e-8&&n.beat<end-1e-8).map(n=>`${n.beat.toFixed(7)}:${n.part}`))].sort();
const at=(notes,beat,part)=>notes.filter(n=>n.part===part&&Math.abs(n.beat-beat)<1e-7);
const arrivalBeat=(id,cut,part)=>cut+(id==='lofi'&&part==='upper'?.03*92/60:0);
const bar=chords=>({chords:chords.map(([symbol,beats])=>({symbol,beats}))});
const plain=parseChart('C | C | C | C');

test('all patterns keep their first-half attack/role grid when a bar is split, including recalled piano revision 1',()=>{
 for(const id of ids)for(const pianoRevision of [1,2]){
  const single=performance(parseChart('C'),id,{...opts,pianoRevision});
  const split=performance(parseChart('C:2 G:2'),id,{...opts,pianoRevision});
  assert.deepEqual(hits(split,0,2),hits(single,0,2),`${id} revision ${pianoRevision}`);
 }
});

test('a preceding split cannot select another bar variant or change the next bar grid',()=>{
 const split=[bar([['C',2],['C',2]]),...plain.slice(1)];
 for(const id of ids){
  const a=performance(plain,id,opts),b=performance(split,id,opts);
  assert.deepEqual(hits(b,4,16),hits(a,4,16),id);
 }
});

test('all accompaniment patterns cover split changes with bass and upper arrivals or a sustained pickup',()=>{
 for(const id of ids.filter(id=>id!=='arp'))for(const cut of [.375,1,1.75,2,2.25,3.5]){
  const notes=performance([bar([['C',cut],['G',4-cut]])],id,opts);
  for(const part of ['bass','upper'])assert.ok(notes.some(n=>n.part===part&&(Math.abs(n.beat-arrivalBeat(id,cut,part))<1e-7||n.beat<cut&&n.beat+n.duration>cut+1e-7)),`${id} ${cut} ${part}`);
 }
});

test('house second half uses original bar slots, not a new template at beat two',()=>{
 const notes=performance(parseChart('C:2 G:2'),'house',opts);
 assert.deepEqual(hits(notes,2),['2.0000000:bass','2.5000000:bass','3.5000000:upper','3.7500000:bass']);
 // Upper pickup supplies G through beat 2; the low root arrives at beat 2.
 const plan=voicePlan(parseChart('C:2 G:2'));
 assert.deepEqual(at(notes,1.75,'upper').map(n=>n.note),[...plan[1].notes.slice(1)].sort((a,b)=>a-b));
 assert.ok(at(notes,1.75,'upper').every(n=>n.beat+n.duration>2));
 assert.equal(at(notes,2,'upper').length,0);
});

test('off-grid changes add missing parts then resume the original slots',()=>{
 for(const id of ['house','funk','rnb','soul','lofi','neosoul','jazz','afrobeats','amapiano','dembow','dancehall','arpUp']){
  const cut=2.125,a=performance(parseChart('C'),id,opts),b=performance([bar([['C',cut],['G',4-cut]])],id,opts);
  const expected=hits(a,cut).filter(h=>!h.startsWith(cut.toFixed(7)));
  const grid=b.filter(n=>Math.abs(n.beat-arrivalBeat(id,cut,n.part))>1e-7);
  assert.deepEqual(hits(grid,cut+1e-6),expected,id);
  for(const part of ['bass','upper'])assert.ok(b.some(n=>n.part===part&&(Math.abs(n.beat-arrivalBeat(id,cut,part))<1e-7||n.beat<cut&&n.beat+n.duration>cut+1e-7)),`${id}: missing ${part}`);
 }
});

test('pickups use the next chord; release the old part, sustain over the change, and never reattack it at the change',()=>{
 for(const [id,cut,pickup,part] of [['house',2,1.75,'upper'],['funk',2,1.75,'upper'],['pop',2,1.5,'upper'],['latinPop',2,1.5,'upper']]){
  const notes=performance([bar([['C',cut],['G',4-cut]])],id,opts),chord=parse('G');
  const early=at(notes,pickup,part);assert.ok(early.length,`${id} no pickup`);
  assert.ok(early.every(n=>chord.pcs.includes(mod(n.note))&&n.beat+n.duration>cut),id);
  assert.equal(at(notes,cut,part).length,0,id+' redundant arrival');
  assert.ok(notes.filter(n=>n.part===part&&n.beat<pickup).every(n=>n.beat+n.duration<=pickup+1e-7),id+' old harmony rings into pickup');
 }
});

test('pickup selection never crosses N.C., a short intermediate chord, or the chart end',()=>{
 const rest=voicePlan([bar([['C',1.75],['N.C.',.25],['G',2]])]);
 assert.equal(gridTarget(rest,0,1.5,'house').anticipated,false);
 const dense=voicePlan([bar([['C',1.75],['F',.25],['G',2]])]);
 assert.equal(gridTarget(dense,0,1.5,'house').chord.symbol,'F');
 assert.equal(gridTarget(dense,2,3.75,'house').anticipated,false);
});

test('all patterns respect leading/trailing rests, dense short segments and MIDI-safe boundaries',()=>{
 const charts=[
  [bar([['N.C.',.375],['C',1.75],['G',1.875]]),{chords:[]},bar([['Dm',2],['N.C.',2]])],
  [bar([['C',.125],['G',.125],['Am',1.75],['F',2]])],
 ];
 for(const id of ids)for(const bars of charts)for(const human of [0,1]){
  const notes=performance(bars,id,{...opts,human,swing:.32,loop:true}),plan=voicePlan(bars),last=new Map();
  for(const n of notes){
   assert.ok(Number.isFinite(n.note)&&n.duration>0&&n.beat>=0&&n.beat+n.duration<=bars.length*4+1e-7,id);
   assert.ok(plan.some(s=>n.beat>=s.beat-1e-7&&n.beat<s.beat+s.beats-1e-7),id+' note in rest');
   for(let i=0;i<plan.length;i++){const s=plan[i],end=s.beat+s.beats;if((!plan[i+1]||plan[i+1].beat>end+1e-7)&&n.beat<end)assert.ok(n.beat+n.duration<=end+1e-7,id+' sustains into rest');}
   assert.ok((last.get(n.note)??0)<=n.beat+1e-7,id+' overlap');last.set(n.note,n.beat+n.duration);
  }
 }
});

test('ARP phase remains an explicit note-order choice on the same timing grid',()=>{
 const bars=parseChart('C:1.75 G:2.25'),options={...opts,arpMode:'up',arpRate:'16',arpOctaves:2};
 const chord=performance(bars,'arp',{...options,arpPhase:'chord'}),flow=performance(bars,'arp',{...options,arpPhase:'flow'});
 assert.deepEqual(chord.map(n=>n.beat),flow.map(n=>n.beat));assert.notDeepEqual(chord.map(n=>n.note),flow.map(n=>n.note));
 assert.equal(chord.length,16);assert.ok(chord.every(n=>n.part==='upper'));
});

test('a swung grid hit that passes a chord boundary uses the new harmony rather than disappearing',()=>{
 const bars=[bar([['C',1.8],['G',2.2]])],notes=performance(bars,'fusion',{...opts,swing:.3});
 // Fusion's 2.75 slot is delayed to 2.9; test a change between those positions.
 const later=performance([bar([['C',2.8],['G',1.2]])],'fusion',{...opts,swing:.3});
 const hit=at(later,2.9,'upper');assert.ok(hit.length);
 assert.ok(hit.every(n=>parse('G').pcs.includes(mod(n.note))));
 assert.ok(notes.length);
});
