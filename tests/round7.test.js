import test from 'node:test';
import assert from 'node:assert/strict';
import {mutate,styles} from '../dist/style-engine.js';
import {parse,mod,transposeSymbol,pianoVoicing} from '../dist/music.js';
import {parseChart} from '../dist/solutions.js';
import {voicingCandidates} from '../dist/voicing.js';
const key={root:0,mode:'major',tonic:'C'};
const shifted=(text,root)=>parseChart(text).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,root,root)}))}));

test('R07-01 all resolution targets: 12 keys × 49 styles × 3 levels × 40 seeds',()=>{
 // Two internal iv–I arrivals precede later cadences; subV, #v°7 and #i°7
 // have independent non-final destinations, so final-slot protection cannot mask a defect.
 const chart='C | Fm6 | C/E | Db7 | C | G#dim7 | Am | C#dim7 | Dm7 | Fm | C | G7 | C | F';
 const targets=[2,4,6,8,10];let runs=0;
 for(let root=0;root<12;root++){
  const source=shifted(chart,root);
  for(const style of Object.keys(styles))for(const randomness of ['low','medium','high'])for(let seed=0;seed<40;seed++){
   const out=mutate(source,{style,randomness,seed,density:3,tonality:{root,mode:'major'}});
   assert.equal(out.length,source.length);
   for(const bar of targets){
    const old=parse(source[bar].chords[0].symbol),c=out[bar].chords[0],p=parse(c.symbol);
    assert.equal(p.root,old.root,`${style}/${randomness}/${seed}: ${bar} ${c.symbol}`);
    for(const tone of old.intervals.filter(n=>[3,4].includes(n)))assert.ok(p.intervals.includes(tone),`${style}/${randomness}/${seed}: ${bar} ${c.symbol} lost ${tone}`);
    assert.deepEqual(c.morph.source,{bar,chord:0,onset:0});
    assert.equal(out[bar].chords.reduce((n,c)=>n+c.beats,0),4);
   }
   runs++;
  }
 }
 assert.equal(runs,70560);console.log('R07-01 MORPH matrix:',runs,'runs;',runs*targets.length,'target checks');
});

test('R07-01 loop and same-bar targets; no invented diminished resolution across a rest or open end',()=>{
 for(const text of ['Am | F | C | G#dim7','C | F | G | Db7','C | F | G | Fm','C:1 G#dim7:1 Am:2 | F'])for(let seed=0;seed<40;seed++){
  const source=parseChart(text),out=mutate(source,{style:'Jazz',randomness:'high',seed,tonality:key});
  const bar=text.includes(':')?0:0,index=text.includes(':')?2:0;
  const c=out[bar].chords.find(c=>c.morph.source.chord===index),old=parse(source[bar].chords[index].symbol),p=parse(c.symbol);
  assert.equal(p.root,old.root);assert.ok(p.intervals.includes(old.minor?3:4));
 }
 for(const [text,loop,bar] of [['Am | Em | F | G#dim7',false,0],['G#dim7 | | Am | F',true,2],['G#dim7 | Em | Am | F',true,2]]){
  const roots=new Set();
  for(let seed=0;seed<80;seed++){
   const out=mutate(parseChart(text),{style:'Rock',randomness:'high',seed,loop,tonality:key,techniques:{iiV:false,inversion:false}});
   roots.add(parse(out[bar].chords[0].symbol).root);
  }
  assert.ok(roots.has(8),text);
 }
});

test('R07-02 948 extended symbols × 12 transpositions × close/open/rootless retain guides and named tensions',()=>{
 // Full six-quality matrix: 864 slash symbols, 72 root-position symbols,
 // plus 12 explicit-alteration symbols. This exceeds the report’s 888 cases.
 const names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
 const qs=['13','maj13','m11','m13','11','7alt'];
 const symbols=names.flatMap(n=>qs.flatMap(q=>names.map(b=>n+q+'/'+b)));
 symbols.push(...names.flatMap(n=>qs.map(q=>n+q)),...names.map(n=>n+'7#9b13'));
 assert.equal(symbols.length,948);let checks=0;
 for(const symbol of symbols)for(let root=0;root<12;root++)for(const mode of ['close','open','rootless']){
  const s=transposeSymbol(symbol,root,root),c=parse(s),vs=voicingCandidates(s,mode);
  assert.ok(vs.length,s+' '+mode);
  for(const v of vs){
   assert.ok(v.length<=6,s+' '+mode+' '+v);
   const pcs=v.map(mod);
   for(const n of c.intervals.filter(n=>[3,4,10,11].includes(n)))assert.ok(pcs.includes(mod(c.root+n)),s+' lost guide '+n);
   const required=c.q==='7alt'?[13,15]:c.q.includes('#9')&&c.q.includes('b13')?[15,20]:c.q.includes('13')?[21]:[17];
   for(const n of required)assert.ok(pcs.includes(mod(c.root+n)),s+' lost tension '+n);
   if(mode!=='rootless')assert.ok(pcs.includes(c.root),s+' lost root');
  }
  checks++;
 }
 assert.equal(checks,34128);assert.equal(pianoVoicing('G13/D').length,6);
 console.log('R07-02 voicing cases:',checks);
});

