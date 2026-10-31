import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createTheory} from '../packages/music-core/core.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {parseDegreeChart} from '../dist/degree-chart.js';
import {detectKey} from '../dist/key-detection.js';
import {transposeSymbol} from '../dist/music.js';
import {createHarmony,applyHarmonyAction as act,harmonyView,migrateHarmony} from '../dist/harmony-state.js';
const key={root:0,tonic:'C',mode:'major'};
test('R02-07 single-source restore merges ii–V fragments and preserves all other slots; undo restores result',()=>{
 for(const text of ['C | Am | Em | F | G | C','C:2 Am:2 | Em:2 F:2 | G | C']){
 const s=createHarmony({text,key,locked:true});
 for(let seed=0;seed<30;seed++){
  const out=act(s,{type:'generate',options:{seed,randomness:'high',density:3}});
  for(const bar of out.score)for(const c of bar.chords){
   const a=c.morph.source,restored=act(out,{type:'restoreSource',source:a});
   assert.equal(restored.score[a.bar].chords.reduce((n,c)=>n+c.beats,0),4);
   let onset=0;const arrival=restored.score[a.bar].chords.find(c=>{const hit=onset===a.onset;onset+=c.beats;return hit;});
   assert.deepEqual(arrival,s.backbone.degrees[a.bar].chords[a.chord]);
   restored.score.forEach((b,i)=>{if(i!==a.bar)assert.deepEqual(b,out.score[i]);});
   const affected=candidate=>candidate.morph?.source.bar===a.bar&&candidate.morph.source.chord===a.chord;
   const originalOthers=out.score[a.bar].chords.filter(c=>!affected(c));
   const restoredOthers=restored.score[a.bar].chords.filter(c=>c!==arrival);
   assert.deepEqual(restoredOthers,originalOthers);
   assert.deepEqual(act(restored,{type:'undo'}),out);
  }
 }
 }
});
test('MORPH history holds six results, survives recall, supports A/B, KEEP, RESTORE and undo',()=>{
 let s=createHarmony({text:'C | Am | Em | F | G | C',key,locked:true});
 const original=structuredClone(s.backbone);
 for(let i=0;i<10;i++)s=act(s,{type:'generate',options:{randomness:'high'}});
 assert.equal(s.morphHistory.length,6);assert.deepEqual(s.backbone,original);
 s=migrateHarmony({harmony:JSON.parse(JSON.stringify(s))});
 const a=act(s,{type:'compare',index:'backbone'});assert.deepEqual(a.score,original.degrees);
 const b=act(a,{type:'compare',index:1});assert.deepEqual(b.score,s.morphHistory[1].score);assert.equal(b.variation,s.variation);
 const kept=act(b,{type:'keep',confirmed:true});assert.deepEqual(kept.backbone.degrees,b.score);assert.equal(kept.morphHistory.length,0);
 assert.deepEqual(act(kept,{type:'undo'}),b);assert.deepEqual(act(b,{type:'restore'}).score,original.degrees);
 assert.equal(act(b,{type:'load',text:'F | G | C'}).morphHistory.length,0);
 const transposed=act(b,{type:'transpose',key:{root:2,mode:'major'}});
 assert.deepEqual(act(transposed,{type:'compare',index:1}).score,b.score);
 assert.notEqual(serialize(harmonyView(transposed).bars),serialize(harmonyView(b).bars));
});
test('R02-09 mixed rests explain the whole-bar constraint',()=>{
 for(const text of ['C:2 N.C.:2 | G','C:2 NC:2 | G'])assert.throws(()=>parseDegreeChart(text,key),/N\.C\. 目前只能佔整小節/);
 assert.deepEqual(parseDegreeChart('C | N.C. | G',key)[1],{chords:[]});
});
test('R02-10 aliases have correct tones and do not expand seiren-v1',()=>{
 const k=createTheory('khimaira-v1'),s=createTheory('seiren-v1');
 assert.deepEqual(k.chordTones('Cma7'),['C','E','G','B']);assert.deepEqual(k.chordTones('Gmaj7#5'),['G','B','D#','F#']);
 for(const symbol of ['Cma7','Gmaj7#5']){assert.equal(s.parse(symbol),null);assert.ok(parseDegreeChart(symbol,key));}
});
test('R02-13 semitone major-seventh vamp has lower-root major candidate in every key',()=>{
 for(let shift=0;shift<12;shift++){
  const bars=parseChart('Cmaj7 | Dbmaj7').map(b=>({chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,shift,shift)}))}));
  const result=detectKey(bars);assert.ok(result.candidates.some(k=>k.root===shift&&k.mode==='major'));assert.ok(result.ambiguous);
 }
});
test('R02-11/12 current documentation, version and deployment assets agree',()=>{
 const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8'),doc=read('README.md'),version=JSON.parse(read('dist/version.json'));
 assert.equal(version.version,'1.0.4');assert.equal(version.tag,'web-v1.0.4');assert.match(doc,/49 種樂風/);assert.doesNotMatch(doc,/48 種樂風|無 tempo 事件/);assert.match(doc,/歷史紀錄/);
 for(const file of ['khimaira.webp','mark.svg'])assert.equal(existsSync(new URL('../dist/'+file,import.meta.url)),false);
});

import {readSession} from '../dist/session-storage.js';
test('MORPH history validation backs up corrupt results before startup can render them',()=>{
 const harmony=createHarmony({key,locked:true});harmony.morphHistory=[{score:null,style:'Jazz',variation:1}];harmony.compareIndex=0;
 const raw=JSON.stringify({harmony}),data=new Map([['khimaira-v5',raw]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const session=readSession(storage,()=>42);assert.equal(data.get('khimaira-corrupt-42'),raw);assert.match(session.message,/備份/);assert.deepEqual(session.harmony.morphHistory,[]);
});
