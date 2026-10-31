import test from 'node:test';import assert from 'node:assert/strict';
import {createHarmony,applyHarmonyAction as act,harmonyView,effectiveKey,migrateHarmony} from '../dist/harmony-state.js';
import {examplesForKey} from '../dist/keyed-examples.js';
import {mutate,styles} from '../dist/style-engine.js';
import {parse,mod} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
const played=s=>harmonyView(s).bars;
function checkAnchors(source,out,density){
 assert.equal(out.length,source.length);
 source.forEach((bar,i)=>{
  assert.equal(out[i].chords.reduce((n,c)=>n+c.beats,0),bar.chords.reduce((n,c)=>n+c.beats,0));
  assert.ok(out[i].chords.length<=Math.max(density,bar.chords.length));
  let at=0;
  for(const original of bar.chords){
   let time=0;const anchor=out[i].chords.find(c=>{const found=Math.abs(at-time)<1e-8;time+=c.beats;return found;});
   assert.ok(anchor,original.symbol+' at '+at);const a=parse(original.symbol),b=parse(anchor.symbol);
   if(!anchor.morph){assert.equal(anchor.symbol,original.symbol);at+=original.beats;continue;}
   assert.deepEqual(anchor.morph.source,{bar:i,chord:bar.chords.indexOf(original),onset:at});
   assert.ok(anchor.beats>0);
   if(['color','retained-target'].includes(anchor.morph.technique)){
    assert.equal(b.root,a.root);assert.equal(b.bass,a.bass);
    for(const seventh of [10,11])if(a.intervals.includes(seventh))assert.ok(b.intervals.includes(seventh));
   }else if(anchor.morph.technique==='inversion'){
    assert.equal(b.root,a.root);assert.ok(b.pcs.includes(b.bass));
   }else assert.ok(['parallel','ii-V'].includes(anchor.morph.technique));
   at+=original.beats;
  }
 });
}
test('reported D Jazz Ex1 LOAD is IV–iii/VI7–ii/V–I backbone; repeated MORPH never falls back to old I',()=>{
 for(const locked of [false,true]){
  let s=createHarmony({text:'I | vi | IV | V',key:{root:2},locked});const before=structuredClone(s);
  const p=examplesForKey('Jazz',s.key)[0];assert.equal(p.id,'contrast-Jazz-bright');
  s=act(s,{type:'example',id:p.id});const loaded=played(s),bone=structuredClone(s.backbone);
  assert.deepEqual(loaded.map(b=>parse(b.chords[0].symbol).root),[7,6,4,2]);
  assert.equal(serialize(loaded),harmonyView(s).sourceText);assert.deepEqual(act(s,{type:'undo'}),before);
  for(const randomness of ['low','medium','high'])for(const method of ['style','color','cadence','tritone']){
   s=act(s,{type:'generate',options:{randomness,method,density:3,recreate:true}});
   checkAnchors(loaded,played(s),3);assert.deepEqual(s.backbone,bone);assert.equal(s.key.root,2);assert.equal(s.keyMode,locked?'locked':'auto');
  }
  s=migrateHarmony(JSON.parse(JSON.stringify({harmony:s})));s=act(s,{type:'restore'});assert.deepEqual(played(s),loaded);
  s=act(s,{type:'transpose',key:{root:5}});const transposed=played(s);s=act(s,{type:'generate'});checkAnchors(transposed,played(s),2);assert.equal(s.key.root,5);
 }
});
test('every compatible example LOAD replaces backbone in all 24 keys; MORPH and recall preserve it',()=>{
 let count=0;
 for(const style of Object.keys(styles))for(const mode of ['major','minor'])for(let root=0;root<12;root++){
  const s=createHarmony({style,key:{root,mode},locked:true,text:mode==='minor'?'i | iv | V | i':'I | IV | V | I'});
  for(const p of examplesForKey(style,effectiveKey(s))){
   const loaded=act(s,{type:'example',id:p.id}),before=played(loaded);
   assert.equal(serialize(before),serialize(parseChart(p.chart)));assert.deepEqual(loaded.score,loaded.backbone.degrees);
   const out=act(loaded,{type:'generate',options:{randomness:'high',density:3}});checkAnchors(before,played(out),3);
   assert.deepEqual(out.key,s.key);assert.deepEqual(out.backbone,loaded.backbone);assert.deepEqual(act(out,{type:'restore'}).score,loaded.score);count++;
  }
 }
 assert.ok(count>3000);console.log('Keyed example LOAD/MORPH cases:',count);
});
test('approaches resolve to the actual next anchor; minor iiø–V, subV #11, loop, rests and density',()=>{
 const source=parseChart('Gmaj7 | F#m7 | Em7 | Dmaj7');
 const pair=mutate(source,{style:'Jazz',tonality:{root:2,mode:'major'},method:'cadence',randomness:'high',density:3,loop:false});
 assert.deepEqual(pair[0].chords.slice(1).map(c=>c.symbol),['G#m7b5','C#7b9']);assert.equal(pair.at(-1).chords.length,1);
 const sub=mutate(source,{style:'Jazz',tonality:{root:2,mode:'major'},method:'tritone',randomness:'high',density:2,loop:true});
 sub.filter(b=>b.chords.length>1).forEach(b=>{const i=sub.indexOf(b),c=parse(b.chords.at(-1).symbol),target=parse(source[(i+1)%4].chords[0].symbol);assert.equal(mod(c.root-target.root),1);assert.ok(c.intervals.includes(10));assert.match(c.q,/#11/);});
 const rest=parseChart('C | | F:1 G:1 Am:1 Bdim:1 | C/G | Dm7 | G7 | C');
 for(const density of [1,2,3])for(const method of ['style','color','cadence','tritone']){
  const out=mutate(rest,{style:'Jazz',tonality:{root:0,mode:'major'},randomness:'high',density,method,loop:false});checkAnchors(rest,out,density);
  assert.equal(out[0].chords.length,1);assert.equal(out[1].chords.length,0);assert.equal(out[5].chords.length,1);assert.equal(out[6].chords.length,1);
 }
});
test('all styles and methods preserve authored positions and traceable multi-chord mappings',()=>{
 const source=parseChart('Fmaj7/A:2 Em7/G:2 | Dm7/F:1.5 G7/B:2.5 | C/E | A7b9/C# | Dm7b5/Ab | G7#11/F | C/G | | C/E:1 G/B:1 Am/C:1 F/A:1');
 for(const style of Object.keys(styles))for(const method of ['style','color','cadence','tritone'])for(const density of [1,2,3])for(let seed=0;seed<4;seed++){
  const out=mutate(source,{style,method,density,seed,randomness:'high',tonality:{root:0,mode:'major'}});checkAnchors(source,out,density);
 }
});
test('INSPIRE remains a reversible preview; KEEP adopts it and subsequent MORPH uses that backbone',()=>{
 let s=createHarmony({key:{root:2},locked:true});s=act(s,{type:'example',id:examplesForKey('Jazz',s.key)[0].id});const bone=structuredClone(s.backbone);
 s=act(s,{type:'inspire',kind:'fusion'});assert.deepEqual(s.backbone,bone);const preview=played(s);s=act(s,{type:'keep',confirmed:true});
 assert.deepEqual(played(act(s,{type:'restore'})),preview);checkAnchors(preview,played(act(s,{type:'generate',options:{randomness:'high',density:3}})),3);
});

test('shared functional analysis protects secondary and unresolved dominant triads from maj7 colour',()=>{
 for(const style of ['Jazz','Fusion','Gospel','House','R&B','Neo-soul','Bossa nova'])for(let seed=0;seed<12;seed++){
  for(const [text,root,mode,indices] of [['C | E | Am | D | G | C',0,'major',[1,3,4]],['Dm | G | C | A',0,'major',[1,3]],['Em | A | Dm | G',0,'major',[1,3]],['Am | F | E | Am',9,'minor',[2]]]){
   const source=parseChart(text),out=mutate(source,{style,seed,randomness:'high',density:1,tonality:{root,mode}});
   for(const i of indices){const c=parse(out[i].chords[0].symbol);assert.ok(!c.intervals.includes(11),style+' '+text+' '+c.symbol);}
  }
 }
 // An authored tonic/plagal maj7 is not reclassified as a dominant.
 const out=mutate(parseChart('Cmaj7 | Fmaj7 | Cmaj7'),{style:'Jazz',randomness:'high',density:1,tonality:{root:0,mode:'major'}});out.forEach(b=>assert.ok(parse(b.chords[0].symbol).intervals.includes(11)));
});

test('Claude regressions: all tonal styles and levels protect V, applied V and minor dominant colours',()=>{
 for(const style of Object.keys(styles).filter(s=>!styles[s].world&&!['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(s)))for(const randomness of ['low','medium','high'])for(let seed=0;seed<6;seed++){
  for(const [text,root,mode,index] of [['C | Am | F | G',0,'major',3],['F | | Bb | C',5,'major',3],['Am | Dm | E | Am',9,'minor',2],['C/E | F | G/B | C',0,'major',2]]){
   const out=mutate(parseChart(text),{style,randomness,seed,density:1,tonality:{root,mode}}),c=parse(out[index].chords[0].symbol);
   assert.ok(!c.intervals.includes(11),style+' '+text+' '+c.symbol);if(mode==='minor')assert.ok(!c.intervals.includes(14)&&!c.intervals.includes(21),style+' '+c.symbol);
  }
 }
});
test('common dance styles offer multiple in-key colours without changing anchors or borrowing a new mode',()=>{
 for(const style of ['Amapiano','Reggaeton','Dancehall','Latin Pop'])for(const mode of ['major','minor']){
  const source=parseChart(mode==='major'?'C | Am | F | G':'Cm | Ab | Fm | Gm'),outputs=new Set();
  const scale=mode==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];
  for(let seed=0;seed<6;seed++){
   const out=mutate(source,{style,randomness:'medium',seed,density:2,tonality:{root:0,mode}});checkAnchors(source,out,2);outputs.add(serialize(out));
   out.flatMap(b=>b.chords).forEach(c=>assert.ok(parse(c.symbol).pcs.every(n=>scale.includes(n))));
  }assert.ok(outputs.size>1,style+' '+mode);
 }
});
