import {examplePool,nextExample} from './example-pool.js?v=1.0.5';
import {styles} from './style-engine.js?v=1.0.5';
import {parseChart,serialize} from './solutions.js?v=1.0.5';
import {parse} from './music.js?v=1.0.5';
import {normalizeKey,chartToDegrees,materializeChart} from './degree-chart.js?v=1.0.5';
import {styleTonality} from './backbone-mutation.js?v=1.0.5';
import {detectKey} from './key-detection.js?v=1.0.5';

export function exampleTonality(example){
 const cfg=styles[example.style]||{},key=normalizeKey({root:example.key||0,mode:example.mode==='minor'?'minor':'major'});
 if(cfg.world||['Dorian folk','Phrygian dominant','Major blues','Minor blues'].includes(example.style))return styleTonality(example.style,cfg,key);
 const chart=parseChart(example.chart),tonics=chart.flatMap(b=>b.chords).map(c=>({...parse(c.symbol),beats:c.beats})).filter(c=>c.root===key.root);
 const major=tonics.filter(c=>c.intervals.includes(4)).reduce((n,c)=>n+c.beats,0),minor=tonics.filter(c=>c.minor).reduce((n,c)=>n+c.beats,0);
 // Older phrase metadata defaulted to major, even for an explicitly minor tonic.
 if(minor&&!major)return normalizeKey({...key,mode:'minor'});
 if(major&&!minor)return normalizeKey({...key,mode:'major'});
 // A clearly resolved relative key takes priority over a default C label.
 if(!tonics.length){const d=detectKey(chart);if(!d.ambiguous)return normalizeKey(d.primary);}
 return key;
}
function compatible(source,target){
 if(source===target)return true;
 return ({'major-blues':'major','minor-blues':'minor',major:'major',minor:'minor'})[source]===target;
}
export function examplesForKey(style,target){
 target=normalizeKey(target);
 return examplePool(style).flatMap(p=>{
  const enteredKey=exampleTonality(p);if(!compatible(enteredKey.mode,target.mode))return [];
  const degrees=chartToDegrees(parseChart(p.chart),enteredKey),bars=materializeChart(degrees,target);
  return [{...p,enteredKey,key:target.root,mode:target.mode,chart:serialize(bars),degrees}];
 });
}
export function nextKeyedExample(style,key,currentId){return nextExample(examplesForKey(style,key),currentId);}
