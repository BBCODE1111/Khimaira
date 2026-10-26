import {voicingCandidates} from './voicing.js?v=14';
export const names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
export const mod=n=>((n%12)+12)%12;
const pc=s=>mod(({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[s[0]]+[...s.slice(1)].reduce((n,a)=>n+(a==='#'?1:a==='b'?-1:0),0));
const qualities={'maj7#11':[0,4,7,11,18],'maj9#11':[0,4,7,11,14,18],'6/9':[0,4,7,9,14],'69':[0,4,7,9,14],'mMaj7':[0,3,7,11],'mMaj9':[0,3,7,11,14],'7alt':[0,4,10,13,15,20],'7#11':[0,4,7,10,18],'13b9':[0,4,7,10,13,21],'7b13':[0,4,7,10,20],'':[0,4,7],m:[0,3,7],maj7:[0,4,7,11],m7:[0,3,7,10],'7':[0,4,7,10],'9':[0,4,7,10,14],maj9:[0,4,7,11,14],m9:[0,3,7,10,14],'6':[0,4,7,9],m6:[0,3,7,9],sus2:[0,2,7],sus4:[0,5,7],'7sus4':[0,5,7,10],dim:[0,3,6],dim7:[0,3,6,9],m7b5:[0,3,6,10],aug:[0,4,8],'7b5':[0,4,6,10],'7b9':[0,4,7,10,13],'7#9':[0,4,7,10,15],'13':[0,4,7,10,14,21],m11:[0,3,7,10,14,17],add9:[0,4,7,14],'5':[0,7]};
Object.assign(qualities,{'11':[0,4,7,10,14,17],maj11:[0,4,7,11,14,17],maj13:[0,4,7,11,14,21],m13:[0,3,7,10,14,17,21],madd9:[0,3,7,14],'9sus4':[0,5,7,10,14]});
function intervalsFor(q){if(qualities[q])return qualities[q];const m=q.match(/^([^()]+|)\(([^()]+)\)$/);if(!m||!qualities[m[1]])return null;let ints=[...qualities[m[1]]];const map={'b9':13,'9':14,'#9':15,'11':17,'#11':18,'b13':20,'13':21,'b5':6,'#5':8,'no5':-7};for(const token of m[2].split(',')){if(!(token in map))return null;const n=map[token];if(['b9','9','#9'].includes(token))ints=ints.filter(x=>![13,14,15].includes(x));if(['11','#11'].includes(token))ints=ints.filter(x=>![17,18].includes(x));if(['b13','13'].includes(token))ints=ints.filter(x=>![20,21].includes(x));if(['b5','#5','no5'].includes(token))ints=ints.filter(x=>![6,7,8].includes(x));if(n>=0)ints.push(n);}return [...new Set(ints)].sort((a,b)=>a-b);}
export function parse(symbol){const m=String(symbol).trim().replaceAll('♭','b').replaceAll('♯','#').replace('6/9','69').match(/^([A-Ga-g][#b]{0,2})([^/]*)(?:\/([A-Ga-g][#b]{0,2}))?$/);if(!m)return null;let q=m[2].replace(/^M$/,'').replace(/^M(?=7|9)/,'maj').replace(/^min/,'m').replace(/^Δ/,'maj').replace(/^ø7?$/,'m7b5').replace(/^°7$/,'dim7').replace(/^°$/,'dim').replace(/^\+$/,'aug').replace(/^sus$/,'sus4').replace(/^-/,'m').replace(/^m\(maj7\)$/,'mMaj7').replace(/^(2|add2)$/,'add9').replace(/^maj$/,'');const intervals=intervalsFor(q);if(!intervals)return null;const root=pc(m[1].toUpperCase()[0]+m[1].slice(1));return {symbol,root,rootName:m[1][0].toUpperCase()+m[1].slice(1),q,intervals,pcs:[...new Set(intervals.map(n=>mod(root+n)))],bass:m[3]?pc(m[3].toUpperCase()[0]+m[3].slice(1)):root,bassName:m[3]?m[3][0].toUpperCase()+m[3].slice(1):null,minor:intervals.includes(3)&&!intervals.includes(4)};}
const recipes={Jazz:[[0,'maj7'],[9,'7'],[2,'m7'],[7,'7'],[4,'m7'],[9,'7'],[2,'m9'],[7,'13']],Gospel:[[0,'maj9'],[4,'m7'],[5,'maj7'],[5,'m6'],[0,'maj7'],[9,'7'],[2,'m7'],[7,'7sus4']],Fusion:[[0,'maj9'],[3,'maj7'],[5,'maj9'],[8,'maj7'],[2,'m9'],[1,'7'],[0,'maj9'],[7,'7#9']],'Bossa nova':[[0,'maj7'],[9,'7b9'],[2,'m9'],[7,'13'],[4,'m7'],[3,'dim7'],[2,'m7'],[7,'7']],Rock:[[0,''],[7,''],[9,'m'],[5,''],[0,''],[10,''],[5,''],[7,'']],'Japanese rock':[[5,'maj7'],[7,''],[4,'m7'],[9,'m7'],[5,''],[7,''],[0,''],[4,'7']],House:[[9,'m7'],[5,'maj7'],[0,'maj7'],[7,''],[9,'m9'],[5,'maj9'],[2,'m7'],[7,'7']],Classical:[[0,''],[5,''],[2,'m'],[7,'7'],[0,''],[9,'m'],[2,'m'],[7,'7']],'Phrygian dominant':[[0,''],[1,''],[0,''],[10,'m'],[0,''],[5,'m'],[1,''],[0,'']],'Dorian folk':[[0,'m'],[5,''],[0,'m'],[10,''],[0,'m7'],[5,''],[7,'m'],[0,'m']]};
export function approach(target){const c=parse(target);return c?[spellInterval(c.rootName,2,1)+(c.minor?'m7b5':'m7'),spellInterval(c.rootName,7,4)+(c.minor?'7b9':'7')]:[];}
export function generate(bars,{key=0,mode='major',style='Jazz',random=Math.random}={}){const base=recipes[style]||recipes.Jazz;const shift=random()<.5?0:4;const out=bars.map((b,i)=>{if(b.locked&&parse(b.symbol))return {...b};let [d,q]=base[(i+shift)%base.length];if(mode==='minor'&&!['Phrygian dominant','Dorian folk'].includes(style)){const map={0:0,2:2,4:3,5:5,7:7,9:8,10:10};d=map[d]??d;if(d===0)q=q.includes('7')||q.includes('9')?'m7':'m';if(d===2)q='m7b5';if(d===5)q='m7';if(d===7)q='7';if(d===3||d===8)q='maj7';}return {symbol:spellPitch(key+d,key,mode)+q,locked:false,reason:'風格句型'};});
// Fixed targets are approached in their own local key, without overwriting anchors.
for(let i=0;i<out.length;i++){if(!out[i].locked)continue;const a=approach(out[i].symbol);if(i>=1&&!out[i-1].locked)out[i-1]={symbol:a[1],locked:false,reason:'V → '+out[i].symbol};if(i>=2&&!out[i-2].locked)out[i-2]={symbol:a[0],locked:false,reason:'ii → V → '+out[i].symbol};}return out;}
export function pianoVoicing(symbol,previous=[]){
 const candidates=voicingCandidates(symbol,'close');
 return candidates.sort((a,b)=>cost(a)-cost(b))[0]||[];
 function cost(v){return v.slice(1).reduce((s,n,i)=>s+Math.abs(n-(previous[i+1]??(57+i*4))),0);}
}
export {performance as events} from './performance.js?v=14';
const tuning=[40,45,50,55,59,64];
export function guitarShapes(symbol){const c=parse(symbol);if(!c)return [];let all=[];for(let start=0;start<=12;start++){const opts=tuning.map(t=>[-1,...Array.from({length:5},(_,i)=>start+i).filter(f=>f<=15&&c.pcs.includes(mod(t+f)))]);const walk=(arr,s)=>{if(s===6){const notes=arr.flatMap((f,i)=>f<0?[]:[tuning[i]+f]);if(notes.length<3||mod(notes[0])!==c.bass)return;const set=new Set(notes.map(mod));const required=c.intervals.length>4?c.intervals.filter(n=>n!==7&&n!==0&&!(n===17&&c.intervals.includes(21))):c.intervals;if(required.some(n=>!set.has(mod(c.root+n))))return;const fretted=arr.filter(f=>f>0);if(fretted.length>4&&new Set(fretted).size>3)return;const span=Math.max(...fretted)-Math.min(...fretted);if(span>3)return;all.push({frets:arr,omitted:chordTones(symbol).filter((_,i)=>!set.has(mod(c.root+c.intervals[i]))),score:span*3+arr.filter(f=>f<0).length+start*.15});return;}for(const f of opts[s])walk([...arr,f],s+1);};walk([],0);}const seen=new Set;return all.sort((a,b)=>a.score-b.score).filter(x=>{const k=x.frets.join();if(seen.has(k))return false;seen.add(k);return true;}).filter((x,i,a)=>i===0||Math.abs(Math.max(...x.frets)-Math.max(...a[0].frets))>=3).slice(0,3);}
export {scaleOptions as scales} from './scale-library.js?v=14';
export function midiBytes(notes,totalBeats,{split=false}={}){
 if(split){
  const chunks=['bass','upper'].map(part=>{
   const data=midiBytes(notes.filter(n=>(n.part||'upper')===part),totalBeats).slice(22);
   const name=new TextEncoder().encode(part==='bass'?'Bass':'Chords');
   const track=[0,255,3,name.length,...name,...data],length=track.length;
   return [77,84,114,107,(length>>>24)&255,(length>>>16)&255,(length>>>8)&255,length&255,...track];
  });
  return new Uint8Array([77,84,104,100,0,0,0,6,0,1,0,2,1,224,...chunks.flat()]);
 }
const ppq=480,ev=[],quantized=[],lastNote=new Map();
// Quantize before pairing events: sub-tick notes must not turn into off-before-on pairs.
for(const n of [...notes].sort((a,b)=>a.beat-b.beat||a.note-b.note)){const start=Math.round(n.beat*ppq),end=Math.max(start+1,Math.round((n.beat+n.duration)*ppq)),velocity=Math.max(1,Math.min(127,Math.round(n.velocity*127))),previous=lastNote.get(n.note);
if(previous&&previous.start===start){previous.end=Math.max(previous.end,end);previous.velocity=Math.max(previous.velocity,velocity);continue;}
if(previous&&previous.end>start)previous.end=start;
const q={note:n.note,start,end,velocity};lastNote.set(n.note,q);quantized.push(q);}
quantized.forEach(n=>{ev.push({tick:n.start,data:[0x90,n.note,n.velocity]});ev.push({tick:n.end,data:[0x80,n.note,0]});});ev.sort((a,b)=>a.tick-b.tick||a.data[0]-b.data[0]);const vlq=n=>{let a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a;};let track=[0,0xc0,0],last=0;for(const e of ev){track.push(...vlq(e.tick-last),...e.data);last=e.tick;}track.push(...vlq(Math.max(last,totalBeats*ppq)-last),255,47,0);const n=track.length;return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255,...track]);}

export function chordTones(symbol){const c=parse(symbol);if(!c)return [];const letters=['C','D','E','F','G','A','B'],naturals=[0,2,4,5,7,9,11],base=letters.indexOf(c.rootName[0]);const degrees={0:0,1:1,2:1,3:2,4:2,5:3,6:4,7:4,8:4,9:5,10:6,11:6,13:1,14:1,15:1,17:3,18:3,20:5,21:5};return c.intervals.map(interval=>{let degree=degrees[interval]??0;if(c.q==='dim7'&&interval===9)degree=6;const letter=(base+degree)%7;let delta=mod(c.root+interval)-naturals[letter];while(delta>6)delta-=12;while(delta< -6)delta+=12;return letters[letter]+(delta>0?'#'.repeat(delta):'b'.repeat(-delta));});}

// Diatonic letters are retained for scale tones and local ii–V targets.
const letters=['C','D','E','F','G','A','B'],naturals=[0,2,4,5,7,9,11];
export function spellInterval(root,semitones,steps){
 const letter=(letters.indexOf(root[0])+steps+70)%7;
 let delta=mod(pc(root)+semitones-naturals[letter]);if(delta>6)delta-=12;
 return letters[letter]+(delta>0?'#'.repeat(delta):'b'.repeat(-delta));
}
export function keyName(key,mode='major'){
 return (mode==='minor'?['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B']:['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'])[mod(key)];
}
export function spellPitch(pitch,key=0,mode='major'){
 const tonic=keyName(key,mode),scale=mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11],degree=scale.indexOf(mod(pitch-key));
 if(degree>=0)return spellInterval(tonic,scale[degree],degree);
 const sharp=(mode==='minor'?[1,4,6,8,11]:[2,4,6,7,9,11]).includes(mod(key));
 return (sharp?['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']:names)[mod(pitch)];
}
export function spellChord(symbol,key=0,mode='major'){
 const c=parse(symbol);if(!c)return symbol;
 return spellPitch(c.root,key,mode)+c.q+(c.bass!==c.root?'/'+spellPitch(c.bass,key,mode):'');
}
export function transposeSymbol(symbol,semitones,key=0,mode='major'){
 const c=parse(symbol);if(!c)return symbol;
 return spellPitch(c.root+semitones,key,mode)+c.q+(c.bass!==c.root?'/'+spellPitch(c.bass+semitones,key,mode):'');
}
export function romanNumeral(symbol,key=0,mode='major'){
 const c=parse(symbol);if(!c)return '';
 const d=mod(c.root-key),scale=mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const degree=(letters.indexOf(c.rootName[0])-letters.indexOf(keyName(key,mode)[0])+7)%7;
 let alteration=mod(d-scale[degree]);if(alteration>6)alteration-=12;
 const prefix=alteration>0?'♯'.repeat(alteration):'♭'.repeat(-alteration);
 let numeral=['I','II','III','IV','V','VI','VII'][degree];if(c.minor)numeral=numeral.toLowerCase();
 const diminished=c.intervals.includes(3)&&c.intervals.includes(6);
 const quality=diminished?(c.intervals.includes(10)?'ø':'°'):c.q==='aug'?'+':'';
 return prefix+numeral+quality;
}
