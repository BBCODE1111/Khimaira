import {serialize} from './solutions.js?v=1.0.7';
import {materializeChart} from './degree-chart.js?v=1.0.7';
const techniqueNames={parallel:'平行',inversion:'轉位','ii-V':'ii–V 替換',approach:'接近',color:'色彩','retained-target':'保留目標'};
export function morphTraceText(chord,source,valid=true){
 if(!valid)return '';
 const mapping=chord.morph,original=mapping&&source[mapping.source.bar]?.chords[mapping.source.chord];
 if(!original||chord.symbol===original.symbol&&chord.beats===original.beats)return '';
 if(chord.symbol===original.symbol)return original.symbol+'・時值讓給接近和弦';
 const target=mapping.target&&source[mapping.target.bar]?.chords[mapping.target.chord];
 return original.symbol+' → '+chord.symbol+'・'+(techniqueNames[mapping.technique]||mapping.technique)+(target?' → '+target.symbol+'（第 '+(mapping.target.bar+1)+' 小節）':'');
}
export function morphHistoryLabel(entry,key){
 const level={low:'低',medium:'中',high:'高'}[entry.level]||'未記錄幅度';
 return 'MORPH '+entry.variation+' · '+entry.style+' · '+level+' · '+serialize(materializeChart(entry.score,key)).replaceAll(':4','');
}
