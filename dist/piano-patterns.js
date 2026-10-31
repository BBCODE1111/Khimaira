import {createTheory} from './music-core.js?v=1.1.6';
const {parse}=createTheory('khimaira-v1');
import {referenceNotes,overlaps,protectMelody} from './melody-reference.js?v=1.0.7';
import {isTexture,renderTexture,applyPianoPhrase} from './piano-motion.js?v=2.0.0';
export const pianoPatterns={
 pianoWhole:'K-POP 01 · Whole-bar pillars / 一小節柱式',pianoHalf:'K-POP 02 · Half-note pillars / 兩拍柱式',pianoQuarter:'K-POP 03 · Quarter-note pillars / 四分柱式',
 pianoBassReply:'K-POP 04 · Bass then chord / 低音先行',pianoBackbeat:'K-POP 05 · Soft backbeat / 二四拍回答',pianoPush:'K-POP 06 · Eighth-note push / 八分推拍',
 pianoBallad:'K-POP 07 · Ballad long and short / 抒情長短句',pianoBroken:'K-POP 08 · Block to broken / 柱式接分解',pianoAnswer:'K-POP 09 · Phrase-end answer / 柱式句尾回應',
 pianoHandTurn:'K-POP 10 · Together R L R / 齊右左右',pianoKpop:'K-POP 11 · K-pop syncopation / 韓式留白切分',pianoJpop:'K-POP 12 · J-pop chorus lift / 日式副歌推進'
};
export const pianoRecommendations={
 'American pop':['pianoHalf','pianoQuarter','pianoPush'],Mandopop:['pianoBassReply','pianoBallad','pianoAnswer'],
 'K-pop':['pianoKpop','pianoBackbeat','pianoHandTurn'],'Japanese rock':['pianoJpop','pianoPush','pianoBroken'],
 Ballad:['pianoWhole','pianoBallad','pianoBassReply']
};
// [beat within 4/4 bar, hand, duration, velocity]. Keep left/right articulation
// separate: a change of chord always gets a fresh bass, even between grid hits.
const rhythms={
 pianoWhole:[[0,'both',4,.65]],
 pianoHalf:[[0,'both',1.8,.68],[2,'both',1.8,.62]],
 pianoQuarter:[0,1,2,3].map(t=>[t,'both',.82,t%2?.59:.7]),
 pianoBassReply:[[0,'bass',2,.66],[.5,'upper',1.4,.6],[2,'bass',2,.6],[2.5,'upper',1.4,.57]],
 pianoBackbeat:[[0,'bass',1.7,.68],[1,'upper',.8,.65],[2,'bass',1.7,.62],[3,'upper',.8,.68]],
 pianoPush:[[0,'both',1.2,.72],[1.5,'upper',.45,.59],[2,'bass',1.8,.63],[2.5,'upper',.8,.65],[3.5,'upper',.45,.58]],
 pianoBallad:[[0,'bass',4,.63],[.25,'upper',2.1,.61],[2.5,'upper',1.3,.53]],
 pianoBroken:[[0,'both',1.5,.65],[2,'low',.75,.57],[2.5,'high',.75,.58],[3,'upper',.85,.61]],
 pianoAnswer:[[0,'both',1.8,.66],[2,'upper',.8,.59]],
 pianoHandTurn:[[0,'both',.9,.7],[1,'upper',.45,.62],[1.5,'bass',.22,.54],[1.75,'upper',1.1,.65],[3,'upper',.45,.61],[3.5,'bass',.22,.53],[3.75,'upper',.24,.59]],
 pianoKpop:[[0,'bass',1.3,.69],[.75,'upper',.4,.6],[1.5,'upper',.6,.64],[2.5,'bass',.7,.61],[2.75,'upper',.45,.6],[3.5,'upper',.35,.56]],
 pianoJpop:[[0,'upper',.65,.75],[.5,'low',.4,.59],[1,'upper',.7,.67],[1.75,'high',.22,.6],[2,'upper',.7,.73],[2.5,'low',.4,.61],[3,'upper',.7,.68],[3.5,'high',.45,.61],...[0,.5,1,1.5,2,2.5,3,3.5].map(t=>[t,'bass',.42,t%1?.55:.68])]
};
export function renderPianoPattern(plan,pattern,options={}){
 if(options.pianoRevision!==1)plan=plan.map(c=>({...c,root:parse(c.symbol)?.root}));
 if(isTexture(pattern)){
  const melody=referenceNotes(options);
  const events=renderTexture(plan,pattern,{...options,barBeats:4,fillMode:options.pianoFills||'phrase',melody:melody.map(n=>({pitch:n.note,start:n.beat,end:n.beat+n.duration}))});
  return protectMelody(applyPianoPhrase(events,plan,pattern,{...options,barBeats:4,melody:melody.map(n=>({pitch:n.note,start:n.beat,end:n.beat+n.duration}))}).map(n=>({...n,part:n.role==='bass'?'bass':'upper'})),melody);
 }
 const melody=referenceNotes(options),out=[],human=Math.max(0,Math.min(1,Number(options.human??.2))),gate=Math.max(.1,Math.min(1,Number(options.gate??.82)));
 let seed=(options.seed??42)>>>0;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(const s of plan){
  const end=s.beat+s.beats,barStart=Math.floor(s.beat/4)*4,bar=Math.floor(s.beat/4),bass=s.notes[0],upper=[...new Set(s.notes.slice(1))];
  const emit=(at,notes,duration,velocity,part,fill=false)=>{
   // Shared attack jitter preserves the block chord; no per-note IPC or timer.
   const beat=at+random()*.012*human;if(beat>=end)return;
   const held=options.pianoRevision!==1&&part==='upper'&&['pianoWhole','pianoHalf','pianoBallad'].includes(pattern)&&!fill;
   const rolled=pattern==='pianoBallad'&&part==='upper'&&options.pianoRevision!==1;
   for(const [i,note] of notes.entries()){const roll=rolled?i*.02*(options.bpm??92)/60:0;out.push({beat:beat+roll,note,part,fill,...(rolled?{phraseAttack:beat}:{}),articulation:held?'held':'rhythmic',duration:Math.max(0,Math.min(end-beat-roll,duration*(held?1:gate))),velocity:Math.max(.25,Math.min(.95,velocity+[0,-.025,.015,-.045][bar%4]+(random()-.5)*.06*human))});}

  };
  const grid=pattern==='pianoBallad'&&options.pianoRevision!==1?rhythms[pattern].map(h=>h[0]===.25?[0,...h.slice(1)]:h):rhythms[pattern];
  let hits=grid.filter(([t])=>barStart+t>=s.beat-1e-8&&barStart+t<end-1e-8).map(h=>[barStart+h[0],...h.slice(1)]);
  if(!hits.some(([at,hand])=>at===s.beat&&['both','bass'].includes(hand)))hits.unshift([s.beat,'bass',s.beats,.63]);
  if(!hits.some(([at,hand])=>at===s.beat&&hand!=='bass')&&s.beat!==barStart)hits.unshift([s.beat,'upper',Math.min(1,s.beats),.59]);
  const dense=melody.filter(m=>m.beat>=barStart&&m.beat<barStart+4).length>=6;
  for(const [at,hand,dur,vel] of hits){
   if(dense&&hand!=='bass'&&at!==s.beat&&at%1!==0)continue;
   if(hand==='both'||hand==='bass')emit(at,[bass],dur,vel,'bass');
   if(hand!=='bass')emit(at,hand==='low'?[upper[0]]:hand==='high'?[upper.at(-1)]:upper,dur,vel,'upper');
  }
  const fillMode=options.pianoFills||'phrase',phraseEnd=bar%4===3,answer=pattern==='pianoAnswer'&&bar%2===1;
  if(fillMode!=='off'&&(phraseEnd||fillMode==='light'&&answer)&&end>=barStart+4-1e-8&&s.beats>=1){
   const at=barStart+3,finish=barStart+4;
   // Fills belong in an actual rest, not under a held vocal note. Without a
   // reference use only a two-note chord-tone answer every fourth bar.
   if(at>=s.beat&&!melody.some(m=>overlaps(m,at,finish))){
    for(const n of out)if(n.part==='upper'&&n.articulation!=='held'&&n.beat>=at&&n.beat<finish)n.omitForFill=true;
    for(const n of out)if(n.part==='upper'&&n.articulation!=='held'&&n.beat<at&&n.beat+n.duration>at)n.duration=at-n.beat;
    const picks=bar%8===3?[upper.at(-1),upper[Math.max(0,upper.length-2)]]:[upper[0],upper.at(-1)];
    picks.forEach((n,i)=>emit(at+i*.5,[n],.42,.5,'upper',true));
   }
  }
 }
 return protectMelody(applyPianoPhrase(out.filter(n=>!n.omitForFill&&Number.isFinite(n.note)),plan,pattern,{...options,barBeats:4,melody:melody.map(n=>({pitch:n.note,start:n.beat,end:n.beat+n.duration}))}),melody);
}