import {spaceToggles} from '../dist/transport.js';
import {readFileSync} from 'node:fs';
function inputSpaceContract(toggle){
 // Interpret the actual selector instead of returning a fixed true from closest.
 for(const tag of ['input','textarea','select','button','a','summary']){
  const target={closest:selector=>selector.split(',').includes(tag)?{}:null};
  assert.equal(toggle({code:'Space',target}),false,tag+' must retain Space');
 }
 assert.equal(toggle({code:'Space',target:{closest:()=>null}}),true);
}
test('R07-04 Space protects actual input/textarea selectors; injected M10 is rejected',async()=>{
 inputSpaceContract(spaceToggles);
 const source=readFileSync(new URL('../dist/transport.js',import.meta.url),'utf8');
 const mutant=source.replace('input,textarea,','');
 assert.notEqual(mutant,source);
 const {spaceToggles:broken}=await import('data:text/javascript,'+encodeURIComponent(mutant));
 assert.throws(()=>inputSpaceContract(broken),/input must retain Space/);
});

import {createHarmony,applyHarmonyAction as act,harmonyView} from '../dist/harmony-state.js';
test('R07-03 click actions create 1–16 bars, keep content/order, undo and MORPH length',()=>{
 let s=createHarmony({text:'C | Am | F | G',key,locked:true});
 const initial=structuredClone(s);
 s=act(s,{type:'backboneEdit',operation:'insertBar',bar:1});
 assert.equal(s.score.length,5);assert.equal(harmonyView(s).bars[2].chords.length,0);
 assert.deepEqual(harmonyView(s).bars[3].chords,harmonyView(initial).bars[2].chords);
 assert.deepEqual(act(s,{type:'undo'}),initial);
 s=initial;
 while(s.score.length>1)s=act(s,{type:'backboneEdit',operation:'removeBar',bar:s.score.length-1});
 assert.throws(()=>act(s,{type:'backboneEdit',operation:'removeBar',bar:0}),/至少/);
 for(let length=1;length<=16;length++){
  if(length>1){
   const before=structuredClone(s);
   s=act(s,{type:'backboneEdit',operation:'insertBar',bar:length-2});
   assert.deepEqual(act(s,{type:'undo'}),{...before,history:before.history.length===32?before.history.slice(1):before.history});
   s=act(s,{type:'backboneEdit',operation:'select',bar:length-1,symbol:['Dm','G','C'][length%3]});
  }
  const morphed=act(s,{type:'generate',options:{length:4,randomness:'high'}});
  assert.equal(morphed.score.length,length);assert.deepEqual(morphed.backbone,s.backbone);
  assert.deepEqual(act(morphed,{type:'restore'}).score,s.backbone.degrees);
 }
 assert.throws(()=>act(s,{type:'backboneEdit',operation:'insertBar',bar:15}),/16/);
 while(s.score.length>1){
  const before=structuredClone(s);
  s=act(s,{type:'backboneEdit',operation:'removeBar',bar:0});
  assert.deepEqual(act(s,{type:'undo'}),{...before,history:before.history.length===32?before.history.slice(1):before.history});
 }
});

import {publicationChannel,validatePublication,syncWebAssets} from '../scripts/sync-web-assets.mjs';
test('R07-05 release rules use fixed channel/tag inputs, including all four combinations',()=>{
 const current={version:'1.0.11',tag:'web-v1.0.11',channel:'release-candidate'};
 for(const tagExists of [false,true])for(const channel of ['release-candidate','stable']){
  const metadata={...current,channel};
  if(channel==='stable'&&!tagExists)assert.throws(()=>validatePublication(metadata,tagExists),/channel mismatch/);
  else assert.doesNotThrow(()=>validatePublication(metadata,tagExists));
 }
 assert.equal(publicationChannel(current,true),'release-candidate');
 assert.throws(()=>publicationChannel({...current,tag:'web-v1.0.9'},true),/tag/);
 assert.throws(()=>validatePublication({...current,channel:'unknown'},true),/channel mismatch/);
 assert.throws(()=>syncWebAssets(['--check','--release']),/Usage/);
});

