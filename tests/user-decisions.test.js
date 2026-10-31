import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,spellPitch,spellInterval,mod,transposeSymbol,analyzeHarmony} from '../dist/music.js';
import {spellSelectedChord,extraChordChoices} from '../dist/chord-input.js';
import {normalizeKey,chartToDegrees,degreeLabels,formatDegreeChart} from '../dist/degree-chart.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {parallelDegreeChord} from '../dist/morph-techniques.js';
import {mutate,styles} from '../dist/style-engine.js';
import {detectKey} from '../dist/key-detection.js';
import {popOpeningStyles,openingTonicChoice} from '../dist/morph-profiles.js';
import {createHarmony,applyHarmonyAction as act,harmonyView} from '../dist/harmony-state.js';
import {worldScales} from '../dist/world-styles.js';
const key={root:0,tonic:'C',mode:'major'};
const shifted=(text,shift)=>parseChart(text).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:transposeSymbol(c.symbol,shift,shift)}))}));

test('decision 1: diminished leading-tone spelling follows the actual target in all 12 transpositions',()=>{
 for(const [symbol,target,want] of [['Dbdim7','Dm','C#dim7'],['Gbm7b5','G','F#m7b5'],['Abdim7','Am','G#dim7'],['Ebdim7','Em','D#dim7']]){
  assert.equal(spellSelectedChord(symbol,key,target),want);
  for(let shift=0;shift<12;shift++){
   const input=transposeSymbol(symbol,shift,shift),next=transposeSymbol(target,shift,shift),actual=spellSelectedChord(input,normalizeKey({root:shift,mode:'major'}),next);
   assert.equal(parse(actual).rootName,spellInterval(parse(next).rootName,-1,-1));
   assert.deepEqual(parse(actual).pcs,parse(input).pcs);
  }
 }
});
test('decision 1: no-target diminished picker defaults to sharps; subV stays flat',()=>{
 for(let root=0;root<12;root++)for(const mode of ['major','minor'])for(const q of ['dim7','m7b5']){
  const k=normalizeKey({root,mode});
  for(const [pitch,name] of [[1,'C#'],[3,'D#'],[6,'F#'],[8,'G#'],[10,'A#']])assert.equal(spellSelectedChord(spellPitch(pitch,k)+q,k),name+q);
 }
 for(const [symbol,target] of [['Db7','C'],['Gb7','F']])assert.equal(spellSelectedChord(symbol,key,target),symbol);
 // Preserve the already-debugged local iiø–V spelling, too.
 assert.equal(spellSelectedChord('Gbm7b5',key,'B7'),'F#m7b5');
});
test('decision 2: every minor key spells natural and raised sixth by the sixth letter',()=>{
 const expected=[['C','Ab','A'],['C#','A','A#'],['D','Bb','B'],['Eb','Cb','C'],['E','C','C#'],['F','Db','D'],['F#','D','D#'],['G','Eb','E'],['G#','E','E#'],['A','F','F#'],['Bb','Gb','G'],['B','G','G#']];
 expected.forEach(([tonic,natural,raised],root)=>{
  const k={root,tonic,mode:'minor'};
  assert.equal(spellPitch(mod(root+8),k),natural);assert.equal(spellPitch(mod(root+9),k),raised);
  assert.equal(extraChordChoices(k).find(c=>c.label==='vi').symbol,raised+'m');
 });
});
test('decision 3: reject major-seventh slash bass after parallel borrowing, preserving the original in MORPH',()=>{
 for(let shift=0;shift<12;shift++){
  const k=normalizeKey({root:shift,mode:'major'}),symbol=transposeSymbol('Am/G',shift,shift);
  assert.equal(parallelDegreeChord(symbol,k),symbol);
  let kept=0;
  for(let seed=0;seed<60;seed++){
   const c=mutate(shifted('C | Am/G | Em | F',shift),{style:'Jazz',tonality:k,randomness:'high',seed,preserveBass:true,techniques:{inversion:false,iiV:false}})[1].chords[0];
   assert.equal(c.symbol,symbol);if(c.morph.technique==='retained-target')kept++;
  }
  assert.ok(kept>0);
 }
 for(const [source,want] of [['C/G','Cm/G'],['C/E','Cm/Eb'],['G/B','Gm/Bb']])assert.equal(parallelDegreeChord(source,key),want);
});
test('decision 5: allow IV→iv beside same-bar iv, protect the cross-bar and loop gestures',()=>{
 let sameBarChanges=0;
 for(let shift=0;shift<12;shift++)for(let seed=0;seed<60;seed++){
  const k=normalizeKey({root:shift,mode:'major'}),options={style:'Rock',tonality:k,randomness:'high',seed,preserveBass:true,techniques:{iiV:false,inversion:false}};
  for(const text of ['C | Am | F | Fm','Fm | C | Am | F']){
   const out=mutate(shifted(text,shift),options),slot=text.startsWith('Fm')?3:2;
   const c=parse(out[slot].chords[0].symbol);assert.equal(c.root,mod(shift+5));assert.ok(c.intervals.includes(4));
  }
  const out=mutate(shifted('C | Am | F:2 Fm:2 | Dm',shift),options);
  if(out[2].chords[0].morph.technique==='parallel'){sameBarChanges++;assert.equal(parse(out[2].chords[0].symbol).minor,true);assert.equal(out[2].chords[0].symbol,out[2].chords[1].symbol);}
  const wrap=mutate(shifted('Fm:1 C:1 Am:1 F:1',shift),options);
  assert.ok(parse(wrap[0].chords.at(-1).symbol).intervals.includes(4));
 }
 assert.ok(sameBarChanges>0);console.log('decision 5 same-bar IV→iv',sameBarChanges,'/ 720');
});
test('decision 6: pop opening proposal probability is 1/12, with measured eligible and protected outcomes',()=>{
 for(const style of popOpeningStyles){
  let proposals=0,actual=0,protectedChanges=0;
  for(let seed=0;seed<1200;seed++){
   if(openingTonicChoice(style,seed)===1)proposals++;
   for(const loop of [false,true]){
    const c=mutate(parseChart('C | G | Am | F'),{style,tonality:key,randomness:'high',seed,loop})[0].chords[0];
    if(c.morph.technique==='parallel'){if(loop)protectedChanges++;else actual++;}
   }
  }
  assert.ok(proposals>=65&&proposals<=135,style+' '+proposals);assert.equal(protectedChanges,0);
  // Slot budgets and earlier target reservations can suppress a proposal.
  if(style!=='Latin Pop')assert.ok(actual>0&&actual<=proposals);else assert.equal(actual,0);
  console.log('decision 6',style,{seeds:1200,proposals,actual,protectedChanges});
 }
});
test('decision 6: Am→Ab and Em→Eb remain available in pop and Heavy Metal',()=>{
 for(const style of ['American pop','Mandopop','K-pop','Ballad','Japanese rock','Heavy Metal']){
  const roots=new Set();
  for(let seed=0;seed<100;seed++)for(const c of mutate(parseChart('C | Am | Em | F | G | C'),{style,tonality:key,randomness:'high',seed}).flatMap(b=>b.chords))if(c.morph.technique==='parallel')roots.add(parse(c.symbol).root);
  assert.ok(roots.has(8)&&roots.has(3),style);
 }
});
test('decision 7: chromatic dominant descent keeps bIII7 on tiles and COPY in all keys',()=>{
 for(let shift=0;shift<12;shift++){
  const k=normalizeKey({root:shift,mode:'major'}),bars=shifted('C | Eb7 | D7 | Db7 | C',shift),degrees=chartToDegrees(bars,k);
  assert.equal(analyzeHarmony(bars,k).events[1].label,'bIII7');assert.equal(degreeLabels(degrees,k)[1][0],'bIII7');
  for(const bassNames of [false,true])assert.equal(formatDegreeChart(degrees,k,{bassNames}).split('|')[2].trim(),'bIII7');
 }
});
test('decision 11: pure IV–V excludes V-key candidate in all 12 keys, including inversions and non-loop mode',()=>{
 for(let shift=0;shift<12;shift++)for(const loop of [false,true])for(const text of ['F | G | F | G','F/A | G/B | F/C | G/D']){
  const result=detectKey(shifted(text,shift),{loop});assert.equal(result.primary.root,shift);assert.equal(result.primary.mode,'major');
  assert.ok(!result.candidates.some(k=>k.root===mod(shift+7)&&k.mode==='major'));
 }
 for(const text of ['F | G | Em | Am','Am | F | C | G']){
  const result=detectKey(parseChart(text));assert.ok(result.candidates.some(k=>k.root===0&&k.mode==='major'));assert.ok(result.candidates.some(k=>k.root===9&&k.mode==='minor'));
 }
});
test('P2-D: all 49 styles meet 10/12 or have an explicitly tested functional/collection limit',()=>{
 const limited=new Set(['Heavy Metal','Phrygian dominant','Dorian folk','Greek Hijaz','Japanese Hirajoshi','Japanese In-sen','Flamenco','Arabic Hijaz','Celtic Dorian']);
 const counts={};
 for(const style of Object.keys(styles)){
  let s=createHarmony({text:'C | G | Am | F',style,key,locked:true});const unique=new Set(),outputs=[],source=parseChart('C | G | Am | F');
  const scale=worldScales[['Amapiano','Reggaeton','Dancehall','Latin Pop'].includes(style)?'major':styles[style].scaleIds?.[0]||({'Phrygian dominant':'hijaz','Dorian folk':'dorian'})[style]];
  for(let i=0;i<36;i++){
   s=act(s,{type:'generate',options:{randomness:'high'}});const bars=harmonyView(s).bars;outputs.push(serialize(bars));if(i<12)unique.add(serialize(bars));
   assert.equal(bars.length,4);
   for(const [bar,b] of bars.entries()){
    assert.equal(b.chords.reduce((n,c)=>n+c.beats,0),4);
    if(scale)for(const c of b.chords){const original=parse(source[c.morph.source.bar].chords[c.morph.source.chord].symbol),p=parse(c.symbol);assert.ok([...p.pcs,p.bass].every(n=>scale.intervals.includes(n)||original.pcs.includes(n)||n===original.bass),style+' '+c.symbol);}
    if(bar===0||bar===3)assert.equal(b.chords[0].morph.technique,'retained-target');
   }
  }
  counts[style]=unique.size;
  if(!limited.has(style))for(let i=0;i<=24;i++)assert.ok(new Set(outputs.slice(i,i+12)).size>=10,style+' window '+i);
  else assert.equal(unique.size,style==='Heavy Metal'?6:4,style);
 }
 assert.equal(Object.keys(counts).length,49);console.log('P2-D user decisions',JSON.stringify(counts));
});
