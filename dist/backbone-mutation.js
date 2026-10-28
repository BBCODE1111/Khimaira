import {parse,mod,chordTones,spellPitch} from './music.js?v=key-functional-1';
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
function inverse(symbol,n){
 const c=parse(symbol),tones=chordTones(symbol).filter((_,i)=>c.intervals[i]<12);
 if(!tones.length)return symbol;
 // Keep a non-chord pedal: it is part of the authored harmonic identity.
 if(c.bassName&&!c.pcs.includes(c.bass))return symbol;
 const bass=tones[((n%tones.length)+tones.length)%tones.length];
 return c.rootName+c.q+(parse(bass).root===c.root?'':'/'+bass);
}
function signature(bars){return bars.map(b=>b.chords.map(c=>c.symbol+':'+c.beats).join(' ')).join('|');}
export function anchoredMutation(source,options,tools){
 const {style='Jazz',seed=0,randomness='medium',method='style',tonality:key}=options;
 const cfg=tools.styles[style]||tools.styles.Jazz,level=randomness;
 const count=source.reduce((n,b)=>n+b.chords.length,0),styleSeed=[...style].reduce((n,c)=>n+c.charCodeAt(0),0);
 const modal=cfg.world||['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(style);
 const scaleId=cfg.scaleIds?.[0]||({'Dorian folk':'dorian','Phrygian dominant':'hijaz'})[style];
 const allowed=worldScales[scaleId]?.intervals.map(n=>mod(n+key.root));
 const modalPalette=cfg.world?cfg.phrases.flatMap(p=>p.flatMap(bar=>bar.split(/\s+/).map(s=>parse(s.replace(/:[\d.]+$/,''))))).filter(Boolean):[];
 const start=((seed%Math.max(1,count))+Math.max(1,count))%Math.max(1,count);
 const color=(symbol,index,rich=false)=>{
  const c=parse(symbol);let output=symbol;
  const random=tools.seeded(Math.imul(seed+1,2654435761)+styleSeed+index*65537);
  if(cfg.world){
   const choices=modalPalette.filter(p=>mod(p.root+key.root)===c.root).map(p=>c.rootName+p.q+(c.bassName?'/'+c.bassName:''))
    .filter(s=>!allowed||parse(s).pcs.every(n=>allowed.includes(n)));
   if(choices.length)output=choices[(seed+index+choices.length*1000)%choices.length];
  }else{
   output=tools.tint(symbol,style,rich?'high':level,random,key.root,key.mode);
   if(allowed&&!parse(output).pcs.every(n=>allowed.includes(n)))output=symbol;
  }
  // A style never silently converts an authored major/minor chord or pedal.
  if(c.minor!==parse(output).minor&&c.intervals.some(n=>n===3||n===4))output=symbol;
  return output;
 };
 let ordinal=0;
 const result=source.map((bar,barIndex)=>{
  const chords=bar.chords.map(c=>{
   const i=ordinal++,selected=(i-start+count)%count<Math.max(1,Math.floor(count/4));
   if(level==='low'&&!selected)return {...c};
   let symbol=color(c.symbol,i,level==='high');
   // LOW develops one quarter of the chart; MEDIUM colors the full chart.
   if(level!=='low'||symbol===c.symbol)symbol=inverse(symbol,seed+i+1);
   return {...c,symbol};
  });
  if(level==='low'||!chords.length)return {chords,reason:style+' · 骨幹色彩'};
  // Functional substitutions only inside the phrase, never its entrance/end.
  if(!modal&&method!=='color'&&options.freedom!=='color'&&barIndex>0&&barIndex<source.length-1&&barIndex%4!==3&&(barIndex+seed)%2===0){
   const original=parse(chords[0].symbol),d=mod(original.root-key.root),minor=key.mode==='minor';
   const substitutes=minor?{0:[3,''],3:[0,'m'],5:[2,'m7b5'],8:[5,'m']}:{0:[9,'m'],9:[0,''],4:[0,''],5:[2,'m'],2:[5,'']};
   const sub=substitutes[d];
   if(sub){const candidate=spellPitch(key.root+sub[0],key.root,minor?'minor':'major')+sub[1];
    if(harmonicFunction(candidate,key)===harmonicFunction(chords[0].symbol,key))chords[0].symbol=color(candidate,barIndex,true);}
  }
  if(level==='high'&&method!=='color'&&chords.length<4){
   const j=(seed+barIndex+100000)%chords.length,c=chords[j];
   let passing;
   const next=chords[j+1]||source[barIndex+1]?.chords[0]||(options.loop!==false?source[0]?.chords[0]:null);
   if(!modal&&options.freedom!=='color'&&next){const approach=tools.cadenceTo(next.symbol,{tritone:(seed+barIndex)%3===0,rich:!cfg.dark});passing=approach?.[1];}
   if(!modal&&!cfg.heavy&&key.mode==='major'&&next&&mod(parse(c.symbol).root-key.root)===5&&parse(next.symbol).root===key.root&&(seed+barIndex)%2===0)
    passing=parse(c.symbol).rootName+'m6';
   // A phrase endpoint remains its original function through the final beat.
   if(!passing||barIndex%4===3||barIndex===source.length-1)passing=inverse(color(c.symbol,barIndex+seed,true),seed+barIndex+2);
   const tail=c.beats/4;
   chords.splice(j,1,{...c,beats:c.beats-tail},{symbol:passing,beats:tail});
  }
  return {chords,reason:style+' · '+(level==='high'?'骨幹重配':'功能變化')};
 });
 // Deterministic variation without changing tonic, mode, duration or a pedal.
 if(signature(result)===signature(source)&&count){
  const flat=result.flatMap(b=>b.chords);for(let i=0;i<flat.length;i++){
   const c=flat[(start+i)%count],variant=inverse(c.symbol,seed+i+1);
   if(variant!==c.symbol){c.symbol=variant;break;}
  }
 }
 return result;
}
