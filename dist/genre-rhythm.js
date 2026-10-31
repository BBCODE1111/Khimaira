import {createTheory,mod} from './music-core.js?v=1.1.5';
const {parse}=createTheory('khimaira-v1');
import {gridRandom,gridTarget,sameHarmony} from './performance-grid.js?v=1.0.6';

// Quarter-note coordinates (the source tables number sixteenths from 1).
// Version 1 is the old template on the repaired bar grid. Version 2 is opt-in
// on a new session or explicit performance/style selection; never on recall.
export const GENRE_REVISION=2;
const slots=(positions,duration=.25,velocity=.7)=>positions.map(p=>({at:(p-1)/4,duration,velocity}));
const profile=(label,upper,bass,extra={})=>({label,upper,bass,unit:16,swing:.5,range:[60,84],voices:4,humanMs:0,rollMs:0,pocketMs:0,electronic:true,wide:false,anticipation:false,...extra});
export const genreProfiles={
 house:profile('Deep house · Offbeat stabs',slots([3,11],.25,.75),slots([3,7,11,15],.35,.65),{range:[60,72],swing:.59,anticipation:true,variants:[{upper:slots([3,7,11,15],.3,.7),bass:slots([3,7,11,15,16],.3,.62)},{upper:[...slots([3],.3,.72),...slots([10],.75,.68)],bass:slots([3,7,11,15],.35,.65)}]}),
 classicHouse:profile('Piano house · Bright syncopation',slots([1,4,7,11,14],.35,.85),slots([3,7,11,15],.38,.7),{swing:.56,wide:true,anticipation:true,variants:[{upper:slots([1,4,7,11,14,16],.3,.8)},{upper:slots([1,4,7,10,14],.4,.82)}]}),
 techHouse:profile('Tech house · Rolling bass',slots([3],.2,.65),slots([3,4,7,8,11,12,15,16],.2,.68),{swing:.54,voices:3,range:[60,76],anticipation:true,variants:[{upper:slots([11],.25,.7)},{upper:slots([3,15],.2,.64),bass:slots([3,4,7,8,11,12,16],.2,.68)}]}),
 disco:profile('Nu-disco · Octave & offbeat',slots([3,7,11,15],.4,.73),slots([1,3,5,7,9,11,13,15],.38,.67),{range:[60,76],swing:.52,bassOctaves:true,variants:[{upper:slots([3,7,10,11,15],.3,.7)},{upper:slots([3,7,11],.4,.73),bass:slots([1,3,5,7,9,11,13,16],.32,.67)}]}),
 futureBass:profile('Future bass · Wide chord slices',slots([1,4,7,9,11,13,15],.5,.8),slots([1,4,7,9,11,13,15],.5,.66),{range:[48,84],voices:6,wide:true,pocketMs:8,pocketBoth:true,slices:true,variants:[{upper:slots([1,4,7,9,12,15],.5,.78),bass:slots([1,4,7,9,12,15],.5,.65)},{upper:[0,2/3,4/3,2,8/3,10/3].map(at=>({at,duration:2/3,velocity:.75})),bass:slots([1,9,15],.5,.67)}]}),
 progressiveDrop:profile('Progressive drop · Offbeat pluck',slots([3,7,11,15],.3,.85),slots([3,7,11,15],.4,.72),{voices:5,wide:true,anticipation:true,variants:[{upper:slots([3,7,11,14,15],.25,.8)},{upper:slots([1,5,9,13],.7,.75),bass:slots([3,7,11,15],.4,.72)}]}),
 tropicalHouse:profile('Tropical house · 3–3–2 pluck',slots([1,4,7],.32,.62),slots([1,4,7],.42,.6),{range:[60,76],voices:3,anticipation:true,variants:[{upper:slots([1,4,7,11,13],.32,.6),bass:slots([1,7,11],.42,.58)},{upper:slots([1,4,7,11,15],.3,.62),bass:slots([1,4,7,15],.4,.6)}]}),
 garage:profile('UK garage · 2-step organ',slots([1,4,7,11,14],.25,.72),slots([1,7,11,16],.35,.67),{swing:.63,range:[60,79],anticipation:true,variants:[{upper:slots([1,4,7,12,14],.3,.68),bass:slots([1,6,11,16],.32,.65)},{upper:slots([1,7,11,14,16],.23,.7),bass:slots([1,7,10,16],.35,.67)}]}),
 amapiano:profile('Amapiano · Piano & log-drum replies',slots([1,11],1.4,.6),slots([4,7,11,15],.32,.67),{range:[60,76],voices:5,swing:.54,bassOctaves:true,variants:[{upper:slots([1,11,15],.8,.57),bass:slots([4,7,10,11,15,16],.25,.64)},{upper:slots([1,10],1.5,.58),bass:slots([4,7,11,14,16],.32,.67)}]}),
 afrobeats:profile('Afrobeats · Interlocking 3–3–2',slots([4,7,11,15],.35,.67),slots([1,7,11],.6,.64),{swing:.56,range:[55,79],humanMs:12,electronic:false,anticipation:true,variants:[{upper:slots([4,7,11,14,16],.28,.64)},{upper:slots([4,7,11],.38,.68),bass:slots([1,7,11,16],.4,.62)}]}),
 funk:profile('Funk · Bass & chord conversation',slots([1,4,7,11,14],.25,.78),slots([1,4,7,8,11,14,16],.22,.7),{swing:.54,range:[60,79],voices:3,humanMs:20,electronic:false,anticipation:true,bassOctaves:true,variants:[{upper:slots([1,4,7,10,14,16],.18,.68),bass:slots([1,4,8,11,14,16],.24,.74)},{upper:slots([1,7,11,14],.25,.78),bass:slots([1,3,4,7,8,11,14,16],.2,.69)}]}),
 soul:profile('Soul · Shuffle backbeat',slots([5,13],.5,.72),slots([1,7,9,15],.65,.64),{unit:8,swing:.63,range:[55,76],humanMs:20,electronic:false,variants:[{upper:slots([5,12,13],.5,.7),bass:slots([1,7,9,15,16],.5,.62)},{upper:slots([5,13,15],.5,.68),bass:slots([1,8,9,15],.6,.64)}]}),
 rnb:profile('R&B · Sparse sixteenth pocket',[...slots([1],1.8,.65),...slots([11,14],.4,.58)],slots([1,8,11],.8,.6),{swing:.58,range:[55,79],voices:5,humanMs:15,electronic:false,variants:[{upper:[...slots([1],1.4,.65),...slots([10,14,16],.3,.55)]},{upper:[...slots([1],1.8,.62),...slots([11,15],.45,.6)],bass:slots([1,8,12],.7,.59)}]}),
 neosoul:profile('Neo-soul · Rolled late answers',[...slots([1],1.1,.63),...slots([7,12],.6,.58)],slots([1,7,10],.7,.6),{swing:.62,range:[55,84],voices:5,humanMs:15,electronic:false,pocketMs:30,rollMs:10,variants:[{upper:slots([1,7,12,15],.65,.58),bass:slots([1,7,10,16],.5,.6)},{upper:[...slots([1],1.3,.62),...slots([8,12],.6,.57)]}]}),
 lofi:profile('Lo-fi · Late eighth shuffle',[...slots([1],1.6,.52),...slots([9],1.3,.48)],slots([1,10],.8,.54),{unit:8,swing:.64,range:[55,76],voices:4,humanMs:10,electronic:false,pocketMs:22,variants:[{upper:slots([1,10],1.3,.48),bass:slots([1,10,15],.6,.51)},{upper:slots([1,9,15],.9,.5),bass:slots([1,10],1,.52)}]}),
 gospel:profile('Gospel · Rolled pulse & answers',slots([1,5,9,13],.9,.73),slots([1,5,9,13],.85,.68),{unit:8,swing:.6,range:[55,84],voices:5,humanMs:18,electronic:false,rollMs:20,bassOctaves:true,variants:[{upper:slots([1,5,9,12,15],.6,.7),bass:slots([1,5,9,13,15],.6,.65)},{upper:[0,1,2,3,3+1/3,3+2/3].map(at=>({at,duration:.3,velocity:.68}))}]}),
 ballad:profile('Ballad · On-grid broken chords',slots([1,3,5,7,9,11,13,15],.8,.62),slots([1],4,.62),{range:[55,79],voices:4,humanMs:0,electronic:false,broken:true,variants:[{upper:slots([1,3,5,7,9,11,14,15],.75,.6)},{upper:slots([1,3,5,7,9,11,13],.85,.58)}]}),
 pop:profile('Pop · Eighth push',slots([1,3,5,7,9,11,13,15],.4,.7),slots([1,5,9,13],.75,.68),{range:[55,81],wide:true,humanMs:12,electronic:false,anticipation:true,variants:[{upper:slots([1,3,5,8,9,11,13,16],.4,.7)},{upper:slots([1,3,5,8,11,13,16],.4,.73),bass:slots([1,5,9,16],.7,.68)}]}),
 rock:profile('Rock · Eighth power chords',slots([1,3,5,7,9,11,13,15],.38,.82),slots([1,9],1.6,.8),{range:[55,79],voices:3,humanMs:15,electronic:false,power:true,variants:[{upper:slots([1,3,5,7,9,12,14,16],.32,.8),bass:slots([1,9,15],.9,.78)},{upper:slots([1,3,5,7,9,11,14],.4,.84),bass:slots([1,7,9,15],.8,.78)}]}),
 jazz:profile('Jazz · Charleston comping',slots([1,7],.65,.65),slots([1,9],1.5,.6),{unit:8,swing:.65,range:[55,79],voices:4,humanMs:25,electronic:false,variants:[{upper:slots([3,9,15],.55,.6)},{upper:slots([1,7,12,15],.45,.63)}]}),
 bossa:profile('Bossa · Two-bar syncopation',slots([1,4,7,11,14],.5,.62),slots([1,7,9,15],.65,.6),{range:[55,79],humanMs:10,electronic:false,bassFifths:true,anticipation:true,alternate:{upper:slots([1,4,8,11,14],.5,.6)},variants:[{upper:slots([1,4,8,11,15],.45,.62)},{upper:slots([1,4,7,11],.55,.62),bass:slots([1,7,9,15,16],.4,.59)}]}),
 dembow:profile('Reggaeton · Dembow pocket',slots([4,7,12,15],.35,.7),slots([1,9],.7,.72),{range:[60,79],variants:[{upper:slots([4,7,12],.4,.72),bass:slots([1,9,15],.5,.68)},{upper:slots([4,7,11,15],.35,.68),bass:slots([1,9,16],.4,.7)}]}),
 dancehall:profile('Dancehall · Offbeat skank',slots([3,7,11,15],.23,.68),slots([1,4,7],.65,.7),{range:[60,79],variants:[{upper:slots([3,7,11,14,15],.2,.65),bass:slots([1,4,7,11],.5,.68)},{upper:slots([3,7,15],.25,.7),bass:slots([1,4,7,16],.5,.7)}]}),
 fusion:profile('Fusion · Sixteenth accents',slots([1,4,7,12,15],.3,.74),slots([1,7,9,14],.5,.68),{swing:.54,range:[55,84],voices:5,wide:true,humanMs:20,electronic:false,variants:[{upper:slots([1,4,8,12,15],.28,.72)},{upper:slots([1,7,10,15],.4,.72),bass:slots([1,7,11,16],.4,.69)}]})
};
export const newGenreIds=['classicHouse','techHouse','futureBass','progressiveDrop','tropicalHouse','garage'];
export const genrePatterns=Object.fromEntries(Object.entries(genreProfiles).map(([id,p])=>[id,p.label]));
export const usesGenre=(id,options={})=>!!genreProfiles[id]&&(Number(options.genreRevision)>=GENRE_REVISION||newGenreIds.includes(id));
export function selectGenre(settings,pattern){
 const p=genreProfiles[pattern];
 return {...settings,genreRevision:GENRE_REVISION,...(p?{swing:Math.round((p.swing-.5)*100)}:{})};
}
export function swingDescription(pattern,value){const p=genreProfiles[pattern];return p?`${p.unit} 分 SWING · ${Math.round(50+Number(value))}%（50% 直拍）`:'SWING';}
export function genreGrid(pattern,bar=0){
 const p=genreProfiles[pattern];if(!p)return null;
 const variation=bar%8===7?p.variants?.[1]:bar%4===3?p.variants?.[0]:bar%2===1?p.alternate:null;
 return {...p,...variation};
}

