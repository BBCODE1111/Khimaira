import {performance} from './engine/performance.js';
export function performanceOptions(state,hostBpm=120){return {
 pianoPhrase:state.pianoPhrase||'original',
 key:{root:+state.key||0,mode:state.mode||'major'},
 melodyText:state.melodyText||'',melodyFollow:state.melodyFollow||'gentle',pianoFills:state.pianoFills||'phrase',
 voicing:state.voicing,gate:+state.gate/100,human:+state.human/100,swing:+state.swing/100,
 rate:+state.rate,seed:+state.seed,bpm:hostBpm,bassMode:state.bassMode,balladEntry:state.balladEntry,
 arpMode:state.arpMode,arpRate:state.arpRate,arpOctaves:+state.arpOctaves,arpPhase:state.arpPhase,
 arpAccent:state.arpAccent,arpSeed:+state.arpSeed,arpFoundation:state.arpFoundation
};}
export function compilePattern(state,hostBpm=120){return {
 schema:2,length:state.bars.length*4,notes:performance(state.bars,state.pattern,performanceOptions(state,hostBpm)),ui:structuredClone(state)
};}
