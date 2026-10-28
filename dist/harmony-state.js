import {parseChart,chordList,serialize} from './solutions.js?v=key-functional-1';
import {parse} from './music.js?v=key-functional-1';
import {normalizeKey,parseDegreeChart,chartToDegrees,materializeChart,sameDegrees,formatDegreeChart,degreeLabels} from './degree-chart.js?v=key-functional-1';
import {detectKey} from './key-detection.js?v=key-functional-1';
import {mutate,styles} from './style-engine.js?v=key-functional-1';
import {styleTonality} from './backbone-mutation.js?v=key-functional-1';
import {examplesForKey,nextKeyedExample} from './keyed-examples.js?v=key-functional-1';

import {convertDegreeMode} from './mode-conversion.js?v=key-functional-1';

export const HARMONY_SCHEMA=1;
const copy=x=>structuredClone(x);
const keyEqual=(a,b)=>a.root===b.root&&a.mode===b.mode;
const symbols=(degrees,key)=>serialize(materializeChart(degrees,key));
const namedInput=text=>text.split(/\||\s+|,(?![^()]*\))/).filter(Boolean).every(t=>parse(t.split(':')[0]));
const snapshot=s=>{const out=copy(s);delete out.history;return out;};
export function effectiveKey(s){return s.keyMode==='locked'?copy(s.key):styleTonality(s.style,styles[s.style]||styles.Jazz,s.key);}
export function createHarmony({text='| C | Am | F | G |',key={root:0,mode:'major'},locked=false,style='Jazz'}={}){
 const initial={schema:HARMONY_SCHEMA,key:normalizeKey(key),keyMode:locked?'locked':'auto',style,variation:0,history:[],candidates:[],warning:null,origin:{type:'backbone'}};
 return loadInput(initial,text);
}
function loadInput(s,text){
 const provisional=parseDegreeChart(text,s.key),actual=materializeChart(provisional,s.key);
 const detection=namedInput(text)?detectKey(actual):{primary:null,candidates:[]};
 let key=s.key;
 if(s.keyMode==='auto'&&detection.primary)key=normalizeKey(detection.primary);
 const degrees=chartToDegrees(actual,key),mismatch=s.keyMode==='locked'&&detection.primary&&!keyEqual(detection.primary,key);
 return {...s,key,candidates:detection.candidates.map(normalizeKey),warning:mismatch?{type:'key-mismatch',suggested:normalizeKey(detection.primary)}:null,
  backbone:{degrees,originalDegrees:copy(degrees),enteredKey:copy(key)},score:copy(degrees),variation:0,origin:{type:'backbone'},inputFormat:namedInput(text)?'chords':'roman'};
}
export function migrateHarmony(old={}){
 if(old.harmony?.schema===HARMONY_SCHEMA)return copy(old.harmony);
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
  case 'transpose':{
   const key=normalizeKey(action.key);
   if(key.mode!==s.key.mode&&key.mode!==effectiveKey(s).mode)throw Error('大小調轉換需使用獨立、已確認的調式轉換動作。');
   s.key=key;s.keyMode='locked';s.candidates=[];break;
  }
  case 'reinterpret':{
   const key=normalizeKey(action.key),backbone=materializeChart(s.backbone.degrees,s.key),score=materializeChart(s.score,s.key);
   s.backbone.degrees=chartToDegrees(backbone,key);s.score=chartToDegrees(score,key);s.key=key;s.keyMode='locked';s.candidates=[];break;
  }
  case 'auto':{
   const detected=detectKey(materializeChart(s.backbone.degrees,s.key));
   if(detected.primary){s=applyHarmonyAction(s,{type:'reinterpret',key:detected.primary});s.history=copy(current.history);}
   s.keyMode='auto';s.candidates=detected.candidates.map(normalizeKey);break;
  }
  case 'lock':s.key=normalizeKey(effectiveKey(s));s.keyMode='locked';break;
  case 'convertMode':{
   if(!action.confirmed)throw Error('大小調轉換需要確認。');
   const from=effectiveKey(s).mode;
   s.backbone.degrees=convertDegreeMode(s.backbone.degrees,from,action.mode);
   s.score=convertDegreeMode(s.score,from,action.mode);
   s.key=normalizeKey({root:s.key.root,mode:action.mode});s.keyMode='locked';s.candidates=[];s.origin={type:'conversion'};break;
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
   // LOAD is exact (apart from transposition); it never replaces the backbone.
   const p=examplesForKey(s.style,effectiveKey(s)).find(p=>p.id===action.id);
   if(!p)throw Error('這個範例不適用目前調式，請選擇清單中的範例。');
   s.score=copy(p.degrees);s.origin={type:'example',id:p.id};break;
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
   if(!filled||options.recreate===true){
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
   s.variation=seed;s.score=chartToDegrees(candidate,s.key);s.origin={type:!filled||options.recreate?'idea':'morph',variation:seed,level:options.randomness||'medium'};
   if(symbols(s.score,s.key)===previous)s.warning={type:'variation-exhausted',attempts:9};
   break;
  }
  default:throw Error('Unknown harmony action: '+action.type);
 }
 s.history=[...copy(current.history),snapshot(current)].slice(-32);return s;
}
