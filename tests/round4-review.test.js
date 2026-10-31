import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse,spellPitch} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {styles,mutate} from '../dist/style-engine.js';
import {createHarmony,applyHarmonyAction as act,harmonyView,effectiveKey} from '../dist/harmony-state.js';
import {examplesForKey} from '../dist/keyed-examples.js';
import {extraChordChoices} from '../dist/chord-input.js';
import {degreeLabels,chartToDegrees,formatDegreeChart} from '../dist/degree-chart.js';
import {readSession} from '../dist/session-storage.js';
import {insertCadence} from '../dist/harmony-actions.js';
import {BeatPlayer} from '../dist/tempo-player.js';
import {virtualPiano} from './helpers/virtual-piano.js';
import {morphProfiles} from '../dist/morph-profiles.js';
const key={root:0,tonic:'C',mode:'major'};
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('R04 P1-A: tonal dance exercise metadata filters minor examples from major lists',()=>{
 for(const style of ['Latin Pop','Amapiano','Reggaeton','Dancehall'])for(let root=0;root<12;root++){
  const major=examplesForKey(style,{root,mode:'major'}),minor=examplesForKey(style,{root,mode:'minor'});
  assert.ok(major.length+minor.length>0,style);
  if(style==='Latin Pop')assert.ok(major.length&&minor.length);
  assert.ok(major.every(p=>p.enteredKey.mode==='major'));
  assert.ok(minor.every(p=>p.enteredKey.mode==='minor'));
  if(style==='Latin Pop')assert.ok(!major.some(p=>p.id==='exercise-Latin Pop-1'));
 }
});
test('R04 P1-A/P2-6: all regional keys/examples load, morph and restore; Flamenco accepts authored Phrygian bIII and major I',()=>{
 let cases=0;
 for(const style of Object.keys(styles).filter(s=>styles[s].world))for(const mode of ['major','minor'])for(let root=0;root<12;root++){
  const s=createHarmony({style,key:{root,mode},locked:true});
  for(const example of examplesForKey(style,effectiveKey(s))){
   const loaded=act(s,{type:'example',id:example.id}),out=act(loaded,{type:'generate',options:{randomness:'high'}});
   assert.equal(out.origin.type,'morph');assert.deepEqual(out.key,loaded.key);
   assert.deepEqual(act(out,{type:'restore'}).score,loaded.backbone.degrees);cases++;
  }
 }
 for(const text of ['Am | G | F | E7','Dm | C | Bb | A','A | C | Bb | A']){
  const s=createHarmony({style:'Flamenco',text,key:{root:9,mode:'minor'},locked:true});
  const out=act(s,{type:'generate',options:{randomness:'high'}});
  assert.equal(effectiveKey(out).mode,'hijaz');assert.equal(out.origin.type,'morph');assert.deepEqual(out.key,s.key);
 }
 assert.ok(cases>1000);console.log('R04 regional LOAD/MORPH rejected 0 /',cases);
});

test('R04 P2-B: live MORPH switches on next bar with sub-ms attacks, including prefetch, repeated MORPH, cues and tempo changes',()=>{
 let attacks=0,maxError=0;
 for(const bpm of [60,120,137,240])for(const cue of [0,1,2,3])for(const changeTempo of [false,true]){
  const length=(4-cue)*4,old=Array.from({length:length*2},(_,i)=>({note:60,beat:i/2,duration:.4,velocity:.8}));
  const fresh=old.map(n=>({...n,note:67})),piano=virtualPiano(),p=new BeatPlayer(piano,old,length,{bpm,loop:true,lead:0});
  // Absolute beat 9.925 (third bar) where possible; otherwise later cycle.
  const press=9.925,cut=12,pressTime=press*60/bpm;
  for(let time=0;time<pressTime;time+=.025){piano.context.currentTime=time;p.pump();}
  piano.context.currentTime=pressTime;p.setNotes(fresh,length,{quantize:4});near(p.beatAt(),press);
  if(changeTempo)p.setTempo(120);
  const end=p.timeAt(16);
  for(let time=pressTime;time<end;time+=.025){piano.context.currentTime=time;p.pump();}
  for(const v of piano.voices.filter(v=>!v.cancelled&&v.when>=pressTime)){
   const beat=p.beatAt(v.when);assert.equal(v.note,beat<cut?60:67);
   const error=Math.abs(beat*2-Math.round(beat*2))/2*60/p.bpm;
   maxError=Math.max(maxError,error);assert.ok(error<.001);attacks++;
  }
  // Replace a prefetched switch before its boundary: only the final requested score sounds.
  piano.context.currentTime=p.timeAt(17.9);p.pump();
  p.setNotes(old,length,{quantize:4});p.setNotes(fresh.map(n=>({...n,note:72})),length,{quantize:4});
  p.setLoop(true);piano.context.currentTime=p.timeAt(19.9);p.pump();
  const pending=piano.voices.filter(v=>!v.cancelled&&v.when>=p.timeAt(20));
  assert.ok(pending.length>0);assert.ok(pending.every(v=>v.note===72));
 }
 console.log('R04 quantized MORPH attacks',attacks,'max error ms',maxError*1000);
});
test('R04 P2-B: queued MORPH clips held tails and LOOP off cancels next-cycle attacks',()=>{
 const piano=virtualPiano(),p=new BeatPlayer(piano,[{note:60,beat:0,duration:8,velocity:1}],4,{bpm:120,loop:true,lead:0});p.pump();
 piano.context.currentTime=1.95;p.pump();p.setNotes([{note:67,beat:0,duration:4,velocity:1}],4,{quantize:4});p.setLoop(true);
 near(piano.voices[0].end,2);assert.ok(piano.voices.some(v=>v.note===67&&!v.cancelled&&v.when===2));
 p.setLoop(false);assert.ok(piano.voices.filter(v=>v.when>=2).every(v=>v.cancelled));
 piano.context.currentTime=2;assert.equal(p.pump(),false);
});


