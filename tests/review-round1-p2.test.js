import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheory} from '../packages/music-core/core.js';
import {parse, midiBytes} from '../dist/music.js';
import {parseDegreeChart,materializeChart} from '../dist/degree-chart.js';
import {createHarmony,applyHarmonyAction as act} from '../dist/harmony-state.js';
import {detectKey} from '../dist/key-detection.js';
import {parseChart} from '../dist/solutions.js';
import {voicingCandidates} from '../dist/voicing.js';
import {midiControls} from '../packages/piano-motion/midi-test-reader.mjs';
const aliases={'C7#5':[0,4,8,10],Caug7:[0,4,8,10],'C+7':[0,4,8,10],CmM7:[0,3,7,11],Co7:[0,3,6,9],'C9#11':[0,4,7,10,14,18],C7sus2:[0,2,7,10],C7sus:[0,5,7,10],'C(add9)':[0,4,7,14]};
test('review symbols have exact intervals without silently widening Seiren syntax',()=>{
 const s=createTheory('seiren-v1');
 for(const [symbol,intervals] of Object.entries(aliases)){assert.deepEqual(parse(symbol).intervals,intervals);assert.equal(s.parse(symbol),null);assert.equal(materializeChart(parseDegreeChart(symbol))[0].chords.length,1);}
});
test('NC is silent; blank LOAD and H7 explain chord input errors without changing the score',()=>{
 for(const symbol of ['NC','N.C.','| N.C. |'])assert.deepEqual(parseDegreeChart(symbol),[{chords:[]}]);
 const state=createHarmony(),saved=structuredClone(state);
 assert.throws(()=>act(state,{type:'load',text:'  '}),/請先輸入/);
 assert.throws(()=>parseDegreeChart('H7'),e=>/和弦名稱/.test(e.message)&&!e.message.includes('級數'));
 assert.deepEqual(state,saved);assert.deepEqual(act(state,{type:'load',text:'N.C.'}).score,[{chords:[]}]);
});
test('pure IV–V follows user decision 11, superseding the former G alternative policy',()=>{
 const result=detectKey(parseChart('F | G | F | G'));
 assert.equal(result.primary.root,0);assert.equal(result.ambiguous,false);
 assert.ok(!result.candidates.some(c=>c.root===7&&c.mode==='major'));
 assert.ok(result.analysis.events.every(c=>!c.cadence));
});
test('split MIDI channels remain Bass ch3 / Chords ch2 with CC64 on or off',()=>{
 const notes=[{note:36,beat:0,duration:4,velocity:.7,part:'bass'},{note:64,beat:0,duration:4,velocity:.7,part:'upper'}];
 for(const pedal of [false,true]){
  const bytes=midiBytes(notes,4,{split:true,pedal,chordSpans:[{start:0,end:4}],bpm:120});
  assert.ok(Buffer.from(bytes).includes(Buffer.from([0x92,36])));assert.ok(Buffer.from(bytes).includes(Buffer.from([0x91,64])));
  const {controls}=midiControls(bytes);assert.ok(controls.every(c=>c.channel===1));
  assert.equal(controls.length>0,pedal);
 }
});
test('extended voicings permit inner extensions while retaining guides and protected register',()=>{
 let inner=false;
 for(const symbol of ['Ebmaj13','C13','G7alt','Cmaj9','C7b9','C7#9'])for(const mode of ['close','open','rootless']){
  const c=parse(symbol);
  for(const [bass,...upper] of voicingCandidates(symbol,mode)){
   assert.ok(upper.length<=5);assert.ok(upper[0]>=52);assert.ok(upper[0]-bass>=12);
   for(const guide of [4,10,11].filter(n=>c.intervals.includes(n)))assert.ok(upper.some(n=>(n-c.root+120)%12===guide));
   assert.ok(upper.every(n=>c.pcs.includes(n%12)));
   if(c.intervals.includes(15))assert.ok(upper.find(n=>(n-c.root+120)%12===3)>upper.find(n=>(n-c.root+120)%12===4));
   if(c.intervals.includes(21)&&upper.some(n=>(n-c.root+120)%12===9&&n<upper.at(-1)))inner=true;
  }
 }
 assert.ok(inner);
});
test('Roman flat degrees remain valid and NC does not suppress AUTO chord detection',()=>{
 assert.equal(materializeChart(parseDegreeChart('bVI'))[0].chords[0].symbol,'Ab');
 assert.equal(materializeChart(parseDegreeChart('C.'))[0].chords[0].symbol,'C');
 const s=act(createHarmony(),{type:'load',text:'N.C. | Dm | Gm | A7 | Dm'});
 assert.equal(s.key.root,2);assert.equal(s.key.mode,'minor');
});
test('verify-morph arguments separate Seiren and output paths and reject malformed options',async()=>{
 const {argumentsFor}=await import('../scripts/verify-morph-browser.cjs');
 const args=argumentsFor(['--seiren','/tmp/seiren','--output','/tmp/evidence']);
 assert.deepEqual(args,{seiren:'/tmp/seiren',output:'/tmp/evidence'});assert.deepEqual(argumentsFor([]),{});
 for(const bad of [['--seiren'],['--output','--seiren'],['--wat','x'],['--output','x','--output','y']])assert.throws(()=>argumentsFor(bad),/Usage/);
});
