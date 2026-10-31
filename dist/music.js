import {pedalIntervals,pedalMidiEvents} from './piano-pedal.js?v=2.0.0';
import {voicingCandidates} from './voicing.js?v=1.0.3';
// Product adapter: generation, voicing and MIDI remain owned by this app.
import {names,mod,createTheory} from './music-core.js?v=1.1.3';
const {parse,chordTones,spellInterval,keyName,spellPitch,spellChord,transposeSymbol,romanNumeral,analyzeHarmony,tritoneRoot}=createTheory('khimaira-v1');
export {names,mod,parse,chordTones,spellInterval,keyName,spellPitch,spellChord,transposeSymbol,romanNumeral,analyzeHarmony,tritoneRoot};
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
export {performance as events} from './performance.js?v=1.0.3';
const tuning=[40,45,50,55,59,64];
export function guitarShapes(symbol){const c=parse(symbol);if(!c)return [];let all=[];for(let start=0;start<=12;start++){const opts=tuning.map(t=>[-1,...Array.from({length:5},(_,i)=>start+i).filter(f=>f<=15&&c.pcs.includes(mod(t+f)))]);const walk=(arr,s)=>{if(s===6){const notes=arr.flatMap((f,i)=>f<0?[]:[tuning[i]+f]);if(notes.length<3||mod(notes[0])!==c.bass)return;const set=new Set(notes.map(mod));const required=c.intervals.length>4?c.intervals.filter(n=>n!==7&&n!==0&&!(n===17&&c.intervals.includes(21))):c.intervals;if(required.some(n=>!set.has(mod(c.root+n))))return;const fretted=arr.filter(f=>f>0);if(fretted.length>4&&new Set(fretted).size>3)return;const span=Math.max(...fretted)-Math.min(...fretted);if(span>3)return;all.push({frets:arr,omitted:chordTones(symbol).filter((_,i)=>!set.has(mod(c.root+c.intervals[i]))),score:span*3+arr.filter(f=>f<0).length+start*.15});return;}for(const f of opts[s])walk([...arr,f],s+1);};walk([],0);}const seen=new Set;return all.sort((a,b)=>a.score-b.score).filter(x=>{const k=x.frets.join();if(seen.has(k))return false;seen.add(k);return true;}).filter((x,i,a)=>i===0||Math.abs(Math.max(...x.frets)-Math.max(...a[0].frets))>=3).slice(0,3);}
export {scaleOptions as scales} from './scale-library.js?v=1.0.3';
export function midiBytes(notes,totalBeats,{split=false,pedal=false,chordSpans=[],melody=[],channel=0,bpm}={}){
 if(split){
  const chunks=['bass','upper'].map(part=>{
   const data=midiBytes(notes.filter(n=>(n.part||'upper')===part),totalBeats,{pedal:pedal&&part==='upper',chordSpans,melody,bpm:part==='bass'?bpm:undefined,channel:part==='bass'?2:1}).slice(22);
   const name=new TextEncoder().encode(part==='bass'?'Bass':'Chords');
   const track=[0,255,3,name.length,...name,...data],length=track.length;
   return [77,84,114,107,(length>>>24)&255,(length>>>16)&255,(length>>>8)&255,length&255,...track];
  });
  return new Uint8Array([77,84,104,100,0,0,0,6,0,1,0,2,1,224,...chunks.flat()]);
 }
const ppq=480,ev=[],quantized=[],lastNote=new Map();
if(pedal)ev.push(...pedalMidiEvents(pedalIntervals({chordSpans,melody,totalBeats,notes:notes.map(n=>({start:n.beat,end:n.beat+n.duration}))}),ppq,channel).map(e=>({tick:e.tick,data:e.bytes})));

// Quantize before pairing events: sub-tick notes must not turn into off-before-on pairs.
for(const n of [...notes].sort((a,b)=>a.beat-b.beat||a.note-b.note)){const start=Math.round(n.beat*ppq),end=Math.max(start+1,Math.round((n.beat+n.duration)*ppq)),velocity=Math.max(1,Math.min(127,Math.round(n.velocity*127))),previous=lastNote.get(n.note);
if(previous&&previous.start===start){previous.end=Math.max(previous.end,end);previous.velocity=Math.max(previous.velocity,velocity);continue;}
if(previous&&previous.end>start)previous.end=start;
const q={note:n.note,start,end,velocity};lastNote.set(n.note,q);quantized.push(q);}
quantized.forEach(n=>{ev.push({tick:n.start,data:[0x90+channel,n.note,n.velocity]});ev.push({tick:n.end,data:[0x80+channel,n.note,0]});});ev.sort((a,b)=>a.tick-b.tick||a.data[0]-b.data[0]);const vlq=n=>{let a=[n&127];while((n>>=7))a.unshift((n&127)|128);return a;};let track=[0,0xc0+channel,0],last=0;if(bpm!==undefined){if(!Number.isFinite(bpm)||bpm<30||bpm>260)throw Error('Invalid MIDI tempo');const micros=Math.round(60000000/bpm);track.unshift(0,255,81,3,(micros>>>16)&255,(micros>>>8)&255,micros&255);}for(const e of ev){track.push(...vlq(e.tick-last),...e.data);last=e.tick;}track.push(...vlq(Math.max(last,totalBeats*ppq)-last),255,47,0);const n=track.length;return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255,...track]);}
