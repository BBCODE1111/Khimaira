import {parse,names,mod,transposeSymbol} from './engine/music.js';
import {parseChart,serialize} from './engine/solutions.js';
import {styles,styleLabels,mutate} from './engine/style-engine.js';
import {examplePool,nextExample} from './engine/example-pool.js';
const clone=value=>structuredClone(value);
export function restoreSession(defaults,saved={}){
 const state={...defaults,...saved,pianoPhrase:saved.pianoPhrase||(Object.keys(saved).length?'original':defaults.pianoPhrase)};
 // Older sessions kept the original LOAD in source, separately from the result.
 state.sourceText=typeof saved.sourceText==='string'?saved.sourceText:serialize(saved.source??defaults.source);
 return state;
}
export function backbone(state){
 const bars=parseChart(state.sourceText);
 return bars.some(b=>b.chords.length)?bars:[];
}
function resize(bars,count){return Array.from({length:+count},(_,i)=>clone(bars[i%bars.length]));}
export function exampleBars(state,example){
 const shift=+state.key-(example.key??0);
 return resize(parseChart(example.chart),state.length).map(b=>({...b,chords:b.chords.map(c=>{
  return {...c,symbol:transposeSymbol(c.symbol,shift,+state.key,state.mode)};
 })}));
}
export function selectExample(state,id){
 const pool=examplePool(state.style),p=id?pool.find(p=>p.id===id):nextExample(pool,state.exampleId);
 if(!p)throw Error('這個樂風沒有可用範例。');
 return {...state,exampleId:p.id};
}
export function loadExample(state){
 const pool=examplePool(state.style),p=pool.find(p=>p.id===state.exampleId)||pool[0];
 if(!p)throw Error('這個樂風沒有可用範例。');
 const cfg=styles[state.style];
 return {...state,bars:exampleBars(state,p),exampleId:p.id,mode:p.mode,pattern:cfg.pattern,voicing:p.open?'open':cfg.voicing,gate:p.feel?.gate??82,human:p.feel?.human??20,mood:p.title,variation:0};
}
export function generateSession(state){
 const input=backbone(state),seed=state.variation+1;
 // Browsing examples never changes the source or performance settings. Only a
 // genuinely empty backbone uses a selected example (or the style's first one).
 if(!input.length)return loadExample(state);
 const source=resize(input,state.length);
 const bars=mutate(source,{style:state.style,key:+state.key,mode:state.mode,randomness:state.randomness,seed,freedom:state.freedom||'color',density:+state.density||3,method:'style',ideaFamily:state.ideaFamily||'auto'});
 return {...state,bars,variation:seed,mood:'MORPH '+seed+' · '+(styleLabels[state.style]||state.style)+' · 原始骨幹'};
}
export function loadBackbone(state){
 const source=backbone(state);if(!source.length)throw Error('骨幹是空白的，請選 EXAMPLES 後按 LOAD，或直接按 GENERATE。');
 return {...state,source:clone(source),bars:clone(source),length:source.length,variation:0,mood:'原始骨幹 · GENERATE 只改上方播放譜'};
}
export function keepResult(state){
 return {...state,source:clone(state.bars),sourceText:serialize(state.bars),variation:0,mood:'已將上方結果設為新的骨幹'};
}