test('R04 P2-B: queued carry-in notes retain their end through LOOP toggles; rapid switches cross the boundary safely',()=>{
 const piano=virtualPiano(),old=[{note:60,beat:0,duration:16,velocity:1}],fresh=[{note:67,beat:2,duration:5,velocity:1}];
 const p=new BeatPlayer(piano,old,16,{bpm:60,loop:true,lead:0});p.pump();
 piano.context.currentTime=3.9;p.setNotes(fresh,16,{quantize:4});p.setLoop(true);
 const carried=piano.voices.find(v=>v.note===67&&!v.cancelled);near(carried.when,4);near(carried.end,7);
 piano.context.currentTime=4.01;p.setNotes([{note:72,beat:0,duration:16,velocity:1}],16,{quantize:4});
 assert.equal(p.notes,fresh);near(p.pending.cut,8);p.setLoop(false);p.setLoop(true);near(carried.end,7);
 piano.context.currentTime=7.9;p.pump();assert.ok(piano.voices.some(v=>v.note===72&&!v.cancelled&&v.when===8));
});

test('R04 P2-C: NEXT follows every FROM BAR loop entry, multi-chord slots and adjacent rests',()=>{
 for(const chart of ['C | G | Dm | F','C:2 Am:2 | G | Dm:1 F:3 | F','C | G | | F']){
  const bars=parseChart(chart);
  for(let startBar=0;startBar<bars.length;startBar++){
   const target=bars[startBar].chords[0]?.symbol;
   if(target)assert.equal(insertCadence(bars,3,0,{loop:true,startBar}).target,target);
   else assert.throws(()=>insertCadence(bars,3,0,{loop:true,startBar}),/沒有相鄰/);
   assert.throws(()=>insertCadence(bars,3,0,{loop:false,startBar}),/沒有相鄰/);
  }
 }
 assert.equal(insertCadence(parseChart('C:2 Am:2 | G | Dm | F'),0,0,{loop:true,startBar:2}).target,'Am');
 assert.match(read('dist/app.js'),/insertCadence\(bars,selected,selectedChord,\{loop:\$\('loop'\).checked,startBar\}\)/);
});
test('R04 P2-D: all styles have technique profiles; tonal four-bar high yields >=10/12 and same-seed styles differ',()=>{
 assert.deepEqual(Object.keys(morphProfiles).sort(),Object.keys(styles).sort());
 const variants=new Set(),shapes=new Set(),counts={};
 for(const style of Object.keys(styles).filter(s=>!styles[s].world&&!['Dorian folk','Phrygian dominant','Heavy Metal'].includes(s))){
  let s=createHarmony({text:'C | G | Am | F',style,key,locked:true});const unique=new Set();
  for(let i=0;i<12;i++){s=act(s,{type:'generate',options:{randomness:'high'}});unique.add(serialize(harmonyView(s).bars));}
  assert.ok(unique.size>=10,style+' '+unique.size);counts[style]=unique.size;
  const result=mutate(parseChart('C | G | Am | F'),{style,tonality:key,seed:1,randomness:'high'});
  variants.add(serialize(result));
  shapes.add(JSON.stringify(result.map(b=>b.chords.map(c=>{const p=parse(c.symbol);return [p.root,p.bass,c.beats];}))));
 }
 assert.ok(variants.size>=10);assert.ok(shapes.size>=10);console.log('R04 tonal diversity',counts,'same-seed distinct',variants.size,'root/bass/timing shapes',shapes.size);
 let retained=0,colored=0;
 for(let seed=0;seed<80;seed++)for(const c of mutate(parseChart('C | G | Am | F'),{style:'Jazz',tonality:key,seed,randomness:'high'}).flatMap(b=>b.chords).filter(c=>c.morph.technique==='retained-target')){
  retained++;if(parse(c.symbol).intervals.length>3)colored++;
 }
 assert.ok(colored>retained/2);console.log('R04 Jazz retained coloured',colored,'/',retained);
});
test('R04 P2-2: 3920 automatic MORPH outputs have no ii sharing the preceding final root',()=>{
 let cases=0,ii=0;
 for(const style of Object.keys(styles))for(let seed=0;seed<80;seed++){
  const out=mutate(parseChart('C | G | Am | F'),{style,tonality:key,seed,randomness:'high',density:3}),flat=out.flatMap(b=>b.chords);
  flat.forEach((c,i)=>{if(c.morph.part==='ii'){ii++;assert.notEqual(parse(c.symbol).root,parse(flat[(i+flat.length-1)%flat.length].symbol).root,style+' '+seed+' '+serialize(out));}});cases++;
 }
 assert.equal(cases,3920);assert.ok(ii>100);console.log('R04 same-root ii: 0 /',cases,'outputs;',ii,'ii events');
});
test('R04 P2-5: slash degrees on tiles and COPY share spelling in all 24 keys',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const k={root,mode},degrees=chartToDegrees(parseChart('G/B | C/E | E7/G# | Am/G'),k),labels=degreeLabels(degrees,k).flat();
  assert.deepEqual(formatDegreeChart(degrees,k,{bassNames:true}).split('|').map(x=>x.trim()).filter(Boolean),labels);
  assert.ok(labels.every(s=>!s.match(/\/[A-G]/)));
 }
});
test('R04 P2-9: INSPIRE survives JSON storage as preview; KEEP and RESTORE retain their meaning',()=>{
 let s=act(createHarmony({key,locked:true}),{type:'inspire'});const raw=JSON.stringify({harmony:s});
 const reload=readSession({getItem:k=>k==='khimaira-v5'?raw:null,setItem(){throw Error('must not quarantine');}}).harmony;
 assert.deepEqual(reload,s);assert.equal(reload.origin.type,'inspire');
 assert.deepEqual(act(reload,{type:'restore'}).score,s.backbone.degrees);
 assert.deepEqual(act(reload,{type:'keep',confirmed:true}).backbone.degrees,s.score);
 assert.match(read('dist/app.js'),/seedMood.*INSPIRE · 預覽/);
});
test('R04 P2-G: borrowed extensions and chromatic picker agree without deciding minor sixth spelling',()=>{
 const k={root:9,tonic:'A',mode:'minor'};
 assert.equal(spellPitch(6,k),'Gb');assert.equal(extraChordChoices(k).find(c=>c.label==='vi').symbol,'Gbm');
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const s=createHarmony({key:{root,mode},locked:true});
  for(const choice of extraChordChoices(s.key).filter(c=>!c.label.startsWith('V7/')))assert.equal(parse(choice.symbol).rootName,spellPitch(parse(choice.symbol).root,s.key));
 }
});
test('R04 P2-E/7: host CI explicitly checks label-in-name and first-screen MORPH',()=>{
 const ci=read('tests/browser-web-ci.cjs');assert.match(ci,/browser-round4-checks/);
 assert.match(read('tests/browser-round4-checks.cjs'),/label-content-name-mismatch/);
 assert.match(read('tests/browser-loop.cjs'),/dock.y\+dock.height<=900/);
 assert.match(read('.github/workflows/pages.yml'),/npm run verify:web/);
});
test('R04 P2-F: release docs agree on default bass preservation and drop obsolete release assertions',()=>{
 for(const name of ['README.md','docs/morph-backbone/README.md','docs/reviews/CONFIRMED-THEORY.md']){
  const text=read(name);assert.match(text,/保留低音線.{0,10}預設關閉/);assert.doesNotMatch(text,/preserves authored chord onsets, roots and slash basses|web-v1\.0\.4.*尚未/);
 }
 assert.equal(JSON.parse(read('dist/version.json')).version,'1.0.7');
});
