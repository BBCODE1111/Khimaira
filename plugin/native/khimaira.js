import {chordChoices,extraChordChoices,quickProgressions} from '@site/chord-input.js';
import {selectGenre,swingDescription} from '@site/genre-rhythm.js';
import {parseChart,serialize} from '@site/solutions.js';
import {patterns,performance,voicePlan,performanceLabel} from '@site/performance.js';
import {styles,styleLabels} from '@site/style-engine.js';
import {examplePool} from '@site/example-pool.js';
import {transposeSymbol} from '@site/music.js';
import {invertChord,parallelColor,insertCadence} from '@site/harmony-actions.js';
import {createHarmony,migrateHarmony,applyHarmonyAction,harmonyView,effectiveKey} from '@site/harmony-state.js';
import {examplesForKey} from '@site/keyed-examples.js';
export {parseChart,serialize,patterns,performanceLabel,styles,styleLabels,examplePool,transposeSymbol,invertChord,insertCadence,voicePlan};
export function generate(s){return harmonyView(applyHarmonyAction(migrateHarmony(s),{type:'generate',options:{...s,seed:s.variation}})).bars;}
export function examplesForState(s){const h=migrateHarmony(s);return examplesForKey(h.style,effectiveKey(h));}
// Native-only adapter. Website and AU call the same pure state/generation APIs.
// Seiren keeps its own adapter and state contract.
export function harmonyCommand(s,action,value,key){
 if(['metadata','examples','melody','demo'].includes(action))return null;
 const migrated=!s.harmony&&action!=='init';
 let h=action==='init'?createHarmony({text:s.sourceText,key:{root:+s.key,mode:s.mode},style:s.style}):migrateHarmony(s);
 let change=null;
 switch(action){
  case 'init':s=selectGenre(s,s.pattern);break;
  case 'restore':break;
  case 'backboneEdit':change={...value,type:'backboneEdit'};break;
  case 'load':change={type:'load',text:s.sourceText};break;
  case 'generate':if(s.sourceDraft!=null){h=applyHarmonyAction(h,{type:'load',text:s.sourceDraft});delete s.sourceDraft;}change={type:'generate',options:{...s,recreate:false,seed:undefined}};break;
  case 'inspire':change={type:'inspire',kind:value?.kind,options:s};break;
  case 'keep':change={type:'keep',confirmed:value?.confirmed===true};break;
  case 'restoreBackbone':change={type:'restore'};break;
  case 'undo':change={type:'undo'};break;
  case 'compare':change={type:'compare',index:value};break;
  case 'restoreSource':change={type:'restoreSource',source:value};break;
  case 'reinterpret':change={type:'reinterpret',key:value};break;
  case 'autoKey':change={type:'auto'};break;
  case 'lockKey':change={type:'lock'};break;
  case 'convertMode':change={type:'convertMode',mode:value?.mode,confirmed:value?.confirmed===true};break;
  case 'transpose':change={type:'transpose',key:{root:(h.key.root+value+12)%12,mode:effectiveKey(h).mode}};break;
  case 'edit':change={type:'edit',bar:value.bar,text:value.text};break;
  case 'invert':case 'parallel':case 'cadence':case 'editChord':{
   let bars=harmonyView(h).bars;const bar=typeof value==='number'?value:value.bar,chord=typeof value==='number'?0:value.chord;
   const selected=bars[bar]?.chords[chord];if(!selected)throw Error('Choose a chord first');
   if(action==='cadence')bars=insertCadence(bars,bar,chord,{loop:value.loop===true}).bars;
   else if(action==='editChord'){
    const parsed=parseChart(value.symbol);if(parsed.length!==1||parsed[0].chords.length!==1)throw Error('Enter one chord symbol');
    selected.symbol=parsed[0].chords[0].symbol;
   }else selected.symbol=action==='invert'?invertChord(selected.symbol):parallelColor(selected.symbol);
   change={type:'replaceScore',bars,origin:{type:action}};break;
  }
  case 'example':{
   s.exampleId=value;change={type:'example',id:value};break;
  }
  case 'set':
   if(key==='key')change={type:'transpose',key:{root:+value,mode:effectiveKey(h).mode}};
   else if(key==='mode')change={type:'transpose',key:{...h.key,mode:value}};
   else if(key==='style'){
    change={type:'style',style:value};const cfg=styles[value];if(!cfg)throw Error('Unknown style');
    s.pattern=cfg.pattern;s.voicing=cfg.voicing;s.exampleId=null;
   }else if(key==='sourceText')s.sourceDraft=value;
   s[key]=value;if(['pattern','style'].includes(key))s=selectGenre(s,s.pattern);if(['pattern','style','pianoPhrase'].includes(key))s.pianoRevision=2;if(key==='pattern'&&value==='arp')s.arpSwing=0;
   break;
  default:return null;
 }
 if(migrated)s.legacyRenderKey={root:+s.key||0,mode:s.mode||'major'};
 if(change){h=applyHarmonyAction(h,change);delete s.legacyRenderKey;if(['load','example','keep','undo','backboneEdit'].includes(change.type))delete s.sourceDraft;}
 const view=harmonyView(h);
 const changesLength=['init','load','generate','example','inspire','restoreBackbone','undo'].includes(action);
 return {...s,...view,harmony:h,style:h.style,length:changesLength?view.bars.length:s.length,variation:h.variation,
  backboneBars:parseChart(view.sourceText),chordChoices:chordChoices(effectiveKey(h)),extraChordChoices:extraChordChoices(effectiveKey(h)),quickProgressions:quickProgressions.map(([name])=>name),
  sourceText:s.sourceDraft??view.sourceText,performanceLabel:performanceLabel(s.pattern,s.genreRevision),swingDescription:s.genreRevision>=2?swingDescription(s.pattern,s.swing):'SWING'};
}
export function render(s,o){return performance(s.bars,s.pattern,o);}
export function demo(){return [];}
export function pedal(s){return [];}
