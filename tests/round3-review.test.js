import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,chordTones,mod,transposeSymbol,midiBytes,analyzeHarmony} from '../dist/music.js';
import {createTheory} from '../packages/music-core/core.js';
import {performance} from '../dist/performance.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {createHarmony,applyHarmonyAction as act,harmonyView,effectiveKey} from '../dist/harmony-state.js';
import {mutate,styles} from '../dist/style-engine.js';
import {examplesForKey} from '../dist/keyed-examples.js';
import {worldScales} from '../dist/world-styles.js';
import {detectKey} from '../dist/key-detection.js';
import {chartToDegrees,degreeLabels,formatDegreeChart,parseDegreeChart,materializeChart} from '../dist/degree-chart.js';
import {spellSelectedChord} from '../dist/chord-input.js';
import {readMidi} from './helpers/midi-reader.js';
const key={root:0,tonic:'C',mode:'major'};
const transpose=(text,shift,mode='major')=>parseChart(text).map(b=>({chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,shift,shift,mode)}))}));
test('R03-01 close/open contextual slash voicings retain root in MIDI: 8 types × 12 keys × 2 voicings',()=>{
 let cases=0;
 for(const symbol of ['Dm9/F','Am9/C','G9/B','Fmaj9/A','C69/E','Fmaj7/A','Cm11/Eb','C13/E'])for(let shift=0;shift<12;shift++)for(const voicing of ['close','open']){
  const bars=transpose('C | '+symbol+' | G7 | C',shift),root=parse(bars[1].chords[0].symbol).root;
  const ns=performance(bars,'sustain',{voicing}),midi=readMidi(midiBytes(ns,16));
  assert.ok(midi.notes.filter(n=>n.start===1920).some(n=>mod(n.note)===root),symbol+' '+shift+' '+voicing);cases++;
 }
 assert.equal(cases,192);
 const ns=performance(parseChart('C | Dm9/F | G7 | C'),'sustain',{voicing:'rootless'});
 assert.ok(!ns.filter(n=>n.beat===4).some(n=>mod(n.note)===2));
});
test('R03-03 all 49 styles and 24 keys: every keyed example LOAD → MORPH is accepted and mapped',()=>{
 let cases=0;
 for(const style of Object.keys(styles))for(const mode of ['major','minor'])for(let root=0;root<12;root++){
  const initial=createHarmony({style,key:{root,mode},locked:true});
  for(const example of examplesForKey(style,effectiveKey(initial))){
   const loaded=act(initial,{type:'example',id:example.id}),out=act(loaded,{type:'generate',options:{seed:1,randomness:'high'}});
   assert.equal(out.origin.type,'morph',style+' '+example.chart);assert.deepEqual(out.key,loaded.key);assert.deepEqual(out.backbone,loaded.backbone);
   assert.ok(out.score.flatMap(b=>b.chords).every(c=>c.morph?.source));cases++;
  }
 }
 assert.ok(cases>5000);console.log('R03-03 accepted keyed examples:',cases);
});
test('R03-03 new modal pitches are checked against each source slot, including minor V and applied dominants',()=>{
 for(const [style,text] of [['Latin Pop','Am | Dm | E7 | Am'],['Amapiano','Cm | Fm | G7 | Cm'],['Dancehall','C | A7 | Dm | G7'],['Reggaeton','Am | Dm | E7 | Am'],['Flamenco','F | C | Bb | A'],['Dorian folk','Dm7 | G7'],['Celtic Dorian','Am | D']])for(let seed=0;seed<12;seed++){
  const s=createHarmony({style,text}),k=effectiveKey(s),out=act(s,{type:'generate',options:{seed,randomness:'high'}}),source=harmonyView(s).bars;
  assert.equal(out.origin.type,'morph');assert.deepEqual(out.key,s.key);
  const scale=worldScales[k.mode]||worldScales[styles[style].scaleIds?.[0]],allowed=scale.intervals.map(n=>mod(n+k.root));
  for(const c of harmonyView(out).bars.flatMap(b=>b.chords)){
   const a=c.morph.source,old=parse(source[a.bar].chords[a.chord].symbol),p=parse(c.symbol);
   assert.ok([...p.pcs,p.bass].every(n=>allowed.includes(n)||old.pcs.includes(n)||n===old.bass),style+' '+c.symbol);
  }
 }
});
test('R03-04 forty seeds yield >=10 results and expose functional budget limits',()=>{
 for(const text of ['Dm7 | G7 | Cmaj7 | A7','C | A7 | Dm | G7','C | Am | F | G']){
  const s=createHarmony({text,key,locked:true}),variants=new Set();let used=0;
  for(let seed=0;seed<40;seed++){
   const out=act(s,{type:'generate',options:{seed,randomness:'high'}}),bars=harmonyView(out).bars;variants.add(serialize(bars));
   const count=new Set(bars.flatMap(b=>b.chords).filter(c=>['parallel','inversion','ii-V'].includes(c.morph.technique)).map(c=>JSON.stringify(c.morph.source))).size;used+=count;
   if(count<2){assert.equal(out.warning?.type,'technique-limit');assert.equal(out.warning.used,count);assert.equal(out.warning.budget,2);}
  }
  assert.ok(variants.size>=10,text+' '+variants.size);console.log('R03-04',text,'variants',variants.size,'mean techniques',used/40);
 }
});
test('R03-05/07 one hundred A/B auditions retain undo before LOAD and history labels retain level',()=>{
 let s=createHarmony(),original=structuredClone(s);s=act(s,{type:'load',text:'Dm7 | G7 | C | C'});s=act(s,{type:'generate',options:{randomness:'high'}});
 const history=structuredClone(s.history);assert.equal(s.morphHistory.at(-1).level,'high');
 for(let i=0;i<100;i++)s=act(s,{type:'compare',index:i%2?0:'backbone'});
 assert.deepEqual(s.history,history);s=act(act(s,{type:'undo'}),{type:'undo'});assert.deepEqual(s,original);
});
test('R03-08 exact spelling and notes for aliases; Seiren syntax preserved',()=>{
 const s=createTheory('seiren-v1');
 const cases={'CMaj7':['C','E','G','B'],Cadd11:['C','E','G','F'],'Cm(add9)':['C','Eb','G','D'],'G7#9b13':['G','B','D','F','A#','Eb'],'Gb7#9#5':['Gb','Bb','D','Fb','A'],'CΔ':['C','E','G','B']};
 for(const [symbol,tones] of Object.entries(cases)){assert.deepEqual(chordTones(symbol),tones);if(symbol!=='CΔ')assert.equal(s.parse(symbol),null);else assert.equal(s.parse(symbol),null);}
});
test('R03-09 I7 turnaround major is a candidate across 12 tonics',()=>{
 for(let shift=0;shift<12;shift++)assert.ok(detectKey(transpose('C7 | A7 | Dm7 | G7',shift)).candidates.some(k=>k.root===shift&&k.mode==='major'));
});
test('R03-10 blues applied VI7 shares V7/ii analysis with display and copy',()=>{
 for(const [text,k] of [['G7 | C7 | G7 | G7 | C7 | C7 | G7 | E7 | Am7 | D7 | G7 | D7',{root:7,mode:'major',tonic:'G'}],['F7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 | C7',{root:5,mode:'major',tonic:'F'}]]){
  const bars=parseChart(text),analysis=analyzeHarmony(bars,k),degrees=chartToDegrees(bars,k);assert.ok(analysis.events.some(c=>c.label==='V7/ii'));assert.ok(degreeLabels(degrees,k).flat().includes('V7/ii'));assert.match(formatDegreeChart(degrees,k,{bassNames:true}),/V7\/ii/);
 }
});
test('review_2 picker functional spelling, consistent subV and numeric slash bass',()=>{
 for(const [symbol,k,next,want] of [['Dbdim7',key,'Dm','C#dim7'],['Gbm7b5',key,'B7','F#m7b5'],['Gbm7b5',{root:9,mode:'minor',tonic:'A'},'B7','F#m7b5']])assert.equal(spellSelectedChord(symbol,k,next),want);
 for(const text of ['Fm7 | E7 | Ebmaj7','G/B | G7/B | C','C | E7/G# | Am']){
  const k=detectKey(parseChart(text)).primary,degrees=parseDegreeChart(text,k),labels=degreeLabels(degrees,k).flat(),copy=formatDegreeChart(degrees,k,{bassNames:true});
  assert.deepEqual(copy.split('|').map(s=>s.trim()).filter(Boolean),labels);assert.doesNotMatch(copy,/\/[A-G]/);
 }
 assert.deepEqual(degreeLabels(parseDegreeChart('G/B | G7/B | C',key),key)[0],['V/7']);
});
test('review_2 signatures survive every level and 40 seeds; approved Am→Ab and Em→Eb remain',()=>{
 for(const [text,k,style,slots] of [['C | Am | F | Fm',key,'Jazz',[2,3]],['Am | G | F | E7',{root:9,mode:'minor',tonic:'A'},'Heavy Metal',[2,3]],['C7 | F7 | C7 | G7',key,'Major blues',[1]],['C7 | F7 | C7 | G7',key,'Jazz',[1]],['G7 | C',key,'Jazz',[0]]])for(const randomness of ['low','medium','high'])for(let seed=0;seed<40;seed++){
  const source=parseChart(text),out=mutate(source,{style,tonality:k,randomness,seed});
  for(const slot of slots){const c=out[slot].chords.find(c=>c.morph?.part==='V')||out[slot].chords[0],old=parse(source[slot].chords[0].symbol),p=parse(c.symbol);assert.equal(p.root,old.root);for(const tone of old.intervals.filter(n=>[3,4,10].includes(n)))assert.ok(p.intervals.includes(tone),text+' '+c.symbol);}
 }
 const results=Array.from({length:40},(_,seed)=>mutate(parseChart('C | Am | Em | F | G | C'),{style:'Jazz',tonality:key,randomness:'high',seed})).flatMap(bs=>bs.flatMap(b=>b.chords));
 assert.ok(results.some(c=>c.symbol==='Ab'));assert.ok(results.some(c=>c.symbol==='Eb'));
});
test('R03-15 all exports have 4/4 and unique track names, preserving the note payload',()=>{
 const bars=parseChart('C:2 Am:2 | F/A | G7 | Cmaj7'),ns=performance(bars,'sustain');
 for(const split of [false,true])for(const pedal of [false,true]){
  const m=readMidi(midiBytes(ns,16,{split,pedal,chordSpans:bars.map((_,i)=>({start:i*4,end:(i+1)*4})),bpm:137}));
  for(let track=0;track<m.tracks.length;track++){
   assert.equal(m.meta.filter(e=>e.track===track&&e.type===3).length,1);
   assert.deepEqual(m.meta.find(e=>e.track===track&&e.type===88).data,[4,2,24,8]);
  }
  assert.deepEqual(m.notes.map(n=>[n.note,n.start,n.end]).sort(),ns.map(n=>[n.note,Math.round(n.beat*480),Math.round((n.beat+n.duration)*480)]).sort());
 }
});
test('R03-18 heavy-metal power chords never acquire automatic fifth basses',()=>{
 for(let seed=0;seed<40;seed++)for(const c of mutate(parseChart('E5 | C5 | G5 | D5'),{style:'Heavy Metal',randomness:'high',seed}).flatMap(b=>b.chords))if(parse(c.symbol).q==='5')assert.equal(parse(c.symbol).bass,parse(c.symbol).root);
});

