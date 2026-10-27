import {darkStyles} from './dark-styles.js?v=17';
import {names,mod,parse,spellPitch,spellChord,spellInterval,transposeSymbol,chordTones} from './music.js?v=piano-audit-1';
import {parseBar,chordList,parseChart} from './solutions.js?v=piano-audit-1';
import {songs} from './song-pool.js?v=17';
import {worldStyles} from './world-styles.js?v=17';
import {worldMutation} from './world-generator.js?v=piano-audit-1';
import {harmonyStudies,learnedIdea} from './harmony-knowledge.js?v=18';
export const styles={
Jazz:{description:'功能替代、次屬和弦、ii–V、三全音／backdoor，讓 3rd 與 7th 連接。',pattern:'jazz',voicing:'rootless',phrases:[['Cmaj9 Ebdim7','Dm9 G13','Em7 A7b9','Dm9 Db7#11'],['Em9 A7alt','Dm9 G13','Fm9 Bb13','C69 G7alt'],['C69','F#m7b5 B7b9','Em9 A7alt','Dm9 G13']],T:['Cmaj9','Em9 A7alt','C69 Ebdim7'],R:['Am9','Em7 A7alt','Dm9 G13'],S:['Fmaj9','Fm9 Bb13','Dm9 G13'],D:['G13','Dm9 Db7#11','G7sus4 G7alt']},
Gospel:{description:'斜線低音、減七經過和弦、IV–iv、sus 解決與 plagal 色彩。',pattern:'gospel',voicing:'open',phrases:[['C69 E7/G#','Am9 C7/G','Fmaj9 Fm6','C/G G7sus4'],['Cmaj9/E','Fmaj9 F#dim7','C/G A7b9','Dm9 G13'],['C69','Bb/C C7','Fmaj9 Fm6','C/G G7']],T:['C69/E','Cmaj9 E7/G#','C/G'],R:['Am9 C7/G','C7/G','Em7 A7b9'],S:['Fmaj9 Fm6','Fmaj9 F#dim7','Dm9/G'],D:['G7sus4 G13','C/G G7','Db9 C69']},
Fusion:{description:'Lydian #11、調式平移、非功能根音關係與旋律小調色彩。',pattern:'fusion',voicing:'open',phrases:[['Cmaj9#11','Ebmaj9#11','Dm11','Db7#11'],['Cmaj7#11','Abmaj9','Bb/C','Dmaj7#11'],['CmMaj9','F13','Dbmaj9#11','G7alt']],T:['Cmaj9#11','D/C','Ebmaj9#11'],R:['Am11','Abmaj9#11','AmMaj9'],S:['Fmaj7#11','Gbmaj9#11','Dm11'],D:['G7#11','Db7#11','Bb/C']},
'Bossa nova':{description:'6/9、m9、次屬和弦、半音減和弦；低音與切分和弦分開。',pattern:'bossa',voicing:'rootless',phrases:[['C69 A7b9','Dm9 G13','Em7 Ebdim7','Dm9 G7b9'],['Cmaj9','C#dim7','Dm9 G13','C69 G7b13'],['Am9 D9','Gmaj9 Cmaj9','F#m7b5 B7b9','Em9 E7b9']],T:['C69','Cmaj9 A7b9','Em7 Ebdim7'],R:['Am9 D9','Am6','Em7 A7b9'],S:['Fmaj9 Fm6','Dm9','Fmaj7 F#dim7'],D:['G13','Dm9 G7b9','G7sus4 G7b13']},
Rock:{description:'三和弦與 power chord、sus、Mixolydian ♭VII 和平行小調 ♭VI。',pattern:'rock',voicing:'open',phrases:[['C5','Bb','F','C G'],['C','G/B','Am','F Gsus4'],['Cm','Ab','Eb','Bb']],T:['C5','Csus2','C Bb'],R:['Am','Ab','Am G'],S:['F','F C/E','Ab F'],D:['G5','Gsus4 G','Bb F']},
'Japanese rock':{description:'王道 IV–V–iii–vi、iii 的屬化、下降低音與大／小調借用。',pattern:'jpop',voicing:'open',phrases:[['Fmaj7','G','Em7','Am7'],['Fadd9','G/F','Em7 E7/G#','Am G'],['Fmaj9','G13','C/E E7','Am7 A7']],T:['C/E','Em7 E7/G#','Cmaj9'],R:['Am7','Am G','Am A7'],S:['Fadd9','Fmaj7 Fm6','Dm7'],D:['G/F','G13','Gsus4 G']},
House:{description:'循環 m7／m9、平行和弦與離拍 stab；保留節拍上的空間。',pattern:'house',voicing:'close',phrases:[['Am9','Fmaj9','Cmaj9','G6'],['Cm9','Abmaj7','Fm9','Bb13'],['Cm7','Ebm7','Fm7','Bbm7']],T:['Cmaj9','Cm9','C69'],R:['Am9','Abmaj9','Am7'],S:['Fmaj9','Fm9','F6'],D:['G7sus4','Bb13','Gm9']},
Classical:{description:'三和弦轉位、級進低音、次屬和弦與終止式；此模式非嚴格四部和聲。',pattern:'alberti',voicing:'close',phrases:[['C','G/B','Am','Em/G'],['F','C/E','Dm/F','G7'],['C/E','F','Dm/F G7','C']],T:['C/E','C G/B','C'],R:['Am/C','E7/G# Am','Am Em/G'],S:['F/A','Dm/F','F C/E'],D:['G/B','Dm/F G7','C/G G7']},
'Phrygian dominant':{description:'1 ♭2 3 4 5 ♭6 ♭7；主大三和弦、♭II 與小 iv。具體調式，非泛稱民族音樂。',pattern:'ostinato',voicing:'open',phrases:[['C','Db','Fm','C'],['C Db/C','C','Bbm','C'],['C7b9','Dbmaj7','Fm/C','C']],T:['C','C7b9','Db/C'],R:['Ab','Bbm','Ab/C'],S:['Fm','Db','Fm/C'],D:['Db/C','Bbm C','C7b9']},
'Dorian folk':{description:'小調主音配大六度；i–IV 的 Dorian 色彩、持續低音與開放弦感。',pattern:'folk',voicing:'open',phrases:[['Cm','F','Bb','Cm'],['Cm9','F/C','Dm7','Cm6'],['Cm','Bb/C','F','Cm']],T:['Cm','Cm6','Cm9'],R:['Am7b5','Cm/A','Cm6'],S:['F','F/C','Dm7'],D:['Gm7','Bb','F/C']}
};
const transpose=(symbol,key)=>transposeSymbol(symbol,key,key);
function preset(description,pattern,voicing,phrases){return {description,pattern,voicing,phrases};}
Object.assign(styles,{
'Soul':preset('大六／九和弦、IV–iv 與柔和次屬；有呼吸的切分和聲。','soul','open',[['Fmaj9','Fm6','C/E','A7 Dm7'],['C69','Em7 A7','Dm9','G13'],['Am9','D9','Fmaj9','C69']]),
'R&B':preset('小九和弦、major 9、半音低音與 secondary dominant，慵懶的分層節奏。','rnb','rootless',[['Dm9','G13','Cmaj9','A7b9'],['Fmaj9','Em7 A7b9','Dm9','G7sus4'],['Am9','Gm9 C13','Fmaj9','E7#9']]),
'Funk':preset('Dominant 9/13、Dorian vamp，十六分休止與短促和弦互相咬合。','funk','rootless',[['C9','C9','F9','G9'],['Dm9','G13','Dm9','G9'],['Cm9','F13','Bb9','G7#9']]),
'EDM':preset('可循環的 vi–IV–I–V、add9 與 sus；八分節奏與八度低音推進。','edm','open',[['Am','Fadd9','C','Gsus4 G'],['F','G','Am','Am'],['C','G','Am','F']]),
'Lo-fi hip-hop':preset('暖色 maj7/m9、細碎小調 ii–V、短句留白與鬆動的後拍。','lofi','close',[['Dm9','G13','Cmaj9','A7b9'],['Fmaj9','Fm9','Em9','A7b9'],['Am9','D9','Gmaj9','Cmaj9']]),
'Chill':preset('慢速 add9/6/9、共同音延留與稀疏旋律；給聲部空間自然呼吸。','chill','open',[['Fmaj9','Cmaj9/E','Dm9','C69'],['Am9','Fmaj9','Cmaj9','G6'],['Cmaj9','D/C','Fmaj9/C','Cmaj9']]),
'Neo-soul':preset('半音接近、m11/maj9、backdoor 與平滑內聲部；不急著回到 I。','neosoul','rootless',[['Fm9','Bb13','Cmaj9','A7alt'],['Dm11','Db7#11','Cmaj9','B7alt'],['Fmaj9','Em9 A7alt','Dm11','G13']]),
'American pop':preset('I–V–vi–IV / vi–IV–I–V，加入 sus、轉位與偶爾 iv 借用。','pop','open',[['C','G/B','Am','Fadd9'],['Am','F','C','G'],['F','C','Dm7','G'],['C','Em','F','Fm']]),
'Mandopop':preset('級進低音、IV–iv、平行大小調與副歌前的次屬和弦。','ballad','open',[['Fmaj7','G','Em7 E7','Am7'],['C','G/B','Am C/G','F Fm'],['Dm7','G','Cmaj7','A7']]),
'K-pop':preset('R&B 的七九和弦、轉位與大小調借用，搭配切分的 pop groove。','rnb','open',[['Fmaj9','G13','Em7','Am9'],['Cmaj9/E','Fm9','Dm9','G13'],['Am9','D9','Gmaj9','Cmaj9']]),
'Major blues':preset('12 小節大調藍調：I7–IV7–V7、quick change 與 ii–V turnaround。選 12 bars 可聽完整曲式。','blues','close',[['C7','F7','C7','C7','F7','F7','C7','A7','Dm7','G7','C7 A7','Dm7 G7'],['C9','F9','C9','Gm7 C7','F9','F#dim7','C/G','A7b9','Dm9','G13','C9 A7','Dm9 G13'],['C7','F7','C7','C7','F7','Fm6','C/G','A7','Dm7','G7','C7','G7']]),
'Minor blues':preset('12 小節小調藍調：i–iv、♭VI–V 或 iiø–V–i；小調 ii–V 的解決。','blues','close',[['Cm7','Cm7','Cm7','Cm7','Fm7','Fm7','Cm7','Cm7','Ab7','G7b9','Cm6','Dm7b5 G7b9'],['Cm9','Fm9','Cm9','Cm9','Fm9','Fm9','Cm9','A7alt','Dm7b5','G7b9','Cm6','G7b9'],['Cm6','Cm6','Cm6','C7b9','Fm6','Fm6','Cm/G','Ab7','Dm7b5','G7b9','Cm6','Dm7b5 G7b9']]),
'Neoclassical rock':preset('古典戲劇搖滾：和聲小調、半音下降低音、踏板低音、次屬和弦與鋼琴 ostinato。','neoclassical','open',[['Cm','Cm/B','Cm/Bb','F/A','Ab','Eb/G','Dm7b5','G7b9'],['Cm','Ab','Fm','G7b9'],['Cm','G/B','Bb','F/A','Ab','Eb/G','Fm','G7']]),
'Nu-disco':preset('流動的七九和弦、Dorian／Mixolydian 與八度低音；輕盈切分。','disco','close',[['Dm9','G13','Cmaj9','A7'],['Am9','D9','Am9','G13'],['Fmaj9','Em7','Dm9','G13']]),
'Ambient':preset('長音、開放配置、共同音與緩慢調式變化。','ambient','open',[['Cmaj9','Fmaj9/C','D/C','Cmaj9'],['Am11','Fmaj9','Cmaj9','Gsus2'],['Fmaj9','G6','Am9','Cmaj9']])
});
styles.House=preset('Deep / Soulful House · 共同音九和弦、跨拍延留、稀疏切分與獨立低音。建議 114–124 BPM。','house','rootless',[['Am9','D9','Gmaj9','Cmaj9'],['Cm9','Fm9','Abmaj9','Gm9'],['Dm9','G13','Cmaj9','Fmaj9'],['Fm9','Abmaj9','Cm9','Bb13']]);
Object.assign(styles,darkStyles,worldStyles);
styles.Ballad=preset('鋼琴抒情：清楚的低音、柱式和弦與歌句留白。','pianoBallad','open',styles.Mandopop.phrases.map(p=>[...p]));
for(const study of harmonyStudies)for(const style of study.styles)styles[style].phrases.push([...study.medium]);
for(const [style,pattern] of Object.entries({Mandopop:'pianoBassReply','American pop':'pianoHalf','K-pop':'pianoKpop','Japanese rock':'pianoJpop'}))styles[style].pattern=pattern;
styles.Mandopop.description='1645、卡農下降低音、4536251；依變化強度加入目標明確的次屬、導音與 IV–iv。';
export const styleLabels={Mandopop:'Mandarin Pop · 華語流行',Ballad:'Pop Ballad · 抒情',...Object.fromEntries(Object.entries(darkStyles).map(([k,v])=>[k,v.label])),...Object.fromEntries(Object.entries(worldStyles).map(([k,v])=>[k,v.label])),'Neoclassical rock':'古典戲劇搖滾 · Neoclassical rock',House:'Deep / Soulful House','Major blues':'Major blues · 大調藍調','Minor blues':'Minor blues · 小調藍調'};
export function seeded(seed){let n=(seed+971)>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
// Each style owns its harmonic vocabulary; dominant function is not inferred for rock/pop V triads.
export const tintTables={
 Jazz:[['maj7','maj9','69'],['m7','m9','m11'],['7','9','13']],
 Gospel:[['69','maj9','maj7'],['m7','m9'],['7sus4','9','13']],
 Fusion:[['maj7#11','maj9#11'],['m9','m11','mMaj9'],['7#11','9','13']],
 'Bossa nova':[['69','maj7','maj9'],['m6','m9'],['7','13','7b9']],
 Rock:[['','5','sus2'],['m'],['7']],
 'Japanese rock':[['maj7','add9'],['m7'],['7','7sus4']],
 House:[['maj9','69'],['m9','m7'],['9','13']],
 Classical:[[''],['m'],['7']],
 'Phrygian dominant':[['','add9'],['m'],['7b9']],
 'Dorian folk':[['','6'],['m','m6'],['7']],
 Soul:[['6','69','maj7'],['m7','m9'],['9','13']],
 'R&B':[['maj9','maj7'],['m9','m11'],['9','7sus4']],
 Funk:[['9','13'],['m7','m9','m11'],['9','13']],
 EDM:[['add9','sus2',''],['m','madd9'],['7sus4']],
 'Lo-fi hip-hop':[['maj7','maj9'],['m7','m9'],['9','7b9']],
 Chill:[['add9','69','maj9'],['madd9','m9'],['7sus4','9']],
 'Neo-soul':[['maj9','maj13'],['m9','m11','m13'],['13','9','7alt']],
 'American pop':[['','add9','sus4'],['m','madd9'],['7','7sus4']],
 Mandopop:[['maj7','add9'],['m7','madd9'],['7','9']],
 'K-pop':[['maj9','maj7'],['m7','m9'],['13','7sus4']],
 'Major blues':[['7','9','13'],['m6','m7'],['7','9','13']],
 'Minor blues':[['7','9'],['m6','m7','m9'],['7','7b9']],
 'Neoclassical rock':[['','add9'],['m','madd9'],['7','7b9']],
 'Nu-disco':[['6','maj7','69'],['m7','m9'],['9','13']],
 Ambient:[['add9','maj9','maj7#11'],['m9','m11'],['7sus4','9sus4']]
};
tintTables.Ballad=tintTables.Mandopop;
export function tint(symbol,style,level,random,key=0,mode='major'){
 const c=parse(symbol);if(!c)return symbol;
 const slash=c.bassName?'/'+c.bassName:'';
 if(style==='American pop'&&mod(c.root-key)===5&&c.q==='sus4')return c.rootName+'sus2'+slash;
 if(styles[style]?.dark){
  let q=c.q;if(styles[style].heavy&&!q.includes('dim'))q='5';
  else if(!['5','sus2','sus4','dim','dim7','m7b5','7b9','add9','madd9'].includes(q)){q=c.minor?'m':c.intervals.includes(10)?'7':'';if(mode==='minor'&&mod(c.root-key)===0&&q==='')q='m';}
  return c.rootName+q+slash;
 }
 if(c.bassName&&!c.pcs.includes(c.bass)||/[b#()]/.test(c.q)||c.q==='m6'||/dim|sus|alt|Maj/.test(c.q)||c.q==='5')return spellChord(symbol);
 const table=tintTables[style]||tintTables.Jazz;
 const functional=['Jazz','Gospel','Bossa nova','Classical','Soul','R&B','Neo-soul','Lo-fi hip-hop','Mandopop','Ballad','K-pop'].includes(style);
 const dominant=!c.minor&&(c.intervals.includes(10)||functional&&mod(c.root-key)===7);
 let options=table[c.minor?1:dominant?2:0];
 if(style==='American pop'&&mod(c.root-key)===5)options=options.map(q=>q==='sus4'?'sus2':q);
 if(level==='low')options=options.slice(0,2);
 return c.rootName+options[Math.floor(random()*options.length)]+slash;
}
const isDominant=c=>c&&c.intervals.includes(4)&&c.intervals.includes(10);
export const cadenceTarget=symbol=>{const c=parse(symbol);return !!c&&!c.intervals.includes(6)&&!c.intervals.includes(8)&&c.intervals.some(n=>n===3||n===4);};
export function cadenceTo(target,{tritone=false,rich=false}={}){
 const c=parse(target);if(!cadenceTarget(target))return null;
 // Chromatic subV roots use a readable semitone neighbour, not Abb/Fb spellings.
 const dominant=tritone?spellPitch(c.root+1,c.root,'major'):spellInterval(c.rootName,7,4);
 return [spellInterval(c.rootName,2,1)+(c.minor?'m7b5':rich?'m9':'m7'),dominant+(tritone?(rich?'7#11':'7'):c.minor?'7b9':rich?'13':'7')];
}
function changeCore(c,rootName,q){
 const base=rootName+q,next=parse(base);if(!c.bassName)return base;
 const interval=mod(c.bass-c.root),index=c.intervals.findIndex(n=>mod(n)===interval);
 // Keep an inversion's chord degree; keep a non-chord pedal's absolute pitch.
 const tone=index>=0?chordTones(base)[Math.min(index,next.intervals.length-1)]:c.bassName;
 return base+'/'+tone;
}
export function minorizeChart(bars,key=0,{loop=true}={}){
 const timed=bars.flatMap((b,i)=>{let at=i*4;return chordList(b).map(c=>{const item={...c,start:at};at+=c.beats;return item;});}),original=timed,parsed=original.map(c=>parse(c.symbol));
 // Already-minor material (including harmonic-minor leading basses) is intentional.
 if(parsed.some(c=>c&&c.root===key&&c.minor))return structuredClone(bars);
 const converted=parsed.map((c,i)=>{
  if(!c||isDominant(c))return c?.symbol;
  const d=mod(c.root-key),next=parsed[i+1],prev=parsed[i-1];
  if(d===5&&((!c.minor&&next?.root===c.root&&next.minor)||(c.minor&&prev?.root===c.root&&!prev.minor)))return c.symbol;
  const extended=c.intervals.some(n=>n>=10),ninth=c.intervals.includes(14);
  let root=c.rootName,q=c.q;
  if(d===0&&!c.minor){q=ninth?'m9':extended?'m7':c.q==='5'?'5':'m';}
  else if(d===2&&c.minor)q=extended?'m7b5':'dim';
  else if((d===4||d===9)&&c.minor){root=spellPitch(c.root-1,key,'minor');q=ninth?'maj9':extended?'maj7':'';}
  else if(d===5&&!c.minor)q=ninth?'m9':extended?'m7':'m';
  else if(d===7&&!c.minor)q=extended?'7b9':c.q;
  return changeCore(c,root,q);
 });
 // Repair existing secondary-dominant chains backwards against the converted destination.
 for(let i=parsed.length-1;i>=0;i--){const nextIndex=i+1<parsed.length?i+1:loop?0:-1,c=parsed[i],target=parsed[nextIndex];
  if(nextIndex<0||!isDominant(c)||!target||mod(c.root+5)!==target.root)continue;
  if(nextIndex===0?timed[i].start+timed[i].beats!==bars.length*4||timed[0].start!==0:timed[i].start+timed[i].beats!==timed[nextIndex].start)continue;
  const result=parse(converted[nextIndex]);if(!result)continue;
  converted[i]=changeCore(c,spellInterval(result.rootName,7,4),result.minor?'7b9':c.q==='7sus4'?'7sus4':'7');
 }
 let at=0;return bars.map(b=>({...b,chords:chordList(b).map(c=>({...c,symbol:converted[at++]}))}));
}
const distance=(a,b)=>Math.min(mod(a-b),mod(b-a));
export function connectBass(bars,key=0){
 const out=structuredClone(bars),flat=out.flatMap(b=>b.chords);
 for(let i=1;i<flat.length-1;i++){
  const c=parse(flat[i].symbol),prev=parse(flat[i-1].symbol),next=parse(flat[i+1].symbol);
  if(!c||c.bassName||!prev||!next||/dim|sus/.test(c.q)||c.q==='5')continue;
  const original=distance(prev.bass,c.root)+distance(c.root,next.bass);
  const tones=chordTones(c.symbol);
  const choices=c.intervals.map((n,j)=>({pc:mod(c.root+n),name:tones[j],n})).filter(x=>[3,4,7].includes(x.n)&&!(x.n===7&&(mod(c.root-key)===7||isDominant(c))));
  choices.sort((a,b)=>(distance(prev.bass,a.pc)+distance(a.pc,next.bass))-(distance(prev.bass,b.pc)+distance(b.pc,next.bass)));
  const best=choices[0];if(best&&distance(prev.bass,best.pc)<=2&&distance(best.pc,next.bass)<=2&&distance(prev.bass,best.pc)+distance(best.pc,next.bass)<original)flat[i].symbol=c.rootName+c.q+'/'+best.name;
 }
 return out;
}
export function insertApproach(chords,target,options={}){
 const a=cadenceTo(target,options);if(!a||!chords.length)return chords;
 const last=chords.at(-1),tail=parse(last.symbol),goal=parse(target);
 if(isDominant(tail)&&[7,1].includes(mod(tail.root-goal.root)))return chords;
 const ii=parse(a[0]);
 // Reuse an existing ii, and split only the tail so earlier harmony is retained.
 if(chords.length===1&&tail.root===ii.root)return [{symbol:a[0],beats:last.beats/2},{symbol:a[1],beats:last.beats/2}];
 if(chords.length>1){
  if(parse(chords.at(-2).symbol).root===ii.root)return [...chords.slice(0,-1),{symbol:a[1],beats:last.beats}];
  if(chords.length>=3)return chords;
  return [...chords.slice(0,-1),{symbol:a[0],beats:last.beats/2},{symbol:a[1],beats:last.beats/2}];
 }
 return [{...last,beats:last.beats/2},{symbol:a[0],beats:last.beats/4},{symbol:a[1],beats:last.beats/4}];
}
export function reduceDensity(bars,{loop=true}={}){
 // Work backwards so every dominant resolves to the harmony actually retained next.
 const out=structuredClone(bars);
 for(let i=out.length-1;i>=0;i--){const cs=out[i].chords;if(!cs.length)continue;
  const next=i+1<out.length?out[i+1].chords[0]:loop?out[0].chords[0]:null,target=next&&parse(next.symbol);
  const dominant=target&&[...cs].reverse().find(c=>{const p=parse(c.symbol);return isDominant(p)&&[7,1].includes(mod(p.root-target.root));});
  out[i].chords=[{...(dominant||cs[0]),beats:4}];
 }
 return out;
}
export function mutate(source,{style='Jazz',key=0,mode='major',freedom='free',density=2,seed=0,randomness='medium',method='style',loop=true,ideaFamily='auto'}={}){
 if(method==='original')return structuredClone(source);
 const cfg=styles[style]||styles.Jazz,styleSeed=[...style].reduce((n,c)=>n+c.charCodeAt(0),0),random=seeded(seed+styleSeed),count=source.length||4,filled=source.some(b=>chordList(b).length),level=randomness;
 const songCandidates=songs.filter(s=>s.style===style&&s.mode===mode);
 const phrases=[...cfg.phrases,...(cfg.dark?cfg.contrasts.map(([,chart])=>chart.split('|')):[]),...songCandidates.map(s=>parseChart(s.chart).map(b=>b.chords.map(c=>c.symbol).join(' ')))];
 const phrase=phrases[((seed%phrases.length)+phrases.length)%phrases.length];
 const replace=method==='style'&&freedom==='free'&&level!=='low';
 const idea=method==='style'&&(!filled||replace)?learnedIdea({style,mode,randomness,seed,count,loop,family:ideaFamily}):null;
 if(idea){
  const learned=idea.phrase.map(bar=>({chords:parseBar(bar).map(c=>({...c,symbol:transposeSymbol(c.symbol,key,key,mode)})),reason:style+' · '+idea.title+' · '+idea.family,knowledgeId:idea.id}));
  // These complete phrases already contain their inversions and target cadences.
  // Random tinting/automatic bass rewriting would erase the concept being taught.
  return density===1?reduceDensity(learned,{loop}):learned;
 }
 let result=cfg.world?worldMutation(source,cfg,{key,seed,randomness,freedom,density,method}):Array.from({length:count},(_,i)=>{
  const input=chordList(source[i]||{}),rewrite=!filled||replace||!input.length;
  return {chords:rewrite?parseBar(phrase[i%phrase.length]).map(c=>({...c,symbol:transpose(c.symbol,key)})):structuredClone(input),reason:style+' · '+(rewrite?'句型重構':'保留根音上色')};
 });
 // Develop repeated dark studies with a style-specific eighth-bar response.
 if(cfg.dark&&count>=8&&phrase.length<=4&&(!filled||replace)){
  const endings={ 'Heavy Metal':['Bb5','G5'],'Doom Metal':['Db5','C5'],Grunge:['Bb5','C5'],Alternative:['Fm','C'],Gothic:['Fm','G7'],Requiem:['G7b9','Cm'] };
  for(let i=7;i<count;i+=8){let ending=endings[style];
   if(!loop&&i===count-1)ending=[ending[0],cfg.heavy?'C5':'Cm'];
   const chords=ending.map(symbol=>({symbol:transpose(symbol,key),beats:2}));
   if(JSON.stringify(chords)===JSON.stringify(result[i].chords)){chords[0].beats=3;chords[1].beats=1;}
   result[i]={chords,reason:style+' · 八小節收尾'};
  }
 }
 const tonal=!cfg.world&&!cfg.dark&&!['Minor blues','Major blues','Neoclassical rock','Dorian folk','Phrygian dominant'].includes(style);
 if(tonal&&count>=8&&phrase.length<=4&&(!filled||replace)){
  // A–A′: half cadence, a new departure, then tonic/turnaround. Long authored blues forms are untouched.
  for(let i=3;i<count;i+=4){const last=i===count-1,root=last&&!loop?0:7,q=root===7&&['Jazz','Gospel','Classical','Bossa nova'].includes(style)?'7':'';result[i].chords=[{symbol:transpose((root===7?'G':'C')+q,key),beats:4}];}
  for(let i=4;i<count;i+=4)result[i].chords=[{symbol:transpose(mod(parse(result[0].chords[0].symbol).root-key)===5?'Am':i%8===4?'F':'Am',key),beats:4}];
 }
 if(tonal&&mode==='minor')result=minorizeChart(result,key,{loop});
 if(!cfg.world)result=result.map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:cfg.dark&&(!filled||replace)?c.symbol:tint(c.symbol,style,level,random,key,mode)}))}));
 if(!cfg.world&&!cfg.dark&&method==='style')result=connectBass(result,key);
 if(density===1)result=reduceDensity(result,{loop});
 for(let i=0;i<count;i++){
  if(i===count-1&&!loop)continue;
  const target=result[(i+1)%count].chords[0]?.symbol,cs=result[i].chords;
  const requested=['cadence','tritone'].includes(method),jazzy=['Jazz','Gospel','Bossa nova','R&B','Neo-soul','Lo-fi hip-hop'].includes(style);
  const insert=requested||method==='style'&&density===3&&jazzy&&random()<.65;
  if(!insert||!cadenceTarget(target))continue;
  const options={tritone:method==='tritone'||method==='style'&&level==='high'&&random()<.25,rich:level!=='low'&&random()<.6};
  if(density!==1){const next=insertApproach(cs,target,options);if(next!==cs)result[i]={...result[i],chords:next,reason:(options.tritone?'ii–subV':'ii–V')+' → '+target};}
  else if(requested&&i%2===1)result[i]={chords:[{symbol:cadenceTo(target,options)[1],beats:4}],reason:'屬和弦 → '+target};
 }
 return result;
}
export const library=[
{id:'autumn',title:'Ex1',key:10,mode:'major',style:'Jazz',chart:'| Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm6 | Gm6 |'},
{id:'rhythm',title:'Ex2',key:10,mode:'major',style:'Jazz',chart:'| Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Edim7 | Bb/F G7 | Cm7 F7 |'},
{id:'blues',title:'Ex3',key:5,mode:'major',style:'Jazz',chart:'| F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | D7b9 | Gm7 | C7 | F7 D7 | Gm7 C7 |'},
{id:'canon',title:'Ex4',key:2,mode:'major',style:'Classical',chart:'| D | A/C# | Bm | F#m/A | G | D/F# | G | A |'},
{id:'royal',title:'Ex5',key:0,mode:'major',style:'Japanese rock',chart:'| Fmaj7 | G | Em7 | Am7 |'},
{id:'bossa',title:'Ex6',key:0,mode:'major',style:'Bossa nova',chart:'| C69 A7b9 | Dm9 G13 | Em7 Ebdim7 | Dm9 G7b9 |'},
{id:'house',title:'Ex7',key:0,mode:'minor',style:'House',chart:'| Cm9 | Abmaj9 | Fm9 | Bb13 |'}
];
