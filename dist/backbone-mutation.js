import {morphProfiles,morphRandom,techniqueChoice,openingTonicChoice} from './morph-profiles.js?v=1.0.7';
import {parse,mod,analyzeHarmony} from './music.js?v=1.0.7';
import {parallelDegreeChord,invertForMorph} from './morph-techniques.js?v=1.0.7';
import {worldScales} from './world-styles.js?v=1.0.7';

export function styleTonality(style,cfg,key){
 const modes={'Dorian folk':'dorian','Phrygian dominant':'hijaz','Major blues':'major-blues','Minor blues':'minor-blues'};
 const tonalDance=['Reggaeton','Dancehall','Latin Pop','Amapiano'].includes(style);
 return {...key,mode:cfg.world&&!tonalDance?cfg.scaleIds[0]:modes[style]||key.mode};
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
 const functional=analyzeHarmony(source,key,{loop:options.loop!==false}),analysis=functional.events;
 const allowedChange=(original,candidate)=>!modal||!allowed||(
  [...candidate.pcs,candidate.bass].every(n=>allowed.includes(n)||original.pcs.includes(n)||n===original.bass)&&
  original.pcs.filter(n=>!allowed.includes(n)).every(n=>candidate.pcs.includes(n)||candidate.bass===n)
 );
 const start=((seed%Math.max(1,count))+Math.max(1,count))%Math.max(1,count);
 const color=(symbol,index,rich=false)=>{
  const c=parse(symbol);let output=symbol;
  let mix=(Math.imul(seed+1,2654435761)+styleSeed+index*65537)>>>0;
  mix=Math.imul(mix^(mix>>>16),2246822507);mix=Math.imul(mix^(mix>>>13),3266489909);
  const random=tools.seeded(mix^(mix>>>16));
  if(cfg.world){
   let choices=modalPalette.filter(p=>mod(p.root+key.root)===c.root).map(p=>c.rootName+p.q+(c.bassName?'/'+c.bassName:''))
    .filter(s=>allowedChange(c,parse(s)));
   // Sparse regional examples may contain no chord on this authored root.
   // Reuse their existing colour vocabulary only when it retains the source
   // core and introduces no notes outside this slot's permitted collection.
   if(new Set(choices).size<=1){
    const core=c.intervals.filter(n=>[3,4,6,7,8,10,11].includes(n));
    choices.push(...modalPalette.map(p=>c.rootName+p.q+(c.bassName?'/'+c.bassName:''))
     .filter(s=>{const p=parse(s);return p.minor===c.minor&&core.every(n=>p.intervals.includes(n))&&allowedChange(c,p);}));
   }
   if(dancePalette){
    const family=c.minor?1:c.intervals.includes(10)||analysis[index]?.relation==='dominant'||analysis[index]?.impliedTonic?2:0;
    choices=[...new Set([...choices,...dancePalette[family].map(q=>c.rootName+q+(c.bassName?'/'+c.bassName:''))])].filter(s=>allowedChange(c,parse(s)));
   }
   // The authored harmony is also a valid colour. Do not force a single
   // palette extension on every seed (e.g. Slack-key G -> G7 every time).
   choices=[...new Set([symbol,...choices])];
   if(choices.length)output=choices[Math.floor(morphRandom(seed,index,style,4)*choices.length)];
  }else{
   // Use the same functional analysis as KEY and degree labels. An applied
   // dominant triad must not acquire a major seventh when it is coloured.
   const role=analysis[index],dominant=role?.relation==='dominant'||role?.impliedTonic;
   const basis=!modal&&dominant&&c.intervals.includes(4)&&!c.intervals.includes(10)&&!c.intervals.includes(11)?c.rootName+'7'+(c.bassName?'/'+c.bassName:''):symbol;
   output=tools.tint(basis,style,rich?'high':level,random,key.root,key.mode);
   if(!allowedChange(c,parse(output)))output=symbol;
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
  if(role?.relation==='dominant'&&!candidate?.intervals.includes(4))return symbol;
  if(dominant&&!original.intervals.includes(11)&&candidate?.intervals.includes(11))return symbol;
  if(original.minor&&!original.intervals.includes(11)&&candidate?.intervals.includes(11))return symbol;
  if(dominant&&minorTarget&&original.intervals.includes(4)&&[14,21].some(n=>candidate?.intervals.includes(n)&&!original.intervals.includes(n)))
   candidate=parse(original.rootName+((seed+i)%2?'7b9':'7b13')+(original.bassName?'/'+original.bassName:''));
  if(!candidate||candidate.root!==original.root||!allowedChange(original,candidate))return symbol;
  if(family(candidate)!==family(original)&&family(candidate)!=='suspended')return symbol;
  // Existing sevenths carry function; never turn maj7 into dominant or vice versa.
  if([10,11].some(n=>original.intervals.includes(n)&&!candidate.intervals.includes(n)))return symbol;
  return candidate.rootName+candidate.q+(original.bassName?'/'+original.bassName:'');
 };
 const profile=morphProfiles[style]||morphProfiles.Jazz;
 const requested=['cadence','tritone'].includes(method);
 const limit=Math.max(1,Math.min(3,Number(options.density)||2));
 const techniques=options.techniques||{};
 const preserveBass=options.preserveBass===true;
 const approaches=techniques.iiV!==false&&!preserveBass&&!modal&&options.freedom!=='color'&&method!=='color'&&(requested||profile[2]>0||profile[3]>0);
 // Every generated event carries a source address, even after degree storage.
 const plans=[];
 source.forEach((bar,barIndex)=>{let onset=0;bar.chords.forEach((c,chord)=>{
  const i=plans.length,selected=(i-start+count)%count<Math.max(1,Math.floor(count/4));
  plans.push({original:c,bar:barIndex,chord,onset,symbol:level==='low'&&!selected?c.symbol:paint(c.symbol,i),technique:'color'});
  onset+=c.beats;
 });});
 const mutable=options.freedom!=='color'&&method==='style';
 const budget=mutable?Math.floor(count*({low:0,medium:.25,high:.6}[level]??.25)):0;
 const cadenceArrival=analysis.findLast(row=>row.cadence);
 const arrivalIndex=cadenceArrival?(cadenceArrival.index+1)%count:count-1;
 const protectedTargets=new Set([count-1,arrivalIndex]); // Include the actual cadence arrival, including loop I.
 // Retain every functional arrival, including the loop boundary. A dominant
 // may be coloured/inverted or expanded to ii–V, but cannot become parallel v.
 const dominantSources=new Set();
 for(const row of analysis)if(row.relation==='dominant'&&row.target!=null){protectedTargets.add(row.target);dominantSources.add(row.index);}
 const signatures=new Set();
 const sameBarIv=(i)=>{
  const next=(i+1)%count,a=analysis[i],b=analysis[next];
  return i+1<count&&b&&plans[i].bar===plans[next].bar&&a.offset===5&&!a.minor&&b.offset===5&&b.minor;
 };
 for(let i=0;i<analysis.length;i++){
  const a=analysis[i],b=analysis[i+1]||(options.loop!==false?analysis[0]:null);
  if(b&&((a.offset===5&&!a.minor&&b.offset===5&&b.minor&&!sameBarIv(i))||(key.mode==='minor'&&a.offset===8&&b.offset===7&&b.intervals.includes(4)))){signatures.add(i);signatures.add((i+1)%count);}
  if((functional.blues||style.includes('blues'))&&a.offset===5&&a.intervals.includes(10))signatures.add(i);
 }
 for(const i of signatures){protectedTargets.add(i);plans[i].symbol=plans[i].original.symbol;plans[i].technique='retained-target';}
 const retainedSymbol=(p,i)=>style==='Jazz'&&!signatures.has(i)?paint(p.original.symbol,i):p.original.symbol;
 // Retained arrivals must be settled before checking neighbouring candidates.
 if(plans.length&&mutable&&level!=='low')for(const index of protectedTargets){const target=plans[index];target.symbol=retainedSymbol(target,index);target.technique='retained-target';}
 const duplicatesNeighbour=(i,symbol)=>[plans[i-1],plans[i+1]].some(other=>other&&other.bar===plans[i].bar&&!other.replacement&&other.original.symbol!==plans[i].original.symbol&&other.symbol===symbol&&!(other===plans[i+1]&&sameBarIv(i)));
 let used=0;const reserved=new Map();
 for(let n=0;n<count&&used<budget;n++){
  const i=(start+n)%count,p=plans[i];
  if(protectedTargets.has(i))continue;
  const next=plans[i+1]||(options.loop!==false?plans[0]:null);
  const adjacent=next&&(next.bar===p.bar||next.bar===p.bar+1&&next.chord===0||p.bar===source.length-1&&next.bar===0);
  const choice=i===0&&parse(p.original.symbol).root===key.root?openingTonicChoice(style,seed):techniqueChoice(style,seed,i);
  const parallel=modal||techniques.parallel===false||dominantSources.has(i)?null:parallelDegreeChord(p.original.symbol,key);
  const cadence=adjacent&&tools.cadenceTo(next.original.symbol,{rich:level==='high'});
  const previous=plans[i-1]||(options.loop!==false?plans.at(-1):null);
  const redundantII=cadence&&previous&&[previous.original.symbol,previous.replacement?.at(-1)||previous.symbol].some(s=>parse(s).root===parse(cadence[0]).root);
  const room=limit-source[p.bar].chords.length-(reserved.get(p.bar)||0);
  if(choice===2&&!redundantII&&['color','retained-target'].includes(next?.technique)&&approaches&&cadence&&p.original.beats>=2&&room>=1&&next!==p){
   // Replace this slot by ii–V, then retain the NEXT authored target’s root and core.
   // Never create two neighbouring approaches with the same root.
   p.replacement=cadence;p.technique='ii-V';p.target=next;reserved.set(p.bar,(reserved.get(p.bar)||0)+1);
   next.symbol=retainedSymbol(next,plans.indexOf(next));next.technique='retained-target';
   protectedTargets.add(plans.indexOf(next));used++;
  }else if(choice===1&&parallel&&!duplicatesNeighbour(i,parallel)){
   p.symbol=parallel;p.technique=parallel===p.original.symbol?'retained-target':'parallel';if(p.technique==='parallel')used++;
  }else{
   const inverted=preserveBass||techniques.inversion===false?p.symbol:invertForMorph(p.symbol,Math.floor(morphRandom(seed,i,style,5)*0x1000000),{powerBass:['Heavy Metal','Doom Metal'].includes(style)});
   if(inverted!==p.symbol&&!duplicatesNeighbour(i,inverted)){p.symbol=inverted;p.technique='inversion';used++;}
  }
 }
 // Validate against the final preceding harmony, not only the authored root.
 for(let i=0;i<plans.length;i++){
  const p=plans[i],previous=plans[i-1]||(options.loop!==false?plans.at(-1):null);
  if(p.replacement&&previous&&parse(previous.replacement?.at(-1)||previous.symbol).root===parse(p.replacement[0]).root){
   p.replacement=null;p.technique='color';p.symbol=paint(p.original.symbol,i);
   reserved.set(p.bar,(reserved.get(p.bar)||0)-1);
  }
 }
 // Colour/inversion must not collapse distinct authored neighbours.
 for(let i=1;i<plans.length;i++){const a=plans[i-1],b=plans[i];if(a.bar===b.bar&&!a.replacement&&!b.replacement&&a.symbol===b.symbol&&a.original.symbol!==b.original.symbol&&!sameBarIv(i-1)){a.symbol=a.original.symbol;b.symbol=b.original.symbol;a.technique=b.technique='retained-target';}}
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
   if(!approaches||!room||!target||resolved||changedTarget||c.beats<2||(!requested&&(level==='low'||morphRandom(seed,i,style,1)>profile[3]*(level==='medium'?.5:1))))return [anchor];
   const cadence=tools.cadenceTo(next.symbol,{tritone:method==='tritone'||method==='style'&&level==='high'&&morphRandom(seed,i,style,2)<profile[4],rich:level!=='low'});
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

// Diagnostic only: authored conflicts are permitted by the round-3 MORPH contract.
export function modalConflict(source,style,cfg,key){
 const modal=cfg.world||['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(style);
 if(!modal)return null;
 const scale=worldScales[key.mode]||worldScales[cfg.scaleIds?.[0]];
 if(!scale)return null;
 const allowed=scale.intervals.map(n=>mod(n+key.root));
 const chord=source.flatMap(b=>b.chords).find(c=>{const p=parse(c.symbol);return !p.pcs.every(n=>allowed.includes(n))||!allowed.includes(p.bass);});
 return chord?{symbol:chord.symbol,scale:key.mode}:null;
}
