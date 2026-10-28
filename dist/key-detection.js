import {parse,mod} from './music.js?v=piano-audit-1';
import {normalizeKey} from './degree-chart.js';

const major={0:'M',2:'m',4:'m',5:'M',7:'M',9:'m',11:'d'};
const minor={0:'m',2:'d',3:'M',5:'m',7:'m',8:'M',10:'M'};
const quality=c=>c.intervals.includes(3)&&c.intervals.includes(6)?'d':c.minor?'m':c.intervals.includes(4)?'M':'open';
const dominant=c=>c.intervals.includes(4)&&c.intervals.includes(10);
// The detector is evidence, never a generation-time transposition instruction.
// Modal identity belongs to the chosen style; this detector only ranks 24 keys.
export function detectKey(bars){
 const cs=bars.flatMap(b=>(b.chords||[]).map(c=>({...parse(c.symbol),beats:c.beats}))).filter(c=>c.root!==undefined);
 if(!cs.length)return {primary:null,candidates:[],ambiguous:true};
 const ranked=[];
 for(let root=0;root<12;root++)for(const mode of ['major','minor']){
  const expected=mode==='major'?major:minor;let score=0;
  cs.forEach((c,i)=>{
   const d=mod(c.root-root),q=quality(c),w=c.beats/4,next=cs[i+1],prev=cs[i-1];
   const borrowed=mode==='major'&&((d===5&&q==='m')||([3,8,10].includes(d)&&q==='M'));
   const harmonic=mode==='minor'&&((d===7&&q==='M')||(d===11&&q==='d'));
   if(q==='open')score+=(expected[d]?1.2:borrowed?0.5:-0.8)*w;
   else if(expected[d]===q||harmonic)score+=3*w;
   else if(borrowed)score+=1.2*w;
   else score-=(expected[d]?1.2:2)*w;
   if(dominant(c))score+=(d===7?1.5:next&&mod(c.root+5)===next.root?1:-.75)*w;
   // A real V–I, including a harmonic-minor V, outweighs starting on IV/vi.
   if(next&&d===7&&q==='M'&&mod(next.root-root)===0&&quality(next)===expected[0])score+=3;
   if(next&&q==='d'&&d===11&&mod(next.root-root)===0)score+=2;
   // IV–iv–I is a borrowed plagal cadence, not a change to the IV key.
   if(mode==='major'&&d===5&&q==='m'&&next&&mod(next.root-root)===0&&quality(next)==='M')score+=4;
   if(mode==='major'&&d===5&&q==='m'&&prev&&prev.root===c.root&&quality(prev)==='M')score+=1;
  });
  const first=cs[0],last=cs.at(-1);
  if(first.root===root&&quality(first)===expected[0])score+=1.3;
  if(last.root===root&&quality(last)===expected[0])score+=2;
  if(mod(last.root-root)===7&&quality(last)==='M')score+=.8;
  ranked.push({...normalizeKey({root,mode}),score:Math.round(score*1000)/1000});
 }
 ranked.sort((a,b)=>b.score-a.score||a.root-b.root||a.mode.localeCompare(b.mode));
 const best=ranked[0],margin=Math.max(1.6,Math.abs(best.score)*.15);
 const candidates=ranked.filter(k=>best.score-k.score<=margin).slice(0,3);
 return {primary:best,candidates,ambiguous:candidates.length>1,ranked};
}
