import {genrePatterns,usesGenre,renderGenre} from './genre-rhythm.js?v=1.0.4';
import {gridTarget,pickupPitch,finishGrid,gridRandom} from './performance-grid.js?v=1.0.4';
import {voicingCandidates as candidates} from './voicing.js?v=1.0.4';
import {arpeggiate} from './arpeggiator.js?v=1.0.4';
import {parse,mod} from './music.js?v=1.0.4';
import {pianoPatterns,renderPianoPattern} from './piano-patterns.js?v=1.0.4';
import {texturePatterns,isTexture} from './piano-motion.js?v=2.0.0';
export const patterns={arp:'ARP · 合成器分解',sustain:'長音和弦 · 精準全拍',ballad:'Ballad · 柔和分解',jazz:'Jazz · Swing comping',bossa:'Bossa · Bass & syncopation',gospel:'Gospel · Rolling chords',house:'Deep house · Flowing syncopation',soul:'Soul · Laid-back comping',rnb:'R&B · Broken pocket',funk:'Funk · 16th conversation',edm:'EDM · Octave pulse',lofi:'Lo-fi · Dusty late pocket',chill:'Chill · Breathing chords',neosoul:'Neo-soul · Rolling answers',pop:'Pop · Lifted eighths',blues:'Blues · Shuffle comping',neoclassical:'Classical rock · Dramatic ostinato',disco:'Nu-disco · Octave syncopation',ambient:'Ambient · Floating sustain',fusion:'Fusion · 16th accents',rock:'Rock · Eighth pulse',jpop:'J-rock · Driving broken chords',alberti:'Classical · Alberti bass',folk:'Folk · Fingerstyle',ostinato:'Modal · Pedal ostinato',arpUp:'Arp · Up',arpDown:'Arp · Down',arpBounce:'Arp · Up / Down',arpRandom:'Arp · Seeded random',arpOctave:'Arp · Two octaves'};
Object.assign(patterns,{metal:'Metal · 低音 Gallop',doom:'Doom · 緩慢重擊',grunge:'Grunge · 重擊與留白',alternative:'Alternative · 破碎音型',gothic:'Gothic · 冷峻反覆',requiem:'Requiem · 合唱長音',modalPluck:'調式 · Pedal & plucked answers',sparsePluck:'日本五聲 · Sparse plucks',highlife:'Highlife · Interlocking guitar',pentatonicAnswer:'Tizita · Pentatonic answers',slackKey:'Slack-key · Alternating bass',breathingDrone:'當代笛樂 · Breathing drone',ragaDrone:'印度音列 · Sa–Pa drone',afrobeats:'Afrobeats · Syncopated pocket',amapiano:'Amapiano · Keys & bass replies',dembow:'Reggaeton · Dembow-inspired keys',dancehall:'Dancehall · Offbeat vamp',latinPop:'Latin pop · 3–3–2 keys',flamenco:'Flamenco · 4/4 strum study'});
Object.assign(patterns,pianoPatterns);
Object.assign(patterns,texturePatterns);
export const legacyPerformanceLabels={...patterns};
Object.assign(patterns,genrePatterns,{edm:'Electro-pop · Eighth pulse'});
export const performanceLabel=(id,revision=2)=>revision<2?(legacyPerformanceLabels[id]||patterns[id]):patterns[id];
export function segments(bars){const out=[];bars.forEach((b,i)=>{let at=i*4;for(const c of b.chords??(b.symbol?[{symbol:b.symbol,beats:4}]:[])){if(parse(c.symbol))out.push({...c,beat:at});at+=c.beats;}});return out;}
export function voicePlan(bars,{voicing='close',register=0}={}){const seg=segments(bars);if(!seg.length)return [];const lists=seg.map(c=>candidates(c.symbol,voicing));let costs=lists[0].map(v=>Math.abs(v[1]-57)*.6),paths=lists[0].map((_,i)=>[i]);for(let t=1;t<lists.length;t++){const next=[],nextPaths=[];for(const v of lists[t]){let score=Infinity,best=0;lists[t-1].forEach((p,j)=>{let move=Math.abs(v[0]-p[0])*.3;for(let k=1;k<v.length;k++)move+=Math.abs(v[k]-p[Math.min(k,p.length-1)]);move+=Math.abs(v.length-p.length)*3;if(costs[j]+move<score){score=costs[j]+move;best=j;}});next.push(score);nextPaths.push([...paths[best],next.length-1]);}costs=next;paths=nextPaths;}const best=costs.indexOf(Math.min(...costs));return seg.map((s,i)=>({...s,notes:lists[i][paths[best][i]].map(n=>Math.max(21,Math.min(108,n+register)))}));}
export function performance(bars,pattern='sustain',options={}){const alias={block:'sustain',rhythmic:'jazz',melodic:'ballad',arpeggio:'arpUp',mixed:'gospel'};pattern=alias[pattern]||pattern;const plan=voicePlan(bars,options);let all=[];const human=Math.max(0,Math.min(1,Number(options.human??.45))),gate=Math.max(.1,Math.min(1,Number(options.gate??.8))),rate=Number(options.rate??.5),swing=Math.max(0,Math.min(.32,Number(options.swing??.08)));
const modern=usesGenre(pattern,options);
if(modern)all=renderGenre(plan,pattern,{...options,totalBeats:bars.length*4});
if(pattern==='arp'){
 const notes=arpeggiate(plan,options);
 if(!['bass','pad'].includes(options.arpFoundation))return notes;
 all.push(...notes);
 for(const s of plan){all.push({beat:s.beat,note:s.notes[0],part:'bass',articulation:'held',duration:s.beats,velocity:.62});
  if(options.arpFoundation==='pad')for(const n of s.notes.slice(1))all.push({beat:s.beat,note:n,part:'upper',articulation:'held',duration:s.beats,velocity:.42});}
}
if(pianoPatterns[pattern]||isTexture(pattern))all.push(...renderPianoPattern(plan,pattern,{...options,totalBeats:bars.length*4}));
// The templates below describe a bar, never the duration of one chord.
// Render each chord's intersection with that fixed grid using its own voicing.
for(const [segmentIndex,s] of (modern||pattern==='arp'||pianoPatterns[pattern]||isTexture(pattern)?[]:plan).entries()){
 const v=s.notes,upper=v.slice(1),bar=Math.floor(s.beat/4),idx=bar,barStart=bar*4,length=4,end=s.beat+s.beats;
 const phrase=bar%8,variant=bar%3,pedal=['ballad','soul','chill','gospel','ambient'].includes(pattern);
 const add=(t,notes,dur,velocity=.74,roll=0,articulation='rhythmic',part=null)=>{
  const at=barStart+t;
  const block=notes.length===upper.length&&notes.every(n=>upper.includes(n));
  const blockPocket=pattern==='lofi'?.03*Number(options.bpm||92)/60:0;
  const blockSwing=['funk','fusion'].includes(pattern)&&Math.abs(t*4-Math.round(t*4))<1e-8&&Math.round(t*4)%2?swing/2:0;
  const blockTarget=block?gridTarget(plan,segmentIndex,at+blockPocket+blockSwing,pattern):null;
  const mappedBlock=blockTarget?.anticipated;
  (mappedBlock?blockTarget.chord.notes.slice(1):notes).forEach((note,j)=>{
   const role=part||(mappedBlock?'upper':(notes.length===1&&['edm','disco','pop'].includes(pattern)||note===v[0]||notes.length===1&&note<upper[0]?'bass':'upper'));
   const random=gridRandom(options.seed??42,at,j,role==='bass'?1:2);
   const jitter=pattern==='sustain'||articulation==='held'&&notes.length===1?0:(random()*.025*human+j*roll);
   const pocket=pattern==='lofi'&&notes!==v&&note!==v[0] ? .03*Number(options.bpm||92)/60 : 0;
   const sixteenth=['funk','fusion'].includes(pattern)&&Math.abs(t*4-Math.round(t*4))<1e-8&&Math.round(t*4)%2?swing/2:0;
   const gridBeat=at+pocket+sixteenth;
   if(gridBeat<s.beat-1e-8||gridBeat>=end-1e-8)return;
   const target=gridTarget(plan,segmentIndex,gridBeat,pattern,{part:role});
   // Swing/pocket define the musical grid. Random timing cannot move an
   // old chord over a harmonic boundary or remove the slot altogether.
   const beat=gridBeat+Math.min(jitter,Math.max(0,(end-gridBeat)*.5)),boundary=target.chord.beat+target.chord.beats;
   const held=pattern==='sustain'||pedal&&note!==v[0];
   let duration=pedal&&note!==v[0]?boundary-beat:Math.min(pattern==='sustain'||articulation==='held'?dur:dur*gate*(.96+random()*.04),boundary-beat);
   if(target.anticipated)duration=Math.max(duration,Math.min(boundary,target.chord.beat+.25)-beat);
   all.push({beat,note:target.anticipated&&!mappedBlock?pickupPitch(note,role,s,target.chord):note,part:role,articulation:held?'held':articulation,duration,
    velocity:Math.max(.25,Math.min(.96,velocity+(pattern==='sustain'?0:([-.07,-.04,0,.04,-.02,.03,.08,-.01][phrase])+(t%1===0?.018:-.018)+(random()-.5)*.16*human))),
    _grid:gridBeat,_harmony:target.chord.beat,_pickup:target.anticipated});
  });
 };

if(pattern==='sustain'){add(0,v,length,.78);continue;}
if(pattern==='metal'){
 for(let t=0;t<length;t+=1){add(t,[v[0]],Math.min(.34,length-t),.86);add(t+(variant===1?.25:.5),[v[0]],.16,.63);if(!(phrase%4===3&&t===3))add(t+(variant===2?.5:.75),[v[0]],.16,.7);}
 (variant===0?[0,1.5,2.75,3.5]:variant===1?[0,1.75,3]:[0,.75,2.5,3.75]).filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(i===0?.6:.28,length-t),i===0?.84:.68));
}
else if(pattern==='doom'){add(0,v,length,.78,.006*human,'held');if(length>3)add(2.5,[v[0]],length-2.5,.59,0,'held');}
else if(pattern==='grunge'){
 (idx%2?[0,.75,2,3.5]:[0,1.5,2,2.75]).filter(t=>t<length).forEach((t,i)=>add(t,v,Math.min(i===0?1.05:.45,length-t),i%2?.58:.84,.005*human));
}
else if(pattern==='alternative'){
 add(0,[v[0]],length,.61,0,'held');const seq=[upper[0],upper.at(-1),upper[1]??upper[0],upper[0]];
 [0,.75,1.5,2.5,3.25].filter(t=>t<length).forEach((t,i)=>add(t,[seq[(i+idx)%seq.length]],Math.min(.7,length-t),i%3?.54:.74));
 if(idx%2)add(3,upper,Math.min(.85,length-3),.65,.008);
}
else if(pattern==='gothic'){
 add(0,[v[0]],length,.65,0,'held');for(let t=0,n=0;t<length;t+=.5,n++){if(variant===1&&n%4===3||phrase%4===3&&t===3.5)continue;const at=t+(variant===2&&n%4===2?.25:0);add(at,[upper[(n%2?upper.length-1:0)]],Math.min(.44,length-at),n%2?.51:.72);}
}
else if(pattern==='requiem'){
 // Each chord keeps its full harmonic span; moving basses belong to the chart, not random ornaments.
 add(0,v,length,.61,0,'held');
}
else if(pattern==='ballad'){
 add(0,[v[0]],length,.66,0,'held');const entry=options.balladEntry==='delayed'?.5:.125;
 const seq=variant===1?[...upper].reverse():[...upper,upper[Math.max(0,upper.length-2)]];
 for(let t=entry,n=0;t<length;t+=.5,n++)add(t,[seq[n%seq.length]],length-t,n===0?.7:.59,0,'held','upper');
}
else if(pattern==='jazz'){
 if(['two','four'].includes(options.bassMode)){
  const step=options.bassMode==='two'?2:1,candidate=plan[segmentIndex+1]||(options.loop&&end===bars.length*4&&plan[0].beat===0?plan[0]:null),next=candidate&&(candidate.beat===end||candidate===plan[0])?candidate:null;
  for(let t=0;t<length;t+=step){
   let note=v[0];
   if(t>0){const c=parse(s.symbol),interval=t%4===2?(c.intervals.find(n=>[6,7,8].includes(n))??0):(c.intervals.find(n=>[3,4,5].includes(n))??0);note=36+mod(c.root+interval);while(note-v[0]>7)note-=12;while(v[0]-note>7)note+=12;}
   if(options.bassMode==='four'&&t===1&&next){note=v[0]+2;}
   if(options.bassMode==='four'&&t>0&&t+step>=length&&next){note=next.notes[0]+(bar%2?1:-1);while(note-v[0]>7)note-=12;while(v[0]-note>7)note+=12;}
   add(t,[note],Math.min(step*.95,length-t),t===0?.72:.59,0,'rhythmic','bass');
  }
 }else add(0,[v[0]],Math.min(1.7,length),.63);
const rhythms=idx%2?[.5+swing,2,3.5+swing]:[0,1.5+swing,3];rhythms.filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(.9,length-t),i===0?.76:.63,.004*human));}
else if(pattern==='bossa'){[0,2].filter(t=>t<length).forEach((t,j)=>add(t,[v[0]+(j?7:0)],Math.min(2,length-t),.64,0,'held','bass'));(idx%2?[0,1,2.5]:[0,1.5,3]).filter(t=>t<length).forEach(t=>add(t,upper,.65,.68,.003));}
else if(pattern==='gospel'){add(0,[v[0]],length,.68,0,'held');[0,1.5,3].filter(t=>t<length).forEach((t,i)=>add(t,i===1?[...upper].reverse():upper,Math.min(1.25,length-t),i===0?.82:.64,.018*human));}
else if(pattern==='house'){
// Sustained upper voices answer a separate syncopated bass; alternating two-bar phrases.
const attacks=idx%2?[[.5,1.45],[2.75,1.25]]:[[0,1.3],[1.75,1.6],[3.5,.5]];
attacks.filter(([t])=>t<length).forEach(([t,d],i)=>add(t,upper,Math.min(d,length-t),i===0?.65:.56,.006*human));
[[0,.8],[1.5,.45],[2.5,.8],[3.75,.25]].filter(([t])=>t<length).forEach(([t,d],i)=>add(t,[v[0]+(i===3?12:0)],d,.61,0,'rhythmic','bass'));}
else if(['soul','rnb','lofi','neosoul','chill','ambient'].includes(pattern)){
const gentle=['chill','ambient'].includes(pattern),late=pattern==='rnb'?.025:0;
add(0,[v[0]],length,.57,0,'held');
const hits=gentle?[[0,length]]:idx%2?[[.5+swing,1.15],[2.75,1.2]]:[[late,1.6],[2.5+swing,1.3]];
hits.forEach(([t,d],i)=>{if(t<length)add(t,upper,Math.min(d,length-t),i?.57:.66,(pattern==='neosoul'?.026:.012)*human,gentle?'held':'rhythmic');});
if(length>=3&&pattern!=='ambient')add(3.25,[upper.at(-1)],gentle?length-3.25:.6,.51,0,gentle?'held':'rhythmic');
}
else if(pattern==='funk'||pattern==='fusion'){
add(0,[v[0]],Math.min(.45,length),.73);const ts=pattern==='funk'?(idx%2?[.25,1,1.75,2.5,3.75]:[0,.75,1.75,2.5,3.25]):[0,.75,1.5,2.75,3.5];
ts.filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(.28,length-t),i%3===0?.86:.69));}
else if(pattern==='edm'||pattern==='disco'||pattern==='pop'){
for(let t=0;t<length;t+=.5){if((variant===1&&t===1.5)||(phrase%4===3&&t===3))continue;const hit=t+(variant===2&&t===2?.25:0);add(hit,[v[0]+(t%1?12:0)],.4,t%1?.56:.73);if(pattern==='edm'||t%1||t===0)add(hit,upper,pattern==='pop'?.7:.38,t%1?.6:.72);}}
else if(pattern==='blues'){
for(let t=0;t<length;t+=1){add(t,[v[0]],.7,.68);add(t+(variant===1&&t===2?.5:.67),upper,.28,.61);}add(variant===2?.5:0,upper,.6,.74);if(phrase%4===3)add(3.5,[upper.at(-1)],.35,.72);}
else if(pattern==='neoclassical'){
add(0,[v[0]],length,.75,0,'held');const seq=[upper[0],upper.at(-1),upper[1]??upper[0],upper.at(-1)];for(let t=0,n=0;t<length;t+=.25,n++){if(variant===1&&n%4===3||variant===2&&n%8===6||phrase%4===3&&t>=3.5)continue;add(t,[seq[(n+variant)%4]],.35,n%4===0?.76:.54);}}
else if(['modalPluck','sparsePluck','pentatonicAnswer','breathingDrone','ragaDrone'].includes(pattern)){
 const drone=['breathingDrone','ragaDrone'].includes(pattern);add(0,[v[0]],length,.48,0,'held');
 if(drone)add(.02,[v[0]+7],length-.02,.35,0,'held');
 const times=pattern==='sparsePluck'?(idx%2?[.5,2.5]:[0,1.5,3.5]):pattern==='ragaDrone'?[.5,1.5,2.75]:pattern==='breathingDrone'?[.25,2.5]:[0,.75,1.5,3];
 times.filter(t=>t<length).forEach((t,i)=>add(t,[upper[(i+idx)%upper.length]],Math.min(pattern==='sparsePluck'?.55:1.15,length-t),i===0?.63:.5));
}
else if(pattern==='highlife'){
 add(0,[v[0]],Math.min(.8,length),.6);if(length>2)add(2,[v[0]],.7,.55);
 [0,.75,1.5,2,2.75,3.5].filter(t=>t<length).forEach((t,i)=>add(t,[upper[(i+idx)%upper.length]],.36,i%3===0?.68:.54));
 [.5,1.75,3.25].filter(t=>t<length).forEach(t=>add(t,[upper.at(-1)],.24,.45));
}
else if(pattern==='slackKey'){
 const chord=parse(s.symbol),fifth=chord.pcs.includes(mod(chord.root+7))?36+mod(chord.root+7):v[0];
 for(let t=0;t<length;t+=1){add(t,[t%2?fifth:v[0]],.85,.56,0,'rhythmic','bass');if(t+.5<length)add(t+.5,[upper[(idx+t)%upper.length]],.9,.6);}
 add(.025,upper,Math.min(1.7,length-.025),.5,.012);
}
else if(pattern==='afrobeats'){
 [[0,.65],[1.5,.4],[2.75,.7]].forEach(([t,d])=>{if(t<length)add(t,[v[0]],d,.63);});
 (idx%2?[.5,1.75,3]:[.75,2,3.5]).filter(t=>t<length).forEach((t,i)=>add(t,upper,.38,i?.57:.66,.006));
}
else if(pattern==='amapiano'){
 [0,2.5].filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(i?1.4:1.8,length-t),i?.51:.6,.008));
 [[.75,.3],[1.5,.45],[2.75,.3],[3.5,.45]].forEach(([t,d],i)=>{if(t<length)add(t,[v[0]+(i===3?12:0)],d,i%2?.65:.56,0,'rhythmic','bass');});
}
else if(['dembow','dancehall','latinPop','flamenco'].includes(pattern)){
 [0,2].filter(t=>t<length).forEach(t=>add(t,[v[0]],.75,.66));
 const hits=pattern==='dembow'?(variant===0?[.75,1.5,2.75,3.5]:variant===1?[.75,1.5,2.75]:[.75,1.5,2.5,3.75]):pattern==='dancehall'?(variant===0?[.5,1.5,2.5,3.5]:variant===1?[.5,1.5,3.5]:[.5,1.5,2.75,3.5]):pattern==='latinPop'?[0,1.5,3]:[0,1,2.5,3.5];
 hits.filter(t=>t<length).forEach((t,i)=>add(t,pattern==='flamenco'&&i%2?[...upper].reverse():upper,Math.min(.45,length-t),i%2?.58:.72,pattern==='flamenco'?.012:.003));
}
else if(pattern==='rock'){
 for(let t=0;t<length;t+=.5){if(phrase%4===3&&t===3.5)continue;add(t,[v[0]],.45,t%1===0?.78:.64);}
 const hits=variant===0?[0,1,2,3]:variant===1?[0,1,2.5,3]:[0,.75,2,3];
 hits.filter(t=>t<length).forEach(t=>add(t,upper,.65,t===1||t===3?.82:.77));
}
else if(pattern==='jpop'){
 for(let t=0;t<length;t+=.5)add(t,[v[0]],.42,t%1?.62:.76);
 const hits=variant===0?[0,.5,1.5,2,2.5,3.5]:variant===1?[0,.75,1.5,2.5,3,3.75]:[0,.5,1,1.75,2.5,3.5];
 hits.filter(t=>t<length).forEach((t,i)=>add(t,[upper[i%upper.length],upper.at(-1)],.48,i%3?.66:.8,0,'rhythmic','upper'));
}

