import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {editBackbone} from '../dist/chord-input.js';
import {parseChart} from '../dist/solutions.js';
import {parseDegreeChart,materializeChart} from '../dist/degree-chart.js';
import {detectKey} from '../dist/key-detection.js';
import {parse,mod,transposeSymbol} from '../dist/music.js';
import {arpeggiate} from '../dist/arpeggiator.js';
import {renderGenre} from '../dist/genre-rhythm.js';
import {performance} from '../dist/performance.js';
import {mutate,styles} from '../dist/style-engine.js';
import {resolveAutomaticBass} from '../dist/morph-techniques.js';
import {invertChord} from '../dist/harmony-actions.js';
import {mountChordPicker} from '../dist/chord-picker.js';
import {createHarmony,applyHarmonyAction,harmonyView} from '../dist/harmony-state.js';
import {pickerDOM} from './helpers/picker-dom.js';
const key={root:0,mode:'major',tonic:'C'};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('R08 M02 removes the requested middle bar, retaining exact content and order',()=>{
 const source=parseChart('C | Am:2 Em:2 | Dm7 | G7');
 for(const bar of [1,2])assert.deepEqual(editBackbone(source,{operation:'removeBar',bar},key),source.filter((_,i)=>i!==bar),'M02 middle deletion');
});
test('R08 M06 1/24 produces exactly 24 attacks per 4/4 bar at sixth-beat intervals',()=>{
 const plan=[0,4,8].map(beat=>({beat,beats:4,notes:[36,60,64,67]}));
 const notes=arpeggiate(plan,{arpRate:'24',arpMode:'up',human:0,swing:.3});
 for(let bar=0;bar<3;bar++){
  const attacks=notes.filter(n=>n.beat>=bar*4&&n.beat<(bar+1)*4);
  assert.equal(attacks.length,24,'M06 steps per bar');
  attacks.forEach((n,i)=>assert.ok(Math.abs(n.beat-(bar*4+i/6))<1e-8,'M06 grid'));
 }
});
test('R08 M17 picker inserts, selects and returns focus to the live current bar',()=>{
 const dom=pickerDOM(),oldDocument=globalThis.document,oldOption=globalThis.Option;
 globalThis.document=dom.document;globalThis.Option=dom.Option;
 try{
  let state=createHarmony({text:'C | Am | F | G',key,locked:true});
  const picker=mountChordPicker({state:()=>state,dispatch:action=>{state=applyHarmonyAction(state,action);dom.render(harmonyView(state).bars);picker.decorate();return true;}});
  const click=selector=>{const el=dom.document.querySelector(selector);assert.ok(el,selector);assert.ok(!el.disabled,selector);el.onclick();};
  dom.render(harmonyView(state).bars);picker.open(1);
  click('[data-picker-action="insertBar"]');click('[data-choice="Dm"]');
  assert.deepEqual(harmonyView(state).bars.map(b=>b.chords.map(c=>c.symbol)),[['C'],['Am'],['Dm'],['F'],['G']],'M17 inserted bar receives chord');
  dom.escape();assert.equal(dom.document.activeElement,dom.grid.children[2].querySelector('.chord-event'),'focus after adding');
  picker.open(2);click('[data-choice="Em"]');dom.escape();assert.equal(dom.document.activeElement,dom.grid.children[2].querySelector('.chord-event'),'focus after selection');
  picker.open(2);click('[data-picker-action="removeBar"]');dom.escape();assert.equal(dom.document.activeElement,dom.grid.children[2].querySelector('.chord-event'),'focus after removal');
  picker.open(1);click('[data-picker-action="nextBar"]');click('[data-choice="Dm"]');assert.equal(harmonyView(state).bars[2].chords[0].symbol,'Dm');
 }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldOption===undefined)delete globalThis.Option;else globalThis.Option=oldOption;}
});
test('R08 M19 status has live status semantics and PLAY starts unpressed',()=>{
 const html=read('dist/index.html');
 assert.match(html.match(/<[^>]+id="status"[^>]*>/)?.[0]||'',/role="status"/,'M19 status role');
 assert.match(html.match(/<button[^>]+id="play"[^>]*>/)?.[0]||'',/aria-pressed="false"/);
});
test('R08 M20 Bossa alternates actual root/fifth pitches at 1,7,9,15',()=>{
 const notes=renderGenre([{symbol:'C',beat:0,beats:4}],'bossa',{human:0,swing:0,gate:1}).filter(n=>n.part==='bass');
 assert.deepEqual(notes.map(n=>[n.beat,mod(n.note)]),[[0,0],[1.5,7],[2,0],[3.5,7]],'M20 Bossa root/fifth');
});
test('R08-03 twelve I–IV loop tonics are candidates; confirmed IV–V policy unchanged',()=>{
 for(let root=0;root<12;root++){
  const chart=text=>parseChart(text).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,root)}))}));
  const out=detectKey(chart('C | F | C | F'));
  assert.ok(out.candidates.some(k=>k.root===root&&k.mode==='major'));
  assert.equal(out.primary.root,mod(root+5));
  const ivv=detectKey(chart('F | G | F | G'));
  assert.equal(ivv.primary.root,root);assert.deepEqual(ivv.candidates.map(k=>k.root),[root]);
 }
});
test('R08-08 major seventh bass requires actual downward step; manual input is retained',()=>{
 for(const [tail,loop,want] of [['Am',false,'Cmaj7/B'],['Bb',false,'Cmaj7/B'],['F',false,'Cmaj7'],['',false,'Cmaj7'],['N.C.',true,'Cmaj7']]){
  const source=parseChart('Cmaj7'+(tail?' | '+tail:'')),out=structuredClone(source);
  out[0].chords[0]={symbol:'Cmaj7/B',beats:4,morph:{source:{bar:0,chord:0,onset:0},technique:'inversion'}};
  assert.equal(resolveAutomaticBass(out,source,{loop})[0].chords[0].symbol,want);
 }
 assert.equal(invertChord('Cmaj7/G'),'Cmaj7/B');
 const manual=parseChart('Cmaj7/B | F');manual[0].chords[0].morph={source:{bar:0,chord:0,onset:0}};
 assert.equal(resolveAutomaticBass(structuredClone(manual),manual)[0].chords[0].symbol,'Cmaj7/B');
});
test('R08-08 batch automatic major-seventh basses resolve across all 49 styles',()=>{
 let runs=0,sevenths=0;
 for(const style of Object.keys(styles))for(const loop of [false,true])for(let seed=0;seed<40;seed++){
  const source=parseChart('Cmaj7 | G#dim7 | Am | Fmaj9 | Dm7 | G7 | Cmaj7 | Fmaj7');
  const out=mutate(source,{style,loop,seed,randomness:'high',density:3,tonality:key});runs++;
  const events=out.flatMap(b=>b.chords.length?b.chords:[{symbol:'N.C.'}]);
  for(const [i,e] of events.entries()){
   const c=parse(e.symbol);if(!c||!c.intervals.includes(11)||mod(c.bass-c.root)!==11)continue;sevenths++;
   const next=parse((events[i+1]||(loop?events[0]:null))?.symbol);
   assert.ok(next&&[1,2].includes(mod(c.bass-next.bass)),style+' '+e.symbol);
  }
 }
 assert.equal(runs,3920);assert.ok(sevenths>0);console.log('R08-08 batch:',{runs,sevenths,unresolved:0});
});
test('R08-09 all roots, altered fifths and slash basses use a nearby Bossa fifth',()=>{
 for(let root=0;root<12;root++)for(const q of ['', 'm7','m7b5','aug','7alt'])for(const slash of ['', '/G']){
  const symbol=transposeSymbol('C'+q+slash,root),c=parse(symbol);
  const notes=renderGenre([{symbol,beat:0,beats:4}],'bossa',{human:0,swing:0}).filter(n=>n.part==='bass');
  assert.ok(notes.every(n=>n.note>=24&&n.note<=48));
  assert.ok(Math.abs(notes[0].note-notes[1].note)<=12,symbol);
  assert.equal(mod(notes[1].note),mod(c.root+(c.intervals.find(i=>[6,7,8].includes(i))??0)));
 }
 const chart=parseChart('C:2 Dm7:1 G7:1 | Am/G | F#m7b5 | B7#9 | Em | E7 | Am | G7alt');
 assert.ok(performance(chart,'bossa',{genreRevision:2,human:0,swing:0}).length);
});
test('R08-11 full-bar N.C. agrees across both parsers, mixed/partial rests reject',()=>{
 for(const text of ['| N.C. |','N.C.','NC','C | N.C. | G','| N.C. | N.C. |']){
  assert.deepEqual(parseChart(text).map(b=>b.chords),materializeChart(parseDegreeChart(text,key),key).map(b=>b.chords));
 }
 for(const text of ['N.C.:2 C:2','N.C.:4','C N.C.']){
  assert.throws(()=>parseChart(text),/N.C./);assert.throws(()=>parseDegreeChart(text,key),/N.C./);
 }
});
test('R08-06 deployed media are referenced and optimizer sources remain outside dist',()=>{
 const dist=new URL('../dist/',import.meta.url),names=readdirSync(dist);
 const content=names.filter(n=>/\.(html|css|js)$/.test(n)).map(n=>read('dist/'+n)).join('\n');
 for(const name of names.filter(n=>/\.(webp|png|jpg|svg)$/.test(n)))assert.ok(content.includes(name),'unreferenced '+name);
 for(const name of ['khimaira-bronze','temple-blue','button-dark','button-ivory']){
  assert.ok(!existsSync(new URL('../dist/'+name+'.webp',import.meta.url)));
  assert.ok(existsSync(new URL('../assets/web-source/'+name+'.webp',import.meta.url)));
 }
});
