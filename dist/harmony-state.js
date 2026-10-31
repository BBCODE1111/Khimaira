import {editBackbone} from './chord-input.js?v=genre-2';
import {parseChart,chordList,serialize} from './solutions.js?v=morph-1';
import {parse} from './music.js?v=morph-1';
import {normalizeKey,parseDegreeChart,chartToDegrees,materializeChart,sameDegrees,formatDegreeChart,degreeLabels} from './degree-chart.js?v=morph-1';
import {detectKey} from './key-detection.js?v=morph-1';
import {mutate,styles} from './style-engine.js?v=morph-1';
import {styleTonality} from './backbone-mutation.js?v=morph-1';
import {examplesForKey,nextKeyedExample} from './keyed-examples.js?v=morph-1';

import {convertDegreeMode} from './mode-conversion.js?v=morph-1';

export const HARMONY_SCHEMA=1;
const copy=x=>structuredClone(x);
const keyEqual=(a,b)=>a.root===b.root&&a.mode===b.mode;
const symbols=(degrees,key)=>serialize(materializeChart(degrees,key));
const namedInput=text=>text.split(/\||\s+|,(?![^()]*\))/).filter(Boolean).every(t=>parse(t.split(':')[0]));
const snapshot=s=>{const out=copy(s);delete out.history;return out;};
const tonalMode=mode=>mode==='major'||mode==='minor';
// LOCK freezes the underlying tonal key; modal colour belongs to the style.
export function effectiveKey(s){return styleTonality(s.style,styles[s.style]||styles.Jazz,s.key);}
function tonalKey(key,fallback='major'){
 return normalizeKey({...key,mode:tonalMode(key.mode)?key.mode:fallback});
}
function repairModalKey(s){
 const fallback=tonalMode(s.backbone?.enteredKey?.mode)?s.backbone.enteredKey.mode:'major';
 s.key=tonalKey(s.key,fallback);
 if(s.backbone?.enteredKey)s.backbone.enteredKey=tonalKey(s.backbone.enteredKey,fallback);
 for(const past of s.history||[])repairModalKey(past);
 return s;
}
export function createHarmony({text='| C | Am | F | G |',key={root:0,mode:'major'},locked=false,style='Jazz'}={}){
 const initial={schema:HARMONY_SCHEMA,key:tonalKey(key),keyMode:locked?'locked':'auto',style,variation:0,history:[],candidates:[],warning:null,origin:{type:'backbone'}};
 return loadInput(initial,text);
}
function loadInput(s,text,{editing=false}={}){
 const provisional=parseDegreeChart(text,s.key),actual=materializeChart(provisional,s.key);
 const detection=namedInput(text)?detectKey(actual):{primary:null,candidates:[]};
 let key=s.key;
 // Incomplete tap entry is not yet a harmonic phrase. Still analyse it,
 // but retain the user's palette until a completed progression or a strong
 // observed cadence provides enough evidence. Typed LOAD remains explicit.
 const count=actual.reduce((n,b)=>n+b.chords.length,0),complete=actual.every(b=>b.chords.length);
 const strong=detection.primary?.analysis?.events.some(c=>['ii-V-I','V-I','subV-I','iv-I'].includes(c.cadence));
 const ready=!editing||(count>=2&&complete)||(count>=3&&strong);
 if(s.keyMode==='auto'&&detection.primary&&ready)key=normalizeKey(detection.primary);
 const degrees=chartToDegrees(actual,key),mismatch=s.keyMode==='locked'&&detection.primary&&!keyEqual(detection.primary,key);
 return {...s,key,candidates:detection.candidates.map(normalizeKey),warning:mismatch?{type:'key-mismatch',suggested:normalizeKey(detection.primary)}:null,
  backbone:{degrees,originalDegrees:copy(degrees),enteredKey:copy(key)},score:copy(degrees),variation:0,origin:{type:'backbone'},inputFormat:namedInput(text)?'chords':'roman'};
}
export function migrateHarmony(old={}){
 if(old.harmony?.schema===HARMONY_SCHEMA)return repairModalKey(copy(old.harmony));
 const source=old.sourceText??(old.source?serialize(old.source.map(b=>({chords:chordList(b)}))):old.bars?serialize(old.bars.map(b=>({chords:chordList(b)}))):'| C | Am | F | G |');
 const s=createHarmony({text:source,key:{root:+old.key||0,mode:old.mode==='minor'?'minor':'major'},style:old.style||'Jazz'});
 if(old.bars)s.score=chartToDegrees(old.bars.map(b=>({chords:chordList(b)})),s.key);
 s.origin={type:'legacy'};
 return s;
}
export function harmonyView(s){
 return {bars:materializeChart(s.score,s.key),sourceText:symbols(s.backbone.degrees,s.key),romanText:formatDegreeChart(s.backbone.degrees,s.key),degreeLabels:degreeLabels(s.score,s.key),
  key:s.key.root,mode:s.key.mode,tonality:effectiveKey(s),canRestore:!sameDegrees(s.score,s.backbone.degrees),candidates:copy(s.candidates),warning:copy(s.warning),origin:copy(s.origin)};
}
export function applyHarmonyAction(current,action){
 if(action.type==='undo'){
  if(!current.history.length)return copy(current);
  return {...copy(current.history.at(-1)),history:copy(current.history.slice(0,-1))};
 }
 let s=copy(current);s.warning=null;
 switch(action.type){
  case 'load':s=loadInput(s,action.text);break;
  case 'backboneEdit':{
   const actual=editBackbone(materializeChart(s.backbone.degrees,s.key),action,effectiveKey(s));
   s=loadInput(s,serialize(actual),{editing:true});break;
  }
  case 'transpose':{
   const mode=action.key.mode??s.key.mode;
   if(mode!==s.key.mode&&mode!==effectiveKey(s).mode)throw Error('大小調轉換需使用獨立、已確認的調式轉換動作。');
   const key=normalizeKey({...action.key,mode:s.key.mode});
   s.key=key;s.candidates=[];break;
  }
  case 'reinterpret':{
   const key=tonalKey(action.key,s.key.mode),backbone=materializeChart(s.backbone.degrees,s.key),score=materializeChart(s.score,s.key);
   s.backbone.degrees=chartToDegrees(backbone,key);s.score=chartToDegrees(score,key);s.key=key;s.candidates=[];break;
  }
  case 'auto':{
   const detected=detectKey(materializeChart(s.backbone.degrees,s.key));
   if(detected.primary){s=applyHarmonyAction(s,{type:'reinterpret',key:detected.primary});s.history=copy(current.history);}
   s.keyMode='auto';s.candidates=detected.candidates.map(normalizeKey);break;
  }
  case 'lock':s.key=tonalKey(s.key);s.keyMode='locked';break;
  case 'convertMode':{
   if(!action.confirmed)throw Error('大小調轉換需要確認。');
   if(!tonalMode(action.mode))throw Error('調式轉換只接受 major 或 minor。');
   const from=s.key.mode;
   s.backbone.degrees=convertDegreeMode(s.backbone.degrees,from,action.mode);
   s.score=convertDegreeMode(s.score,from,action.mode);
   s.key=normalizeKey({root:s.key.root,mode:action.mode});s.candidates=[];s.origin={type:'conversion'};break;
  }
  case 'style':s.style=action.style;break;
  case 'restore':s.score=copy(s.backbone.degrees);s.origin={type:'backbone'};break;
  case 'keep':
   if(!action.confirmed)throw Error('KEEP 需要確認，會把目前播放譜設為新的骨幹。');
   s.backbone={degrees:copy(s.score),originalDegrees:copy(s.score),enteredKey:copy(s.key)};s.origin={type:'backbone'};break;
  case 'edit':{
   if(!s.score[action.bar])throw Error('Invalid bar');
   s.score[action.bar]=parseDegreeChart(action.text,s.key)[0];s.origin={type:'edit'};break;
  }
  case 'replaceScore':s.score=chartToDegrees(action.bars,s.key);s.origin=action.origin||{type:'edit'};break;
  case 'example':{
   // Explicit LOAD adopts the keyed example as the new backbone; undo keeps the previous one.
   const p=examplesForKey(s.style,effectiveKey(s)).find(p=>p.id===action.id);
   if(!p)throw Error('這個範例不適用目前調式，請選擇清單中的範例。');
   s.score=chartToDegrees(parseChart(p.chart),s.key);
   s.backbone={degrees:copy(s.score),originalDegrees:copy(s.score),enteredKey:copy(s.key)};
   s.variation=0;s.candidates=[];s.origin={type:'example',id:p.id};break;
  }
  case 'inspire':{
   const p=nextKeyedExample(s.style,effectiveKey(s),s.lastInspirationId);
   if(!p){
    if(action.kind==='example')throw Error('目前樂風沒有適用此調式的範例。');
    const generated=applyHarmonyAction(s,{type:'generate',options:{...action.options,randomness:'high',recreate:false,seed:s.variation+1}});
    s={...generated,history:s.history,origin:{type:'inspire',kind:'backbone',variation:generated.variation}};break;
   }
   const seed=s.variation+1,fusion=action.kind==='fusion'||action.kind!=='example'&&seed%2===0;
   const bars=parseChart(p.chart),candidate=fusion?mutate(bars,{...action.options,style:s.style,tonality:effectiveKey(s),seed,randomness:'high',freedom:'morph'}):bars;
   s.score=chartToDegrees(candidate,s.key);s.variation=seed;s.lastInspirationId=p.id;
   s.origin={type:'inspire',kind:fusion?'fusion':'example',id:p.id,variation:seed};break;
  }
  case 'generate':{
   const options=action.options||{},source=materializeChart(s.backbone.degrees,s.key);
   const requestedLength=options.length??source.length;
   if(!Number.isInteger(requestedLength)||requestedLength<1||requestedLength>16)throw Error('小節數必須為 1–16。');
   const filled=source.some(b=>b.chords.length);
   let basis=source;
   if(!filled){
    const pool=examplesForKey(s.style,effectiveKey(s)),p=pool[(Number(options.seed??s.variation+1))%Math.max(1,pool.length)];
    basis=p?parseChart(p.chart):materializeChart(parseDegreeChart(s.key.mode==='minor'?'i | bVI | iv | V7':'I | vi | IV | V7',s.key),s.key);
   }
   const expanded=Array.from({length:requestedLength},(_,i)=>copy(basis[i%basis.length]||{chords:[]}));
   const previous=symbols(s.score,s.key);let candidate,seed=Number(options.seed??s.variation+1);
   if(!Number.isSafeInteger(seed)||seed<0)throw Error('Invalid variation seed');
   for(let attempt=0;attempt<=8;attempt++,seed++){
    candidate=mutate(expanded,{...options,style:s.style,tonality:effectiveKey(s),key:s.key.root,mode:s.key.mode,seed,
     freedom:'morph',recreate:false});
    if(serialize(candidate)!==previous)break;
   }
   s.variation=seed;s.score=chartToDegrees(candidate,s.key);s.origin={type:!filled?'idea':'morph',variation:seed,level:options.randomness||'medium'};
   if(symbols(s.score,s.key)===previous)s.warning={type:'variation-exhausted',attempts:9};
   break;
  }
  default:throw Error('Unknown harmony action: '+action.type);
 }
 s.history=[...copy(current.history),snapshot(current)].slice(-32);return s;
}
