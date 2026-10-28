import {parse,mod,analyzeHarmony} from './music.js?v=morph-1';
import {worldScales} from './world-styles.js?v=17';

export function styleTonality(style,cfg,key){
 const modes={'Dorian folk':'dorian','Phrygian dominant':'hijaz','Major blues':'major-blues','Minor blues':'minor-blues'};
 return {...key,mode:cfg.world?cfg.scaleIds[0]:modes[style]||key.mode};
}
export function harmonicFunction(symbol,key){
 const c=parse(symbol);if(!c)return 'rest';const d=mod(c.root-key.root);
 if(d===0||[3,4,8,9].includes(d))return 'T';
 if([2,5].includes(d))return 'S';
 if(d===7||d===11&&c.intervals.includes(6))return 'D';
 if(d===1&&c.intervals.includes(4)&&c.intervals.includes(10))return 'D';
 // Borrowed bVII is a backdoor dominant, bII is predominant.
 if(d===10)return 'D';if(d===1)return 'S';return 'X'+d;
}
export function anchoredMutation(source,options,tools){
 const {style='Jazz',seed=0,randomness='medium',method='style',tonality:key}=options;
 const cfg=tools.styles[style]||tools.styles.Jazz,level=randomness;
 const count=source.reduce((n,b)=>n+b.chords.length,0),styleSeed=[...style].reduce((n,c)=>n+c.charCodeAt(0),0);
 const modal=cfg.world||['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(style);
 const dancePalette={'Amapiano':[['maj7','maj9','69'],['m7','m9'],['7','9']],Reggaeton:[['','add9','6'],['m','madd9','m7'],['7']],Dancehall:[['','6','add9'],['m','m7','madd9'],['7']], 'Latin Pop':[['','add9','maj7'],['m','m7','madd9'],['7','9']]}[style];
 const scaleId=(dancePalette&&['major','minor'].includes(key.mode)?key.mode:null)||cfg.scaleIds?.[0]||({'Dorian folk':'dorian','Phrygian dominant':'hijaz'})[style];
 const allowed=worldScales[scaleId]?.intervals.map(n=>mod(n+key.root));
 const modalPalette=cfg.world?cfg.phrases.flatMap(p=>p.flatMap(bar=>bar.split(/\s+/).map(s=>parse(s.replace(/:[\d.]+$/,''))))).filter(Boolean):[];
 const analysis=analyzeHarmony(source,key,{loop:options.loop!==false}).events;
 const start=((seed%Math.max(1,count))+Math.max(1,count))%Math.max(1,count);
 const color=(symbol,index,rich=false)=>{
  const c=parse(symbol);let output=symbol;
  let mix=(Math.imul(seed+1,2654435761)+styleSeed+index*65537)>>>0;
  mix=Math.imul(mix^(mix>>>16),2246822507);mix=Math.imul(mix^(mix>>>13),3266489909);
  const random=tools.seeded(mix^(mix>>>16));
  if(cfg.world){
   let choices=modalPalette.filter(p=>mod(p.root+key.root)===c.root).map(p=>c.rootName+p.q+(c.bassName?'/'+c.bassName:''))
    .filter(s=>!allowed||parse(s).pcs.every(n=>allowed.includes(n)));
   if(dancePalette){
    const family=c.minor?1:c.intervals.includes(10)||analysis[index]?.relation==='dominant'||analysis[index]?.impliedTonic?2:0;
    choices=[...new Set([...choices,...dancePalette[family].map(q=>c.rootName+q+(c.bassName?'/'+c.bassName:''))])].filter(s=>!allowed||parse(s).pcs.every(n=>allowed.includes(n)));
   }
   if(choices.length)output=choices[(seed+index+choices.length*1000)%choices.length];
  }else{
   // Use the same functional analysis as KEY and degree labels. An applied
   // dominant triad must not acquire a major seventh when it is coloured.
   const role=analysis[index],dominant=role?.relation==='dominant'||role?.impliedTonic;
   const basis=!modal&&dominant&&c.intervals.includes(4)&&!c.intervals.includes(10)&&!c.intervals.includes(11)?c.rootName+'7'+(c.bassName?'/'+c.bassName:''):symbol;
   output=tools.tint(basis,style,rich?'high':level,random,key.root,key.mode);
   if(allowed&&!parse(output).pcs.every(n=>allowed.includes(n)))output=symbol;
  }
  // A style never silently converts an authored major/minor chord or pedal.
  if(c.minor!==parse(output).minor&&c.intervals.some(n=>n===3||n===4))output=symbol;
  return output;
 };
 // Extensions may change, but authored roots, slash basses and chord families do not.
 const family=c=>c.intervals.includes(3)?(c.intervals.includes(6)?'diminished':'minor'):c.intervals.includes(4)?(c.intervals.includes(8)?'augmented':'major'):'suspended';
 const paint=(symbol,i)=>{
  const original=parse(symbol);let candidate=parse(color(symbol,i,level==='high'));
  const role=analysis[i],dominant=role?.relation==='dominant'||role?.impliedTonic;
  const minorTarget=role?.target!=null?analysis[role.target].minor:role?.impliedTonic?.mode==='minor';
  if(dominant&&!original.intervals.includes(11)&&candidate?.intervals.includes(11))return symbol;
  if(original.minor&&!original.intervals.includes(11)&&candidate?.intervals.includes(11))return symbol;
  if(dominant&&minorTarget&&original.intervals.includes(4)&&[14,21].some(n=>candidate?.intervals.includes(n)&&!original.intervals.includes(n)))
   candidate=parse(original.rootName+((seed+i)%2?'7b9':'7b13')+(original.bassName?'/'+original.bassName:''));
  if(!candidate||candidate.root!==original.root)return symbol;
  if(family(candidate)!==family(original)&&family(candidate)!=='suspended')return symbol;
  // Existing sevenths carry function; never turn maj7 into dominant or vice versa.
  if([10,11].some(n=>original.intervals.includes(n)&&!candidate.intervals.includes(n)))return symbol;
  return candidate.rootName+candidate.q+(original.bassName?'/'+original.bassName:'');
 };
 const requested=['cadence','tritone'].includes(method);
 const jazzLike=['Jazz','Gospel','Fusion','Bossa nova','Soul','R&B','Lo-fi hip-hop','Neo-soul','Mandopop','Ballad','K-pop','Nu-disco','Classical','Japanese rock','American pop','Chill'].includes(style);
 const limit=Math.max(1,Math.min(3,Number(options.density)||2));
 const approaches=!modal&&options.freedom!=='color'&&method!=='color'&&(requested||jazzLike);
 let ordinal=0;
 return source.map((bar,barIndex)=>{
  let room=Math.max(0,limit-bar.chords.length);
  const chords=bar.chords.flatMap((c,j)=>{
   const i=ordinal++,selected=(i-start+count)%count<Math.max(1,Math.floor(count/4));
   const anchor={...c,symbol:level==='low'&&!selected?c.symbol:paint(c.symbol,i)};
   const next=bar.chords[j+1]||source[barIndex+1]?.chords[0]||(barIndex===source.length-1&&options.loop!==false?source[0]?.chords[0]:null);
   // Never skip a rest or replace an existing resolving dominant/leading tone.
   const current=parse(c.symbol),target=next&&parse(next.symbol),distance=target&&mod(current.root-target.root);
   const resolved=target&&(distance===0||[1,7].includes(distance)&&current.intervals.includes(10)||distance===11&&current.intervals.includes(6));
   if(!approaches||!room||!target||resolved||c.beats<2||(!requested&&(level==='low'||level==='medium'&&(seed+i)%3!==0)))return [anchor];
   const cadence=tools.cadenceTo(next.symbol,{tritone:method==='tritone'||method==='style'&&level==='high'&&(seed+i)%3===0,rich:level!=='low'});
   if(!cadence)return [anchor];
   // Keep at least 75% of each authored chord; approach only within its tail.
   // ii–V is available when there is room; an existing ii needs only its V.
   const tail=c.beats*(level==='medium'&&!requested?1/8:1/4);
   const pair=room>=2&&tail>=1&&parse(cadence[0]).root!==current.root&&(requested||level==='high');
   const additions=pair?cadence:[cadence[1]];room-=additions.length;
   return [{...anchor,beats:c.beats-tail},...additions.map(symbol=>({symbol,beats:tail/additions.length}))];
  });
  return {...bar,chords,reason:style+' · 保留骨幹／'+(chords.length>bar.chords.length?'色彩與目標接近':'和弦色彩')};
 });
}
