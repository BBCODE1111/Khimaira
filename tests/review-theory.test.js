import test from 'node:test';
import assert from 'node:assert/strict';
import {detectKey} from '../dist/key-detection.js';
import {parseChart} from '../dist/solutions.js';
import {createHarmony,applyHarmonyAction as act,harmonyView} from '../dist/harmony-state.js';
import {parse,transposeSymbol,spellPitch,chordTones,analyzeHarmony} from '../dist/music.js';
import {normalizeKey,parseDegreeChart,materializeChart,formatDegreeChart,degreeLabels} from '../dist/degree-chart.js';
import {chordChoices,extraChordChoices} from '../dist/chord-input.js';

test('resolved and unresolved dominant chains retain functional labels through all 12 tonics',()=>{
 for(const text of ['E7 | A7 | D7 | G7','E7 | A7 | D7 | G7 | C','Cmaj7 | E7 | A7 | D7 | G7 | C']){
  for(let shift=0;shift<12;shift++){
   const bars=parseChart(text).map(b=>({chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,shift,shift)}))}));
   const result=detectKey(bars);
   assert.equal(result.primary.root,shift,text);assert.equal(result.primary.mode,'major');
   const labels=result.analysis.events.map(e=>e.label);
   assert.deepEqual(labels.slice(text.startsWith('Cmaj7')?1:0, text.startsWith('Cmaj7')?5:4),['V7/vi','V7/ii','V7/V','V7']);
   for(const row of result.analysis.events)if(row.target!==null&&result.analysis.events[row.target].intervals.includes(10))assert.equal(row.cadence,null);
   const s=createHarmony({text:bars.map(b=>b.chords[0].symbol).join(' | ')});
   const changed=act(s,{type:'generate',options:{randomness:'high',seed:1}});
   assert.deepEqual(changed.key,s.key);assert.deepEqual(changed.backbone,s.backbone);
   harmonyView(changed).bars.slice(0,4).forEach((bar,i)=>assert.equal(parse(bar.chords[0].symbol).root,parse(bars[i].chords[0].symbol).root));
  }
 }
});
test('pure IV–V vamps imply I without turning relative-minor phrases or blues into new keys',()=>{
 for(let shift=0;shift<12;shift++){
  const bars=parseChart('F | G | F | G').map(b=>({chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,shift,shift)}))}));
  assert.equal(detectKey(bars).primary.root,shift);assert.equal(detectKey(bars).primary.mode,'major');
 }
 assert.equal(detectKey(parseChart('Abmaj7 | Bb7 | Cm | Cm')).primary.mode,'minor');
 const blues=analyzeHarmony(parseChart('C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 | G7'),{root:0,mode:'major'});
 assert.equal(blues.blues,true);assert.equal(blues.events[0].label,'I7');
});
test('authored tonic spellings survive labels, copied Roman text, reload, MORPH and explicit enharmonic transpose',()=>{
 for(const [text,tonic] of [
  ['Gbmaj7 | Ebm7 | Abm7 | Db7','Gb'],['Gb | Cb | Db7 | Gb','Gb'],
  ['C# | F# | G# | C#','C#'],['Ebm | Cb | Gb | Db','Gb'],
  ['Cb | Fb | Gb7 | Cb','Cb'],['F# | B | C#7 | F#','F#']
 ]){
  let s=createHarmony({text});assert.equal(s.key.tonic,tonic);
  for(const state of [s,act(s,{type:'generate'})]){
   const labels=degreeLabels(state.score,state.key),text=formatDegreeChart(state.score,state.key);
   assert.doesNotMatch(labels.flat().join(' '),/bb|##/);
   assert.deepEqual(parseDegreeChart(text,state.key),state.score);
   assert.equal(text,'| '+labels.map((bar,i)=>bar.map((label,j)=>label+(state.score[i].chords[j].beats===4?'':':'+state.score[i].chords[j].beats)).join(' ')).join(' | ')+' |');
  }
  if(tonic==='Gb'){
   const sharp=act(s,{type:'transpose',key:{root:6,tonic:'F#',mode:s.key.mode}});
   assert.deepEqual(sharp.score,s.score);assert.equal(sharp.key.tonic,'F#');
   assert.deepEqual(harmonyView(sharp).bars.map(b=>b.chords.map(c=>parse(c.symbol).root)),harmonyView(s).bars.map(b=>b.chords.map(c=>parse(c.symbol).root)));
  }
 }
});
test('minor secondary choices resolve to modal scale chords and borrowing comes from parallel major',()=>{
 for(let root=0;root<12;root++){
  const key=normalizeKey({root,mode:'minor'}),choices=chordChoices(key),extra=extraChordChoices(key);
  const secondary=extra.filter(c=>c.label.startsWith('V7/'));
  assert.equal(secondary.length,5);
  for(const item of secondary){
   const target=materializeChart(parseDegreeChart(item.label.slice(3),key),key)[0].chords[0].symbol;
   assert.ok(choices.some(c=>c.symbol===target),item.label+' '+target);
   assert.equal((parse(item.symbol).root+5)%12,parse(target).root);
  }
  for(const item of extra.filter(c=>!c.label.startsWith('V7/')))assert.ok(!choices.some(c=>c.symbol===item.symbol));
 }
 assert.deepEqual(extraChordChoices({root:9,tonic:'A',mode:'minor'}).slice(0,5).map(c=>c.symbol),['G7','A7','B7','C7','D7']);
 assert.ok(extraChordChoices({root:9,tonic:'A',mode:'minor'}).some(c=>c.symbol==='D'&&c.label==='IV'));
});
test('contextual editor spelling uses minor leading tones, diminished sevenths and flat borrowed degrees',()=>{
 for(const [tonic,root,leading] of [['A',9,'G#'],['D',2,'C#'],['G',7,'F#']]){
  const key={root,tonic,mode:'minor'},name=spellPitch((root+11)%12,key);
  assert.equal(name,leading);
  assert.equal(analyzeHarmony(parseChart(name+'dim7'),key).events[0].label,'vii°7');
  assert.equal(new Set(chordTones(name+'dim7').map(n=>n[0])).size,4);
 }
 const key={root:7,tonic:'G',mode:'major'};
 assert.deepEqual([3,8,10].map(n=>spellPitch((7+n)%12,key)),['Bb','Eb','F']);
 assert.deepEqual(chordTones('G#dim7'),['G#','B','D','F']);
 assert.equal(spellPitch(11,{root:6,tonic:'Gb',mode:'major'}),'Cb');
});
