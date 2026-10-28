import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse,mod,spellChord,transposeSymbol} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {mutate,minorizeChart,tint,cadenceTo,insertApproach,connectBass,styles} from '../dist/style-engine.js';
import {performance,voicePlan} from '../dist/performance.js';
const symbols=bars=>bars.flatMap(b=>b.chords.map(c=>c.symbol));
test('authored functional spellings and slash bass survive color and transposition',()=>{
 for(const symbol of ['D7/F#','E7/G#','F#m7b5','F#dim7']){
  assert.equal(spellChord(symbol,0),symbol);assert.equal(transposeSymbol(symbol,0,0),symbol);
  assert.equal(parse(tint(symbol,'Gospel','low',()=>0)).rootName,parse(symbol).rootName);
  assert.equal(parse(tint(symbol,'Gospel','low',()=>0)).bassName,parse(symbol).bassName);
 }
 assert.equal(transposeSymbol('D7/F#',4,4),'F#7/A#');
 for(const target of ['Ab','Eb','Db','Gb','Cb','G#','C#'])assert.ok(!/bb|Fb/.test(cadenceTo(target,{tritone:true})[1]));
});
test('cadences reject passing diminished chords and preserve existing ii–V tails',()=>{
 for(const target of ['Bdim','F#dim7','Cm7b5','Cm7(b5)'])assert.equal(cadenceTo(target),null);
 const ii=parseChart('| Dm7 |')[0].chords;assert.deepEqual(insertApproach(ii,'C').map(c=>c.symbol),['Dm7','G7']);
 const iiV=parseChart('| Dm7:2 G7:2 |')[0].chords;assert.deepEqual(insertApproach(iiV,'C'),iiV);
 const tail=parseChart('| C:2 Am:2 |')[0].chords,out=insertApproach(tail,'F');assert.deepEqual(out[0],tail[0]);assert.equal(out.reduce((s,c)=>s+c.beats,0),4);
});
test('explicit minor conversion retargets secondary dominants; mutation never applies it implicitly',()=>{
 const converted=minorizeChart(parseChart('| C/G | E9/G# | Am9 | Fmaj7 Fm6 | G/B | C |'));
 assert.deepEqual(symbols(converted),['Cm/G','Eb7/G','Abmaj9','Fmaj7','Fm6','G/B','Cm']);
 const jazz=minorizeChart(parseChart('| C | B7b9 | Em9 | G7 |'));
 assert.equal(symbols(jazz)[1],'Bb7');assert.equal(symbols(jazz)[2],'Ebmaj9');
 const manual=mutate(parseChart('| C | Am | F | G |'),{mode:'minor',method:'color',randomness:'low'});
 assert.equal(parse(manual[0].chords[0].symbol).minor,false);assert.equal(parse(manual[1].chords[0].symbol).root,9);
});
test('explicit medium recompose reconstructs on odd and even seeds; style color stays idiomatic',()=>{
 const input=parseChart('| C | Am | F | G |');
 for(const seed of [0,1,2,3])assert.ok(mutate(input,{style:'Jazz',seed,recreate:true}).every(b=>b.reason.includes('句型重構')));
 for(const style of ['Rock','EDM'])assert.ok(!parse(tint('G',style,'medium',()=>.99)).intervals.includes(10));
 for(const c of ['C','Dm','G'])assert.ok(!/add9|maj9|^G9/.test(tint(c,'Classical','high',()=>.99)));
 assert.ok(parse(tint('C','Major blues','medium',()=>0)).intervals.includes(10));
 const bass=connectBass(parseChart('| C | G | Am |'),0);assert.equal(bass[1].chords[0].symbol,'G/B');
});
test('8/16-bar short forms develop A–A-prime and retain full duration',()=>{
 for(const length of [8,16]){const input=Array.from({length},()=>({chords:[]}));const out=mutate(input,{style:'Classical',seed:1,loop:false});assert.notEqual(serialize(out.slice(0,4)),serialize(out.slice(4,8)));assert.equal(parse(out.at(-1).chords[0].symbol).root,0);assert.ok(out.every(b=>b.chords.reduce((s,c)=>s+c.beats,0)===4));}
});
test('repeated harmony has multiple rhythm motifs and a dynamic arc without random feel',()=>{
 const chart=parseChart('| C | C | C | C | C | C | C | C |');
 for(const pattern of ['rock','pop','edm','disco','blues','jpop','alberti','folk','metal']){
  const notes=performance(chart,pattern,{human:0,swing:0});
  const rhythms=Array.from({length:8},(_,bar)=>[...new Set(notes.filter(n=>n.beat>=bar*4&&n.beat<(bar+1)*4).map(n=>n.part+':'+(n.beat-bar*4).toFixed(3)))].join(','));
  assert.ok(new Set(rhythms).size>=3,pattern);const means=Array.from({length:8},(_,bar)=>{const ns=notes.filter(n=>Math.floor(n.beat/4)===bar);return ns.reduce((s,n)=>s+n.velocity,0)/ns.length;});
  assert.ok(Math.max(...means)-Math.min(...means)>.09,pattern);
 }
});
test('ballad is broken, pedal voices end at the chord boundary, and jpop is distinct',()=>{
 const bars=parseChart('| C | F |');const ballad=performance(bars,'ballad',{human:0,balladEntry:'delayed'});
 assert.equal(ballad.find(n=>n.part==='upper').beat,.5);assert.ok(new Set(ballad.filter(n=>n.part==='upper'&&n.beat<4).map(n=>n.beat)).size>=4);
 for(const pattern of ['ballad','soul','chill','gospel','ambient']){const notes=performance(bars,pattern,{human:0});assert.ok(notes.filter(n=>n.part==='upper').every(n=>n.beat+n.duration<=Math.floor(n.beat/4)*4+4+1e-8));assert.ok(notes.some(n=>n.part==='upper'&&n.duration>=1.5));}
 assert.notDeepEqual(performance(bars,'jpop',{human:0}),performance(bars,'alberti',{human:0}));
});
test('rootless minor ninth stays compact; walking approaches alternate and ARP can have a foundation',()=>{
 const upper=voicePlan(parseChart('| Dm9 |'),{voicing:'rootless'})[0].notes.slice(1);assert.ok(upper.at(-1)-upper[0]<=12);assert.ok(upper.slice(1).every((n,i)=>n-upper[i]<11));
 const bars=parseChart('| C | F | G | C |'),plan=voicePlan(bars),bass=performance(bars,'jazz',{human:0,bassMode:'four'}).filter(n=>n.part==='bass');
 assert.equal(mod(bass.find(n=>n.beat===1).note),2);assert.equal(mod(bass.find(n=>n.beat===3).note-plan[1].notes[0]),11);assert.equal(mod(bass.find(n=>n.beat===7).note-plan[2].notes[0]),1);
 const plain=performance(bars,'arp',{human:0}),withBass=performance(bars,'arp',{human:0,arpFoundation:'bass'}),pad=performance(bars,'arp',{human:0,arpFoundation:'pad'});
 assert.equal(withBass.length,plain.length+4);assert.equal(withBass.filter(n=>n.part==='bass').length,4);assert.ok(pad.some(n=>n.articulation==='held'&&n.part==='upper'));
});
test('harmony matrix: every style/key/mode/density/variation remains parseable and four beats',()=>{
 const input=parseChart('| C | Am | F | G |');let count=0;
 for(const style of Object.keys(styles))for(let key=0;key<12;key++)for(const mode of ['major','minor'])for(const density of [1,2,3])for(const seed of [0,1,2]){
  const out=mutate(input,{style,key,mode,density,seed});count++;for(const b of out){assert.equal(b.chords.reduce((s,c)=>s+c.beats,0),4);for(const c of b.chords)assert.ok(parse(c.symbol),style+' '+key+' '+c.symbol);}
 }
 assert.ok(count>10000);
});
