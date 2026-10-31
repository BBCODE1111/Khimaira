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
test('regional mode rejects incompatible authored input without generating out-of-collection notes',()=>{
 const s=createHarmony({text:'C | Am | F | G',style:'Dorian folk',key,locked:true});
 const out=act(s,{type:'generate',options:{randomness:'high'}});
 assert.equal(out.warning.type,'modal-incompatible');assert.deepEqual(out.score,s.score);assert.deepEqual(out.backbone,s.backbone);
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
  assert.equal(out[0].chords[0].symbol,'C');assert.equal(out[0].chords[0].morph.technique,'retained-target');
 }
});
test('trace metadata survives recall but does not make an identical score restorable',async()=>{
 const {sameDegrees}=await import('../dist/degree-chart.js');
 const s=createHarmony({text:'C'}),traced=structuredClone(s.score);
 traced[0].chords[0].morph={source:{bar:0,chord:0,onset:0},technique:'retained-target'};
 assert.ok(sameDegrees(s.score,traced));assert.equal(harmonyView({...s,score:traced}).canRestore,false);
});