import {morphTraceText,morphHistoryLabel} from '../dist/morph-presentation.js';
import {readFileSync} from 'node:fs';
test('R03-07/13 history names include level/content; duration-only provenance does not pretend a new chord',()=>{
 const source=parseChart('C | Am'),mapping={source:{bar:0,chord:0,onset:0},technique:'retained-target'};
 assert.equal(morphTraceText({symbol:'C',beats:4,morph:mapping},source),'');
 assert.equal(morphTraceText({symbol:'C',beats:3,morph:mapping},source),'C・時值讓給接近和弦');
 assert.equal(morphTraceText({symbol:'Cm',beats:4,morph:{...mapping,technique:'parallel'}},source),'C → Cm・平行');
 assert.equal(morphTraceText({symbol:'Cm',beats:4,morph:mapping},source,false),'');
 assert.match(morphHistoryLabel({variation:8,style:'Jazz',level:'high',score:chartToDegrees(source,key)},key),/MORPH 8 · Jazz · 高 · \| C \| Am \|/);
});
test('R03-14 release metadata and current user-facing terminology are explicit',()=>{
 const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const version=JSON.parse(read('dist/version.json'));assert.equal(version.version,'1.0.6');assert.equal(version.channel,'unreleased');
 assert.doesNotMatch(read('dist/chord-picker.js'),/GENERATE/);assert.doesNotMatch(read('dist/index.html'),/>GENERATE</);
 assert.match(read('docs/morph-backbone/README.md'),/preserve-bass is unchecked/);
});
