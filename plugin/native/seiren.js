import {parseChart,serialize} from '@site/solutions.js';
import {patterns,voicePlan} from '@site/performance.js';
import {styles,styleLabels,mutate} from '@site/style-engine.js';
import {examplePool} from '@site/example-pool.js';
import {createTheory} from '@site/music-core.js';
const {transposeSymbol}=createTheory('khimaira-v1');
import {invertChord,insertCadence} from '@site/harmony-actions.js';
import {rewriteWithMelody,renderProtected,normalizeChart} from '@site/fusion.js';
import {demoMelody} from '@site/harmony.js';
export {parseChart,serialize,patterns,styles,styleLabels,examplePool,transposeSymbol,invertChord,insertCadence,voicePlan};
export function generate(s){const input=parseChart(s.sourceText,s.barBeats),source=Array.from({length:s.length},(_,i)=>structuredClone(input[i%input.length])),candidate=mutate(source,{...s,seed:s.variation,key:+s.key,method:'style'});return s.melody?.length?rewriteWithMelody(candidate,s.melody,{meter:s.meter,key:{root:+s.key,mode:s.mode},style:s.style,seed:s.variation,previous:s.bars,policy:s.policy,melodyFirst:true}):normalizeChart(candidate,s.barBeats);}
export function render(s,o){return renderProtected(s.bars,s.pattern,{...o,popFill:s.pianoFills==='light'?'more':s.pianoFills==='off'?'off':'auto',policy:s.policy,followMelody:true},s.melody||[]).notes;}
export function demo(){return demoMelody();}