export function genreVoicing(symbol,pattern){
 const c=parse(symbol),p=genreProfiles[pattern];if(!c||!p)return [];
 const [lo,hi]=p.range;
 let ints=p.power?[0,c.intervals.includes(7)?7:(c.intervals.find(n=>[6,8].includes(n))??0),12]:[...c.intervals];
 if(ints.length>p.voices){const priority=n=>[3,4,10,11].includes(n)?0:n>=13?1:n===0?2:3;ints.sort((a,b)=>priority(a)-priority(b)||a-b);ints=ints.slice(0,p.voices);}
 let upper=[...new Set(ints.map(i=>{let n=lo+mod(c.root-lo)+i;while(n>hi)n-=12;while(n<lo)n+=12;return n;}))].sort((a,b)=>a-b);
 if(p.wide){upper=upper.map((n,i)=>i%2&&n+12<=hi?n+12:n);upper=[...new Set(upper)].sort((a,b)=>a-b);}
 for(const i of [0,7,3,4,10,11,2]){if(upper.length>=p.voices)break;if(!c.pcs.includes(mod(c.root+i)))continue;
  const choices=Array.from({length:hi-lo+1},(_,j)=>lo+j).filter(n=>mod(n)===mod(c.root+i)&&!upper.includes(n));
  const n=choices.sort((a,b)=>p.wide?b-a:a-b)[0];if(n!==undefined)upper.push(n);
 }
 upper.sort((a,b)=>a-b);
 // Low upper voices need space. No close interval below E3, including Future bass.
 for(let i=0;i<upper.length-1;i++)if(upper[i]<52&&upper[i+1]-upper[i]<5){if(upper[i]+12<=hi)upper[i]+=12;}
 upper=[...new Set(upper)].sort((a,b)=>a-b);
 const bass=(p.electronic||p.bassOctaves?24:36)+c.bass;
 return [bass,...upper];
}

