// node scripts/measure-performance-grid.mjs <pre-change Khimaira backup> <report.json>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance,patterns} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
const backup=path.resolve(process.argv[2]);
const old=await import(pathToFileURL(path.join(backup,'dist/performance.js')));
const options={human:0,swing:0,gate:.8,pianoFills:'off'};
// A display-only nearest-sixteenth projection. The full event list below
// retains fixed pocket, duration and pitch; it is the verification evidence.
const fingerprint=notes=>Array.from({length:16},(_,i)=>{
 const hits=notes.filter(n=>Math.round(n.beat*4)===i);
 const b=hits.some(n=>n.part==='bass'),u=hits.some(n=>n.part==='upper');
 return b&&u?'X':b?'B':u?'U':'·';
}).join('');
const rows=[];
for(const pattern of Object.keys(patterns)){
 const row={pattern};
 for(const [name,renderer] of [['before',old.performance],['after',performance]])for(const [kind,chart] of [['Whole','C'],['Split','C:2 G:2']]){
  const notes=renderer(parseChart(chart),pattern,options);
  row[name+kind]={fingerprint:fingerprint(notes),events:notes.map(({beat,note,part,duration})=>({beat,note,part,duration}))};
 }
 rows.push(row);
}
fs.writeFileSync(process.argv[3],JSON.stringify({backup,options,patterns:rows.length,patternNamesUnchanged:JSON.stringify(patterns)===JSON.stringify(old.patterns),rows},null,2));
console.log(`Recorded ${rows.length} patterns before/after, whole/split bars, including full note timing.`);
