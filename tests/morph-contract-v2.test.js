import test from 'node:test';
import assert from 'node:assert/strict';
import {parallelDegreeChord} from '../dist/morph-techniques.js';
import {mutate} from '../dist/style-engine.js';
import {parse,mod,transposeSymbol} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {createHarmony,applyHarmonyAction as act,harmonyView,migrateHarmony} from '../dist/harmony-state.js';

const key={root:0,tonic:'C',mode:'major'};
test('approved parallel conversion follows degree, including V and vii, across all keys',()=>{
 const examples=[['C','Cm'],['Dm','Ddim'],['Em','Eb'],['F','Fm'],['G','Gm'],['Am','Ab'],['Bdim','Bb'],['Am7','Abmaj7'],['Em9','Ebmaj9'],['G7','Gm7'],['Fmaj9','Fm9']];
 for(let root=0;root<12;root++)for(const [before,after] of examples){
  const a=transposeSymbol(before,root,root),b=transposeSymbol(after,root,root);
  const result=parallelDegreeChord(a,{root,tonic:parse(transposeSymbol('C',root,root)).rootName,mode:'major'});
  assert.equal(parse(result).root,parse(b).root);assert.deepEqual(parse(result).intervals,parse(b).intervals);
  assert.equal(parse(parallelDegreeChord(result,{root,mode:'minor'})).root,parse(a).root);
 }
 assert.equal(parallelDegreeChord('E7',key),null);assert.equal(parallelDegreeChord('Ab',key),null);
});
function checkMapping(source,out){
 assert.equal(out.length,source.length);
 const all=out.flatMap((bar,b)=>{let onset=0;return bar.chords.map(c=>{const x={...c,bar:b,onset};onset+=c.beats;return x;});});
 let originalCount=0;
 source.forEach((bar,b)=>{
  assert.equal(out[b].chords.reduce((n,c)=>n+c.beats,0),bar.chords.reduce((n,c)=>n+c.beats,0));
  let onset=0;
  bar.chords.forEach((c,j)=>{
   originalCount++;
   const slot=all.filter(x=>x.morph.source.bar===b&&x.morph.source.chord===j);
   assert.ok(slot.length);assert.equal(slot[0].onset,onset);assert.equal(slot[0].morph.source.onset,onset);
   assert.equal(slot.reduce((n,x)=>n+x.beats,0),c.beats);assert.ok(slot.every(x=>x.bar===b));
   if(slot[0].morph.technique==='parallel')assert.equal(slot[0].symbol,parallelDegreeChord(c.symbol,key));
   if(slot[0].morph.technique==='inversion'){assert.equal(parse(slot[0].symbol).root,parse(c.symbol).root);assert.ok(parse(slot[0].symbol).pcs.includes(parse(slot[0].symbol).bass));}
   for(const x of slot.filter(x=>x.morph.target)){
    const t=x.morph.target,original=source[t.bar].chords[t.chord];
    const arrival=all.find(a=>a.bar===t.bar&&a.onset===t.onset);assert.ok(arrival);
    assert.equal(parse(arrival.symbol).root,parse(original.symbol).root);
    assert.notEqual(arrival.morph.technique,'ii-V');assert.notEqual(arrival.morph.technique,'parallel');
    const next=bar.chords[j+1]||source[b+1]?.chords[0]||(b===source.length-1?source[0]?.chords[0]:null);
    assert.equal(original,next); // No skipped rests or leap over a backbone target.
    if(x.morph.part==='V'||x===slot.at(-1))assert.ok([1,7].includes(mod(parse(x.symbol).root-parse(original.symbol).root)));
   }
   onset+=c.beats;
  });
 });
 assert.equal(new Set(all.map(c=>JSON.stringify(c.morph.source))).size,originalCount);
 const final=all.at(-1),last=source.flatMap(b=>b.chords).at(-1);
 // Final source starts with its literal arrival, possibly followed by loop pickup.
 const arrival=all.find(c=>c.morph.source.bar===final.morph.source.bar&&c.morph.source.chord===final.morph.source.chord);
 assert.equal(parse(arrival.symbol).root,parse(last.symbol).root);
}
test('MORPH matrix maps every event to ordered backbone slots and actual retained targets',()=>{
 let cases=0;const seen=new Set();
 for(const chart of ['C | Am | Em | F | G | C','F | C','C | G | C','C/E:2 Am:2 | F:1 G:3 | | Dm | G7 | C']){
  const source=parseChart(chart);
  for(const randomness of ['low','medium','high'])for(const density of [1,2,3])for(let seed=0;seed<30;seed++){
   const out=mutate(source,{style:'Jazz',tonality:key,randomness,density,seed});checkMapping(source,out);
   out.flatMap(b=>b.chords).forEach(c=>seen.add(c.morph.technique));cases++;
   assert.deepEqual(out,mutate(source,{style:'Jazz',tonality:key,randomness,density,seed}));
  }
 }
 assert.ok(seen.has('parallel'));assert.ok(seen.has('inversion'));assert.ok(seen.has('ii-V'));
 console.log('MORPH v2 mapping cases:',cases);
});
test('variation amplitude increases approved techniques; RESTORE, recall and key remain intact',()=>{
 const source=parseChart('C | Am | Em | F | G | C'),counts=[];
 for(const randomness of ['low','medium','high']){
  let total=0;
  for(let seed=0;seed<30;seed++)total+=mutate(source,{style:'Jazz',tonality:key,randomness,density:3,seed}).flatMap(b=>b.chords).filter(c=>['parallel','inversion','ii-V'].includes(c.morph.technique)).length;
  counts.push(total);
 }
 assert.ok(counts[0]<counts[1]&&counts[1]<counts[2],String(counts));
 let s=createHarmony({text:serialize(source),key,locked:true});const initial=structuredClone(s);
 s=act(s,{type:'generate',options:{randomness:'high',length:4,seed:2}});
 assert.equal(s.score.length,6);assert.equal(s.warning.type,'length-preserved');assert.deepEqual(s.key,initial.key);
 const saved=migrateHarmony(JSON.parse(JSON.stringify({harmony:s})));assert.deepEqual(saved,s);
 assert.deepEqual(act(saved,{type:'restore'}).score,initial.score);assert.deepEqual(act(s,{type:'undo'}),initial);
});
test('regional mode accepts authored input; only newly added tones must respect its collection',()=>{
 const s=createHarmony({text:'C | Am | F | G',style:'Dorian folk',key,locked:true});
 const out=act(s,{type:'generate',options:{randomness:'high'}});
 assert.notEqual(out.warning?.type,'modal-incompatible');assert.equal(out.origin.type,'morph');assert.deepEqual(out.backbone,s.backbone);
 for(const c of harmonyView(out).bars.flatMap(b=>b.chords)){const a=c.morph.source,p=parse(c.symbol),original=parse(harmonyView(s).bars[a.bar].chords[a.chord].symbol);assert.ok(p.pcs.every(n=>[0,2,3,5,7,9,10].includes(n)||original.pcs.includes(n)));}
});
test('automatic approaches never duplicate the preceding anchor root, across styles and levels',async()=>{
 const {styles}=await import('../dist/style-engine.js');let cases=0;
 for(const text of ['C | Am | F | G','C | G | C','F | C','Dm7 | G7 | Cmaj7 | A7'])for(const style of Object.keys(styles))for(const randomness of ['low','medium','high'])for(let seed=0;seed<5;seed++){
  const out=mutate(parseChart(text),{style,tonality:key,randomness,seed,density:3});
  out.forEach(bar=>bar.chords.forEach((c,i)=>{
   if(c.morph.technique==='approach'){assert.ok(i>0);assert.notEqual(parse(c.symbol).root,parse(bar.chords[i-1].symbol).root);}
  }));cases++;
 }
 assert.equal(cases,2940);console.log('Same-root approach cases:',cases);
});
test('loop tonic is a retained resolution target rather than merely retaining the last dominant',()=>{
 const source=parseChart('C | Am | F | G');
 for(let seed=0;seed<30;seed++){
  const out=mutate(source,{style:'Jazz',tonality:key,randomness:'high',seed});
  // Round 4: Jazz arrivals retain root/major core while adding colour.
  const tonic=parse(out[0].chords[0].symbol);assert.equal(tonic.root,0);assert.ok([0,4,7].every(n=>tonic.intervals.includes(n)));assert.ok(!tonic.intervals.includes(10));assert.equal(out[0].chords[0].morph.technique,'retained-target');
 }
});
test('trace metadata survives recall but does not make an identical score restorable',async()=>{
 const {sameDegrees}=await import('../dist/degree-chart.js');
 const s=createHarmony({text:'C'}),traced=structuredClone(s.score);
 traced[0].chords[0].morph={source:{bar:0,chord:0,onset:0},technique:'retained-target'};
 assert.ok(sameDegrees(s.score,traced));assert.equal(harmonyView({...s,score:traced}).canRestore,false);
});

