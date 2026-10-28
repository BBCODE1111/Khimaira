import test from 'node:test';import assert from 'node:assert/strict';
import {parse,mod} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {styles,mutate} from '../dist/style-engine.js';
import {createHarmony,applyHarmonyAction,harmonyView,effectiveKey} from '../dist/harmony-state.js';
import {keyCases} from './key-cases.js';

// Acceptance oracle deliberately independent of the generator and key detector.
// Original event onsets are the anchors; original beat lengths supply weights.
const role=(symbol,root)=>{const c=parse(symbol),n=mod(c.root-root);return n===0||[3,4,8,9].includes(n)?'T':[2,5].includes(n)?'S':n===7||n===10||n===11&&c.intervals.includes(6)?'D':n===1&&c.intervals.includes(4)&&c.intervals.includes(10)?'D':n===1?'S':'X'+n;};
function anchors(source,out,key){
 let total=0,rootKept=0,functionKept=0,change=0;
 source.forEach((bar,i)=>{let onset=0;bar.chords.forEach(c=>{
  let at=0;const replacement=out[i].chords.find(x=>{const match=onset>=at-1e-8&&onset<at+x.beats-1e-8;at+=x.beats;return match;});
  assert.ok(replacement,'missing original onset');const a=parse(c.symbol),b=parse(replacement.symbol);
  total+=c.beats;if(a.root===b.root)rootKept+=c.beats;if(role(c.symbol,key)===role(replacement.symbol,key))functionKept+=c.beats;
  change+=c.beats*((a.root!==b.root?4:0)+(a.minor!==b.minor?2:0)+(a.q!==b.q?1:0)+(a.bass!==b.bass?.5:0));onset+=c.beats;
 });});
 change+=out.reduce((n,b,i)=>n+Math.max(0,b.chords.length-source[i].chords.length)*4,0);
 return {rootKept:rootKept/total,functionKept:functionKept/total,change};
}
test('all 49 styles × 28 labelled backbones × 3 levels × 5 seeds retain anchors, cadence and increasing mutation',()=>{
 let comparisons=0;
 for(const [text,root,mode] of keyCases)for(const style of Object.keys(styles)){
  const source=parseChart(text),tonality=effectiveKey(createHarmony({text,key:{root,mode},locked:true,style}));
  const before=serialize(source);
  for(let seed=0;seed<5;seed++){
   const outs=['low','medium','high'].map(randomness=>mutate(source,{style,seed,randomness,tonality}));
   const stats=outs.map(out=>anchors(source,out,root));
   assert.ok(stats[0].rootKept>=.9,style+' LOW roots');assert.ok(stats[1].functionKept>=.7,style+' MEDIUM functions');
   assert.ok(stats[0].change<stats[1].change,`${style} ${text} seed ${seed}: LOW ${stats[0].change} >= MED ${stats[1].change}`);
   assert.ok(stats[1].change<stats[2].change,`${style} ${text} seed ${seed}: MED ${stats[1].change} >= HIGH ${stats[2].change}`);
   assert.equal(new Set(outs.map(serialize)).size,3,style+' levels');
   for(let level=0;level<outs.length;level++){
    const out=outs[level];assert.equal(out.length,source.length);
    out.forEach((b,i)=>{assert.equal(b.chords.reduce((n,c)=>n+c.beats,0),4);assert.ok(b.chords.length<=4);b.chords.forEach(c=>assert.ok(parse(c.symbol),c.symbol));
     if(i===0||i===out.length-1||i%4===3){assert.equal(role(b.chords[0].symbol,root),role(source[i].chords[0].symbol,root),style+' phrase anchor');
      if(i%4===3||i===out.length-1)assert.equal(role(b.chords.at(-1).symbol,root),role(source[i].chords.at(-1).symbol,root),style+' cadence endpoint');}
    });comparisons++;
   }
  }
  assert.equal(serialize(source),before);
 }
 assert.equal(comparisons,49*28*3*5);
});
test('GENERATE repeatedly varies each style while tonic, mode and backbone stay fixed',()=>{
 for(const style of Object.keys(styles))for(const randomness of ['low','medium','high']){
  let s=createHarmony({text:'F | Dm | Bb | C',style}),previous=serialize(harmonyView(s).bars);
  const key=effectiveKey(s),backbone=JSON.stringify(s.backbone);
  for(let i=0;i<10;i++){
   s=applyHarmonyAction(s,{type:'generate',options:{randomness}});const current=serialize(harmonyView(s).bars);
   assert.notEqual(current,previous,style+' '+randomness);assert.deepEqual(effectiveKey(s),key);assert.equal(JSON.stringify(s.backbone),backbone);assert.equal(s.warning,null);previous=current;
  }
 }
});
test('stale KEY cannot make direct anchored generation retune or color F dominant as Cmaj7',()=>{
 const source=parseChart('F | Dm | Bb | C');
 for(let seed=0;seed<10;seed++){
  const out=mutate(source,{key:0,style:'Jazz',randomness:'low',seed});assert.ok(anchors(source,out,5).rootKept>=.9);
  assert.ok(!out[3].chords.some(c=>/^Cmaj/.test(c.symbol)));
 }
});
test('only explicit recompose discards populated backbone; empty input still generates ideas',()=>{
 const source=parseChart('F | Dm | Bb | C'),auto=mutate(source,{style:'Jazz'}),recreate=mutate(source,{style:'Jazz',key:5,recreate:true});
 assert.notEqual(serialize(auto),serialize(recreate));
 const s=applyHarmonyAction(createHarmony({text:'',key:{root:5}}),{type:'generate',options:{length:8}});
 assert.equal(s.score.length,8);assert.equal(s.key.root,5);assert.equal(s.origin.type,'idea');assert.ok(s.score.every(b=>b.chords.length));
});
