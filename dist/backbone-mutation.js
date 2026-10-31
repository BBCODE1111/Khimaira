import {parse,mod,analyzeHarmony} from './music.js?v=1.0.3';
import {parallelDegreeChord,invertForMorph} from './morph-techniques.js?v=1.0.3';
import {worldScales} from './world-styles.js?v=1.0.3';

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
  // Colour alone preserves minor identity; deliberate parallel conversion is separate.
  if(c.minor!==parse(output).minor&&c.intervals.some(n=>n===3||n===4))output=symbol;
  return output;
 };
 // Colour preserves authored roots and basses; approved mapped techniques follow below.
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
 // Every generated event carries a source address, even after degree storage.
 const plans=[];
 source.forEach((bar,barIndex)=>{let onset=0;bar.chords.forEach((c,chord)=>{
  const i=plans.length,selected=(i-start+count)%count<Math.max(1,Math.floor(count/4));
  plans.push({original:c,bar:barIndex,chord,onset,symbol:level==='low'&&!selected?c.symbol:paint(c.symbol,i),technique:'color'});
  onset+=c.beats;
 });});
 const mutable=!modal&&options.freedom!=='color'&&method==='style';
 const budget=mutable?Math.floor(count*({low:0,medium:.25,high:.6}[level]??.25)):0;
 const cadenceArrival=analysis.findLast(row=>row.cadence);
 const arrivalIndex=cadenceArrival?(cadenceArrival.index+1)%count:count-1;
 const protectedTargets=new Set([count-1,arrivalIndex]); // Include the actual cadence arrival, including loop I.
 let used=0;const reserved=new Map();
 for(let n=0;n<count&&used<budget;n++){
  const i=(start+n)%count,p=plans[i];
  if(protectedTargets.has(i))continue;
  const next=plans[i+1]||(options.loop!==false?plans[0]:null);
  const adjacent=next&&(next.bar===p.bar||next.bar===p.bar+1&&next.chord===0||p.bar===source.length-1&&next.bar===0);
  const choice=(seed+i)%3;
  const parallel=parallelDegreeChord(p.original.symbol,key);
  const cadence=adjacent&&tools.cadenceTo(next.original.symbol,{rich:level==='high'});
  const room=limit-source[p.bar].chords.length-(reserved.get(p.bar)||0);
  if(choice===2&&next?.technique==='color'&&approaches&&cadence&&p.original.beats>=2&&room>=1&&next!==p){
   // Replace this slot by ii–V, then retain the NEXT authored target literally.
   // Never create two neighbouring approaches with the same root.
   p.replacement=cadence;p.technique='ii-V';p.target=next;reserved.set(p.bar,(reserved.get(p.bar)||0)+1);
   next.symbol=next.original.symbol;next.technique='retained-target';
   protectedTargets.add(plans.indexOf(next));used++;
  }else if(choice===1&&parallel){
   p.symbol=parallel;p.technique='parallel';used++;
  }else{
   const inverted=invertForMorph(p.symbol);
   if(inverted!==p.symbol){p.symbol=inverted;p.technique='inversion';used++;}
  }
 }
 // Protect the final target from colour that removes its third.
 if(plans.length&&mutable&&level!=='low')for(const index of [count-1,arrivalIndex]){const target=plans[index];target.symbol=target.original.symbol;target.technique='retained-target';}
 const address=p=>({bar:p.bar,chord:p.chord,onset:p.onset});
 let ordinal=0;
 return source.map((bar,barIndex)=>{
  let room=Math.max(0,limit-bar.chords.length-(reserved.get(barIndex)||0));
  const chords=bar.chords.flatMap((c,j)=>{
   const i=ordinal++,p=plans[i],mapping={source:address(p),technique:p.technique};
   if(p.replacement){
    return p.replacement.map((symbol,k)=>({symbol,beats:c.beats/2,morph:{...mapping,part:k===0?'ii':'V',target:address(p.target)}}));
   }
   const anchor={...c,symbol:p.symbol,morph:mapping};
   const next=bar.chords[j+1]||source[barIndex+1]?.chords[0]||(barIndex===source.length-1&&options.loop!==false?source[0]?.chords[0]:null);
   const targetPlan=next?(plans[i+1]||plans[0]):null;
   const current=parse(p.symbol),target=next&&parse(next.symbol),distance=target&&mod(current.root-target.root);
   const resolved=target&&(distance===0||distance===7&&(current.intervals.includes(4)||current.intervals.includes(10))||distance===1&&current.intervals.includes(10)||distance===11&&current.intervals.includes(6));
   // A borrowed/replaced next slot is not the original resolving target.
   const changedTarget=targetPlan&&(targetPlan.replacement||['parallel','inversion'].includes(targetPlan.technique));
   if(!approaches||!room||!target||resolved||changedTarget||c.beats<2||(!requested&&(level==='low'||level==='medium'&&(seed+i)%3!==0)))return [anchor];
   const cadence=tools.cadenceTo(next.symbol,{tritone:method==='tritone'||method==='style'&&level==='high'&&(seed+i)%3===0,rich:level!=='low'});
   if(!cadence)return [anchor];
   const tail=c.beats*(level==='medium'&&!requested?1/8:1/4);
   const pair=room>=2&&tail>=1&&parse(cadence[0]).root!==current.root&&(requested||level==='high');
   const additions=pair?cadence:[cadence[1]];
   if(parse(additions[0]).root===current.root)return [anchor];
   room-=additions.length;
   return [{...anchor,beats:c.beats-tail},...additions.map(symbol=>({symbol,beats:tail/additions.length,morph:{source:address(p),technique:'approach',target:address(targetPlan)}}))];
  });
  return {...bar,chords,reason:style+' · 骨幹對應／色彩、轉位與目標接近'};
 });
}

export function modalConflict(source,style,cfg,key){
 const modal=cfg.world||['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(style);
 if(!modal)return null;
 const scale=worldScales[key.mode]||worldScales[cfg.scaleIds?.[0]];
 if(!scale)return null;
 const allowed=scale.intervals.map(n=>mod(n+key.root));
 const chord=source.flatMap(b=>b.chords).find(c=>{const p=parse(c.symbol);return !p.pcs.every(n=>allowed.includes(n))||!allowed.includes(p.bass);});
 return chord?{symbol:chord.symbol,scale:key.mode}:null;
}