import {analyzeHarmony} from '../dist/music.js';
import {styles} from '../dist/style-engine.js';
import {styleTonality} from '../dist/backbone-mutation.js';
const dominantCharts=[
 'C | E7 | Am | D7 | G7 | C','C | A7 | Dm | G7','Dm7 | G7 | Cmaj7 | A7',
 'Cmaj7 | Am7 | D7 | G7','Em7 | A7 | Dm7 | G7 | C','C | C7 | F | Fm | C',
 'Am | Dm | E7 | Am','F#m7 | B7 | Emaj7 | C#7','C7 | F7 | C7 | A7 | Dm7 | G7 | C7 | G7',
 'C/E:2 A7:2 | Dm:2 D7:2 | G7 | C',
 'C | E7 | Am | A7 | Dm | D7 | G7 | C','Am | G | F | E7',
 'Db | F7 | Bbm | Eb7 | Ab7 | Db','F7 | D7 | Gm7 | C7'
];
test('R02-01: 14 dominant chains × 49 styles × 3 levels × 30 seeds retain actual resolution',()=>{
 let cases=0,links=0;
 for(const chart of dominantCharts){
  const source=parseChart(chart),rows=analyzeHarmony(source,key).events;
  for(const style of Object.keys(styles))for(const randomness of ['low','medium','high'])for(let seed=0;seed<30;seed++){
   const out=mutate(source,{style,tonality:styleTonality(style,styles[style],key),randomness,seed,density:3});
   const events=out.flatMap(b=>b.chords);
   for(const row of rows.filter(r=>r.relation==='dominant'&&r.target!=null)){
    const sources=source.flatMap((b,bar)=>b.chords.map((c,chord)=>({bar,chord,...c})));
    const a=sources[row.index],t=sources[row.target],slot=events.filter(c=>c.morph.source.bar===a.bar&&c.morph.source.chord===a.chord);
    const actual=events[(events.indexOf(slot.at(-1))+1)%events.length];
    assert.equal(parse(actual.symbol).root,parse(t.symbol).root,`${chart}; ${style}/${randomness}/${seed}; ${serialize(out)}`);
    if(slot[0].morph.technique==='ii-V'){assert.equal(slot.length,2);assert.equal(mod(parse(slot[1].symbol).root-parse(t.symbol).root),7);assert.equal(slot[1].morph.target.bar,t.bar);assert.equal(slot[1].morph.target.chord,t.chord);}
    else assert.ok(parse(slot[0].symbol).intervals.includes(4),'retained dominant keeps its third');links++;
   }
   cases++;
  }
 }
 assert.equal(cases,61740);console.log('R02-01:',cases,'cases;',links,'dominant resolutions');
});
test('R02-02: slash parallel maps chord positions; 200 seeded charts lose zero authored bass positions',()=>{
 for(const [a,b] of [['C/G','Cm/G'],['C/E','Cm/Eb'],['G/B','Gm/Bb'],['Am/E','Ab/Eb'],['C/D','Cm/D']])assert.equal(parallelDegreeChord(a,key),b);
 let parallel=0;
 for(const chart of ['C | G/B | Am | C/G | F | C/E | Dm | G','C/E | Am/E | F/A | G/B | C/G | F | Dm | C'])for(let seed=0;seed<100;seed++){
  const source=parseChart(chart),out=mutate(source,{style:'Mandopop',tonality:key,randomness:'high',seed,preserveBass:true});
  for(const c of out.flatMap(b=>b.chords)){
   assert.ok(!['inversion','ii-V','approach'].includes(c.morph.technique));
   const a=source[c.morph.source.bar].chords[c.morph.source.chord];
   if(c.morph.technique==='parallel'&&parse(a.symbol).bassName){parallel++;assert.equal(c.symbol,parallelDegreeChord(a.symbol,key));assert.ok(parse(c.symbol).bassName);}
  }
 }
 assert.ok(parallel>0);console.log('R02-02: 200 charts;',parallel,'slash parallel conversions; lost: 0');
});
test('R02-02 switches independently suppress techniques without prohibiting approved parallel borrowing',()=>{
 const source=parseChart('C | Am | Em | F | G | C');
 for(const [option,technique] of [['inversion','inversion'],['parallel','parallel'],['iiV','ii-V']])for(let seed=0;seed<30;seed++){
  const out=mutate(source,{style:'Jazz',tonality:key,randomness:'high',seed,techniques:{[option]:false}});
  assert.ok(out.flatMap(b=>b.chords).every(c=>c.morph.technique!==technique&&(option!=='iiV'||c.morph.technique!=='approach')));
 }
 const results=Array.from({length:30},(_,seed)=>mutate(source,{style:'Jazz',tonality:key,randomness:'high',seed,preserveBass:true})).flatMap(b=>b.flatMap(bar=>bar.chords));
 assert.ok(results.some(c=>c.symbol==='Ab'));assert.ok(results.some(c=>c.symbol==='Eb'));
});
test('R02-03: four dance styles keep both tonal modes and collection; other 45 projections unchanged',()=>{
 const dance=['Reggaeton','Dancehall','Latin Pop','Amapiano'],modes={'Dorian folk':'dorian','Phrygian dominant':'hijaz','Major blues':'major-blues','Minor blues':'minor-blues'};
 for(const mode of ['major','minor'])for(const style of Object.keys(styles)){
  const k={...key,mode},actual=styleTonality(style,styles[style],k);
  assert.equal(actual.mode,dance.includes(style)?mode:styles[style].world?styles[style].scaleIds[0]:modes[style]||mode);
  if(!dance.includes(style))continue;
  const s=createHarmony({text:mode==='major'?'C | Am | F | G':'Cm | Ab | Fm | Gm',style,key:k,locked:true});
  const out=act(s,{type:'generate',options:{randomness:'high',seed:1}}),allowed=mode==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];
  assert.notEqual(out.warning?.type,'modal-incompatible');assert.equal(harmonyView(out).tonality.mode,mode);
  assert.notEqual(serialize(harmonyView(out).bars),serialize(harmonyView(s).bars));
  for(const c of harmonyView(out).bars.flatMap(b=>b.chords))assert.ok([...parse(c.symbol).pcs,parse(c.symbol).bass].every(n=>allowed.includes(n)));
 }
});
test('R02-08: no redundant ii–V after existing ii, no collapsed authored neighbours',()=>{
 for(const text of ['Dm7 | G7 | Cmaj7 | A7','C:2 C/E:2 | F:2 F#dim7:2 | C/G:2 G7:2 | C','C:2 C:2 | F | G | C'])for(const style of Object.keys(styles))for(const randomness of ['medium','high'])for(let seed=0;seed<30;seed++){
  const source=parseChart(text),flat=source.flatMap(b=>b.chords),out=mutate(source,{style,tonality:key,randomness,seed,density:3});
  for(const bar of out)bar.chords.forEach((c,i)=>{
   const previous=bar.chords[i-1];if(!previous||previous.symbol!==c.symbol)return;
   const a=previous.morph.source,b=c.morph.source;
   assert.equal(source[a.bar].chords[a.chord].symbol,source[b.bar].chords[b.chord].symbol,serialize(out));
  });
  for(const c of out.flatMap(b=>b.chords).filter(c=>c.morph.part==='ii')){
   const a=c.morph.source,index=source.slice(0,a.bar).reduce((n,b)=>n+b.chords.length,0)+a.chord,previous=parse(flat[(index+flat.length-1)%flat.length].symbol);
   assert.ok(!previous.minor||previous.root!==parse(c.symbol).root,serialize(out));
  }
 }
});