import {tint,cadenceTo,seeded} from '../dist/style-engine.js';
import {anchoredMutation} from '../dist/backbone-mutation.js';
test('R07-01 removing subV, diminished or earlier-cadence protection is detected',async()=>{
 const original=readFileSync(new URL('../dist/backbone-mutation.js',import.meta.url),'utf8');
 const cases=[
  ["['dominant', 'tritone']","['dominant']",'C | Eb7 | Dm7 | F',2],
  ['[0, 3, 6, 9].every','[0, 3, 6, 8].every','C | G#dim7 | Am | F',2],
  ['if (row.cadence) {','if (false) {','C | F | Fm6 | C/E | A7 | Dm7 | G7',3]
 ];
 for(const [from,to,text,bar] of cases){
  const source=parseChart(text);
  const verify=fn=>{
   for(let seed=0;seed<100;seed++){
    const out=fn(source,{style:'Ballad',randomness:'high',seed,density:3,tonality:key},{styles,tint,cadenceTo,seeded});
    const c=parse(out[bar].chords[0].symbol),old=parse(source[bar].chords[0].symbol);
    assert.equal(c.root,old.root,'resolution root');assert.ok(c.intervals.includes(old.minor?3:4),'resolution third');
   }
  };
  verify(anchoredMutation);
  let mutant=original.replace(from,to);assert.notEqual(mutant,original);
  mutant=mutant.replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../dist/'+path.slice(2),import.meta.url).href}'`);
  const {anchoredMutation:broken}=await import('data:text/javascript,'+encodeURIComponent(mutant));
  assert.throws(()=>verify(broken),/resolution/);
 }
});

import {performance} from '../dist/performance.js';
import {midiBytes} from '../dist/music.js';
import {readMidi} from './helpers/midi-reader.js';
test('R07-02 five upper notes and named tensions reach the actual SUSTAIN MIDI',()=>{
 for(const mode of ['close','open','rootless'])for(const text of ['G13/D | C','Cmaj7(9,#11,13)/E | F','C7#9b13/G | F','C7(9,11,13)/E | F']){
  const bars=parseChart(text),notes=performance(bars,'sustain',{voicing:mode});
  const pitches=readMidi(midiBytes(notes,8)).notes.filter(n=>n.start===0).map(n=>n.note);
  assert.ok(pitches.length<=6);assert.ok(pitches.length>=4);
  const c=parse(bars[0].chords[0].symbol),pcs=pitches.map(mod);
  const core=c.intervals.filter(n=>[3,4,10,11].includes(n));
  const tensions=text.startsWith('G')?[21]:text.startsWith('Cmaj')?[14,18,21]:text.includes('(9,11,13)')?[14,17,21]:[15,20];
  for(const n of [...core,...tensions])assert.ok(pcs.includes(mod(c.root+n)),text+' lost '+n);
 }
});

import {statSync} from 'node:fs';
test('R07-07 initial modules are preloaded with one identity, media bytes stay bounded',()=>{
 const read=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
 const html=read('index.html'),preloads=[...html.matchAll(/rel="modulepreload" href="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(preloads).size,preloads.length);assert.ok(preloads.length>30);
 const queue=['app.js?v=1.0.11'],seen=new Set();
 while(queue.length){
  const path=queue.shift();if(seen.has(path))continue;seen.add(path);
  assert.ok(preloads.includes(path),'preload '+path);
  for(const match of read(path.split('?')[0]).matchAll(/from\s*['"]\.\/([^'"]+\.js(?:\?v=[^'"]+)?)['"]/g))queue.push(match[1]);
 }
 let bytes=0;
 for(const name of ['khimaira-bronze-web.webp','temple-blue-web.webp','button-dark-web.webp','button-ivory-web.webp','fonts/DMSans.woff2','fonts/Cinzel.woff2'])bytes+=statSync(new URL('../dist/'+name,import.meta.url)).size;
 assert.ok(bytes<225000,bytes+' initial media bytes');
 assert.doesNotMatch(read('theme.css'),/\.ttf/);assert.match(html,/khimaira-bronze-web.webp/);
 assert.match(read('odyssey.css'),/temple-blue-web.webp/);
 console.log('R07-07 initial media bytes:',bytes,'preloaded modules:',preloads.length);
});