const EPS=1e-8;
export function renderGenre(plan,pattern,options={}){
 const p=genreProfiles[pattern];if(!p||!plan.length)return [];
 const bpm=Number(options.bpm)||120,ms=bpm/60000,total=Number(options.totalBeats)||plan.at(-1).beat+plan.at(-1).beats;
 const gate=Math.max(.1,Math.min(1,Number(options.gate??.8))),human=Math.max(0,Math.min(1,Number(options.human??.45)));
 const ratio=.5+Math.max(0,Math.min(.32,Number(options.swing??(p.swing-.5))));
 const step=p.unit===8?.5:.25;
 const swing=t=>{const n=t/step;return Math.abs(n-Math.round(n))<EPS&&Math.round(n)%2?t+2*step*(ratio-.5):t;};
 const voiced=[];
 for(const s of plan){const chord={...s,notes:genreVoicing(s.symbol,pattern)},prev=voiced.at(-1);
  if(prev&&sameHarmony(prev,chord)&&Math.abs(prev.beat+prev.beats-chord.beat)<EPS)prev.beats+=chord.beats;else voiced.push(chord);
 }
 const events=[];
 const emit=(logical,hit,part,index,grid)=>{
  const pocket=p.pocketMs*(part==='upper'||p.pocketBoth?1:0)*ms,at=logical+pocket;
  const si=voiced.findIndex(s=>at>=s.beat-EPS&&at<s.beat+s.beats-EPS);if(si<0)return;
  const s=voiced[si],anticipate=p.anticipation&&(part==='upper'||['house','classicHouse','techHouse','garage','progressiveDrop'].includes(pattern)),target=anticipate?gridTarget(voiced,si,logical,'house',{part,acrossBars:true}):{chord:s,anticipated:false},chord=target.chord;
  const random=gridRandom(options.seed??42,logical,index,part==='bass'?11:12),end=chord.beat+chord.beats;
  const jitter=(random()*2-1)*p.humanMs*human*ms;
  const beat=Math.max(s.beat,Math.min(s.beat+s.beats-EPS,at+jitter));
  let pitches=part==='bass'?[chord.notes[0]]:chord.notes.slice(1);
  if(part==='bass'&&!target.anticipated&&p.bassOctaves&&index%2)pitches=[Math.min(48,pitches[0]+12)];
  if(part==='bass'&&!target.anticipated&&p.bassFifths&&index%2){const c=parse(chord.symbol),fifth=c.intervals.find(i=>[6,7,8].includes(i))??0;pitches=[24+mod(c.root+fifth)];}
  // A brief leading tone answers the root on weak bass slots. Do not
  // replace an already anticipated target root with a passing tone.
  if(part==='bass'&&!target.anticipated&&((pattern==='funk'&&index===6)||(pattern==='soul'&&index%2===1)||(pattern==='gospel'&&logical%4>=3.5))){const root=chord.notes[0];pitches=[root>24?root-1:35];}
  if(part==='upper'&&p.broken)pitches=[pitches[index%pitches.length]];
  let span=hit.duration;
  if(p.slices){const times=grid[part].map(h=>swing(h.at));const next=times.find(t=>t>logical%4+EPS);span=(next??4)-logical%4-.01;}
  const pickupEnd=target.anticipated?Math.min(end,chord.beat+.25):0;
  for(const [j,note] of pitches.entries()){
   const roll=part==='upper'?p.rollMs*ms*j/Math.max(1,pitches.length-1):0,onset=beat+roll;
   const duration=Math.min(end-onset,Math.max(span*gate,pickupEnd-onset));
   if(duration<=EPS||onset>=total-EPS)continue;
   events.push({beat:onset,note,part,duration,velocity:Math.max(.25,Math.min(.94,hit.velocity+(random()-.5)*.1*human+(p.slices&&logical%4===0?-.14:0))),articulation:'rhythmic',_grid:logical,_harmony:chord.beat,_pickup:target.anticipated});
  }
 };
 for(let bar=0;bar*4<total-EPS;bar++){
  const grid=genreGrid(pattern,bar);
  for(const part of ['bass','upper'])grid[part].forEach((hit,i)=>emit(bar*4+swing(hit.at),hit,part,i,grid));
 }
 // Use exact harmonic boundaries, not jittered onset proximity. A pickup may
 // cover one hand; only the missing hand is supplied at the change.
 for(const [i,chord] of voiced.entries())for(const part of ['bass','upper']){
  const pickups=events.filter(n=>n._harmony===chord.beat&&n.part===part&&n._pickup);
  if(pickups.length){const first=Math.min(...pickups.map(n=>n.beat));for(const n of events){
   if(n.part===part&&n._harmony<chord.beat&&n.beat<chord.beat)n.duration=Math.min(n.duration,Math.max(0,first-n.beat));
   if(n.part===part&&n._harmony===chord.beat&&!n._pickup&&Math.abs(n._grid-chord.beat)<EPS)n.duration=0;
  }}
  const covered=events.some(n=>n.duration>EPS&&n.part===part&&n._harmony===chord.beat&&(Math.abs(n._grid-chord.beat)<EPS||n.beat<chord.beat&&n.beat+n.duration>chord.beat+EPS));
  const previous=voiced[i-1],same=previous&&sameHarmony(previous,chord)&&Math.abs(previous.beat+previous.beats-chord.beat)<EPS;
  if(covered||Math.abs(chord.beat%4)<EPS||same)continue;
  const delay=part==='upper'||p.pocketBoth?Math.min(p.pocketMs*ms,chord.beats*.5):0;
  for(const note of part==='bass'?[chord.notes[0]]:chord.notes.slice(1))events.push({beat:chord.beat+delay,note,part,duration:Math.min(chord.beats-delay,.4*gate),velocity:.6,articulation:'rhythmic',_grid:chord.beat,_harmony:chord.beat});
 }
 return events.filter(n=>n.duration>EPS).map(({_grid,_harmony,_pickup,...n})=>({...n,duration:Math.min(n.duration,total-n.beat)}));
}