else {const arp=pattern.startsWith('arp');const seq=pattern==='arpOctave'?[...upper,...upper.map(n=>n+12)]:pattern==='folk'?[v[0],upper[1]??upper[0],upper.at(-1),upper[0]]:pattern==='alberti'?[v[0],upper.at(-1),upper[0],upper.at(-1)]:pattern==='ostinato'?[v[0],upper[0],v[0],upper.at(-1)]:v;const step=arp?rate:pattern==='jpop'?.5:.5;let n=0;for(let t=0;t<length-.00001;t+=step,n++){let k=n%seq.length;if(pattern==='arpDown')k=seq.length-1-k;if(pattern==='arpBounce'){const period=Math.max(1,seq.length*2-2);k=n%period;k=k<seq.length?k:period-k;}if(pattern==='arpRandom')k=Math.floor(gridRandom(options.seed??42,barStart+t,0,3)()*seq.length);const offset=swing*step*2;const shift=step<=.5&&n%2?offset:0;const interval=step<=.5?step+(n%2?-offset:offset):step;if(['alberti','folk','ostinato'].includes(pattern)&&phrase%4===3&&t===3.5||pattern==='ostinato'&&variant===2&&t===1.5)continue;const offsetTime=['alberti','folk','ostinato'].includes(pattern)&&variant===1&&t===2?.25:0;add(t+shift+offsetTime,[seq[k]],interval,n%4===0?.78:.62);}}
}
if(!modern&&pattern!=='arp'&&!pianoPatterns[pattern]&&!isTexture(pattern))all=finishGrid(all,plan,pattern,{gate,totalBeats:bars.length*4,bpm:Number(options.bpm||92)});
// End a repeated note before its next attack; prevent ambiguous overlapping MIDI note pairs.
all.sort((a,b)=>a.beat-b.beat||a.note-b.note);const last=new Map(),clean=[];for(const n of all){const p=last.get(n.note);
// Two hands on the same key are one attack, even with independent humanization.
if(p&&n.beat-p.beat<.04){p.duration=Math.max(p.duration,n.beat+n.duration-p.beat);p.velocity=Math.max(p.velocity,n.velocity);if(n.articulation==='held')p.articulation='held';continue;}
if(p&&p.beat+p.duration>n.beat){const end=p.beat+p.duration;if(p.articulation==='held'){n.duration=Math.max(n.duration,end-n.beat);n.articulation='held';}p.duration=n.beat-p.beat;}
last.set(n.note,n);clean.push(n);}return clean;}
