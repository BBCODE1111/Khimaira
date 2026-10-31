import {analyzeHarmony,mod,parse} from './music.js?v=1.0.7';
import {normalizeKey} from './degree-chart.js?v=1.0.7';

// Krumhansl–Kessler pitch-class profiles (Krumhansl 1990). Published numeric
// research data; Pearson correlation implemented here, no third-party code.
const profiles={major:[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],minor:[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17]};
function correlation(events,key){
 const histogram=Array(12).fill(0);for(const c of events)for(const pitch of c.pcs)histogram[mod(pitch-key.root)]+=c.beats;
 const profile=profiles[key.mode],mean=x=>x.reduce((a,b)=>a+b,0)/12,a=mean(histogram),b=mean(profile);
 let covariance=0,va=0,vb=0;for(let i=0;i<12;i++){const x=histogram[i]-a,y=profile[i]-b;covariance+=x*y;va+=x*x;vb+=y*y;}
 return va&&vb?covariance/Math.sqrt(va*vb):0;
}
// Explicit sections are independent, non-looping phrases. The aggregate never
// invents a single key across A/B modulations or transposes either section.
export function detectKey(bars,{loop=true,sections}={}){
 if(sections){
  let end=0;const results=sections.map(({start,end:to,label})=>{
   if(!Number.isInteger(start)||!Number.isInteger(to)||start<end||start<0||to<=start||to>bars.length)throw Error('Invalid key-analysis section');end=to;
   return {start,end:to,label,...detectKey(bars.slice(start,to),{loop:false})};
  });return {primary:null,candidates:[],ambiguous:true,sections:results};
 }
 if(!bars.some(b=>b.chords?.length))return {primary:null,candidates:[],ambiguous:true};
 const ranked=[];
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const tonic=bars.flatMap(b=>b.chords||[]).map(c=>({...parse(c.symbol),beats:c.beats})).filter(c=>c.root===root).sort((a,b)=>b.beats-a.beats)[0]?.rootName;
  const key=normalizeKey({root,mode,...(tonic?{tonic}:{})}),analysis=analyzeHarmony(bars,key,{loop});let evidence=0;
  for(const c of analysis.events){
   const w=c.beats/analysis.totalBeats;
   evidence+=({diatonic:3,dominant:3,secondary:3,tritone:3,'applied-predominant':3,borrowed:1.5,unexplained:-2}[c.role])*w;
   if(c.offset===0&&c.role==='diatonic')evidence+=.7*w;
   if(c.impliedTonic)evidence+=(['ii-V','IV-V','dominant-chain'].includes(c.impliedTonic.strength)?4:.5)*w;
   if(c.cadence)evidence+=({ 'ii-V-I':7,'V-I':4,'subV-I':4,'IV-I':2,'iv-I':4,'bVII-I':2,'v-i':1 }[c.cadence])*(1+(c.phraseEnd?.15:0))*w;
  }
  const first=analysis.events[0],last=analysis.events.at(-1);
  if(first.offset===0&&first.role==='diatonic')evidence+=.15;
  if(last.offset===0&&last.role==='diatonic')evidence+=.3;
  const functionalScore=evidence/6,pitchScore=correlation(analysis.events,key);
  const score=.8*functionalScore+.2*pitchScore;
  ranked.push({...key,score,functionalScore,pitchScore,unexplainedRatio:analysis.unexplainedBeats/analysis.totalBeats,analysis});
 }
 ranked.sort((a,b)=>b.score-a.score||a.root-b.root||a.mode.localeCompare(b.mode));
 // Reconsider a close, better-explained candidate rather than returning a key
 // whose own functional analysis rejects most of the progression.
 if(ranked[0].unexplainedRatio>.35){const i=ranked.findIndex(k=>k.unexplainedRatio<=.2&&ranked[0].score-k.score<.12);if(i>0)ranked.unshift(...ranked.splice(i,1));}
 // I7–VI7–ii–V can be a major turnaround even without a plain I.
 // Retain this structural reading as a candidate; do not mistake VI7 for a new tonic.
 const chart=bars.flatMap(b=>b.chords||[]).map(c=>parse(c.symbol));
 let turnaround=null;
 if(loop&&chart.length===4){for(let i=0;i<4;i++){
  const [a,b,c,d]=Array.from({length:4},(_,j)=>chart[(i+j)%4]);
  if(a.intervals.includes(4)&&a.intervals.includes(10)&&b.intervals.includes(4)&&b.intervals.includes(10)&&c.minor&&d.intervals.includes(4)&&[9,2,7].every((n,j)=>mod([b,c,d][j].root-a.root)===n))turnaround=ranked.find(k=>k.root===a.root&&k.mode==='major');
 }}
 const best=ranked[0],relative=k=>k.mode!==best.mode&&k.root===mod(best.root+(best.mode==='major'?9:3));
 const candidates=ranked.filter(k=>best.score-k.score<=(relative(k)?.12:.085)).sort((a,b)=>a===best?-1:b===best?1:Number(relative(b))-Number(relative(a))||b.score-a.score).slice(0,3);
 // IV–V has an implied tonic, not an observed arrival; retain the bVII–I reading.
 if(best.analysis.events.some(c=>c.impliedTonic?.strength==='IV-V')){
  const alternative=ranked.find(k=>k.root===mod(best.root+7)&&k.mode==='major');
  if(alternative&&!candidates.includes(alternative)){if(candidates.length>=3)candidates.pop();candidates.push(alternative);}
 }
 // A two-chord major-seventh semitone vamp also permits an I–bII reading.
 // Do not invent a dominant relation for the bII major seventh.
 const events=best.analysis.events;
 if(events.length===2){
  const chords=events.map(c=>parse(c.symbol));
  if(chords.every(c=>c?.intervals.includes(4)&&c.intervals.includes(11))){
   const tonic=chords.find((c,i)=>mod(chords[1-i].root-c.root)===1);
   const alternative=tonic&&ranked.find(k=>k.root===tonic.root&&k.mode==='major');
   if(alternative&&!candidates.includes(alternative)){if(candidates.length>=3)candidates.pop();candidates.push(alternative);}
  }
 }
 if(turnaround&&!candidates.includes(turnaround)){if(candidates.length>=3)candidates.pop();candidates.push(turnaround);}
 return {primary:best,candidates,ambiguous:candidates.length>1,ranked,analysis:best.analysis};
}
