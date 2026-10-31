import {createHarmony,migrateHarmony,harmonyView,HARMONY_SCHEMA} from './harmony-state.js?v=1.0.6';
import {materializeChart} from './degree-chart.js?v=1.0.6';
import {styles} from './style-engine.js?v=1.0.6';

const keys=['khimaira-v5','khimaira-v4','khimaira-v3','chord-advisor-v2','chord-advisor-v1'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

function validateBars(bars,key){
 if(!Array.isArray(bars)||bars.length<1||bars.length>16)throw Error('Invalid saved bars');
 for(const bar of bars){
  if(!object(bar)||!Array.isArray(bar.chords)||bar.chords.length>4)throw Error('Invalid saved bar');
  for(const chord of bar.chords){
   if(!object(chord)||!Number.isFinite(chord.beats)||chord.beats<=0)throw Error('Invalid saved duration');
  }
  if(bar.chords.length&&Math.abs(bar.chords.reduce((n,c)=>n+c.beats,0)-4)>1e-8)throw Error('Invalid saved bar duration');
 }
 materializeChart(bars,key); // Validate every symbol, including the retained original.
}

function validateHarmony(s,history=true){
 if(!object(s)||s.schema!==HARMONY_SCHEMA||!Object.hasOwn(styles,s.style))throw Error('Unknown saved style or schema');
 if(!['auto','locked'].includes(s.keyMode)||!object(s.backbone)||!Array.isArray(s.candidates))throw Error('Invalid saved harmony');
 validateBars(s.score,s.key);
 validateBars(s.backbone.degrees,s.key);
 validateBars(s.backbone.originalDegrees,s.backbone.enteredKey);
 harmonyView(s);
 if(s.morphHistory!==undefined){
  if(!Array.isArray(s.morphHistory)||s.morphHistory.length>6)throw Error('Invalid MORPH history');
  for(const entry of s.morphHistory){
   if(!object(entry)||!Object.hasOwn(styles,entry.style)||!Number.isSafeInteger(entry.variation)||entry.variation<0)throw Error('Invalid MORPH result');
   validateBars(entry.score,s.key);
  }
  if(s.compareIndex!=null&&(!Number.isInteger(s.compareIndex)||s.compareIndex<0||s.compareIndex>=s.morphHistory.length))throw Error('Invalid comparison index');
 }

 if(history){
  if(!Array.isArray(s.history)||s.history.length>32)throw Error('Invalid saved history');
  for(const past of s.history)validateHarmony(past,false);
 }
}

// Read and validate before applying any settings. A failed backup disables
// writes for this session so recovery can never destroy the only original.
export function readSession(storage,now=Date.now){
 const fallback={harmony:createHarmony(),saved:null,canSave:true,message:''};
 let key,raw;
 try{
  for(const candidate of keys){
   const value=storage.getItem(candidate);
   if(value!==null){key=candidate;raw=value;break;}
  }
  if(raw===undefined)return fallback;
  const saved=JSON.parse(raw);
  if(!object(saved)||(!saved.harmony&&!Array.isArray(saved.bars)&&typeof saved.sourceText!=='string'&&!Array.isArray(saved.source)))throw Error('Invalid saved project');
  if(saved.style!==undefined&&!Object.hasOwn(styles,saved.style))throw Error('Unknown saved style');
  if(saved.harmony&&saved.harmony.schema!==HARMONY_SCHEMA)throw Error('Unknown saved schema');
  if(saved.pianoSettings!==undefined&&!object(saved.pianoSettings))throw Error('Invalid performance settings');
  const harmony=migrateHarmony(saved);
  validateHarmony(harmony);
  return {...fallback,harmony,saved};
 }catch(error){
  if(raw===undefined)return {...fallback,canSave:false,message:'無法讀取瀏覽器存檔；本次不會覆寫資料。'};
  try{
   const base=`khimaira-corrupt-${now()}`;
   let backup=base,index=0;
   while(storage.getItem(backup)!==null)backup=`${base}-${++index}`;
   storage.setItem(backup,raw);
   if(storage.getItem(backup)!==raw)throw Error('Backup verification failed');
   // Keep the old key until the normal startup save replaces it successfully.
   return {...fallback,message:`存檔無法讀取，原始資料已備份至 ${backup}；已載入預設進行。`};
  }catch{
   return {...fallback,canSave:false,message:`存檔無法讀取且無法備份；原始資料保留在 ${key}，本次不會覆寫。`};
  }
 }
}
