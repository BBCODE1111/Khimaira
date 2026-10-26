import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {performance as reference} from '../../dist/performance.js';
import {parseChart} from '../../dist/solutions.js';
const stage=path.resolve(process.argv[2]||'build-plugin/v12/webstage');
const {compilePattern,performanceOptions}=await import(pathToFileURL(path.join(stage,'pattern.js')));
const fixtures=[];
for(const pattern of ['jazz','pop','rock','ballad','house','arp'])for(const seed of [42,197])for(const voicing of ['close','rootless']){
 const bars=parseChart('| Cmaj9 | Am9 | Dm7:2 G7b9:2 | Cmaj7/E | Fmaj7#11 | Bm7b5:2 E7alt:2 | Am9 | G7 |');
 const state={bars,pattern,style:'Jazz',seed,voicing,gate:82,human:35,swing:16,rate:.5,bassMode:'four',balladEntry:'delayed',arpFoundation:seed===42?'off':'pad',arpMode:'upDown',arpRate:'16',arpOctaves:2,arpPhase:'flow',arpAccent:'offbeat',arpSeed:seed};
 const result=compilePattern(state,120);
 assert.deepEqual(result.notes,reference(bars,pattern,performanceOptions(state,120)));
 fixtures.push({...result,name:`${pattern}-${seed}-${voicing}`,transportHost:true});
}
fs.writeFileSync(process.argv[3]||'build-plugin/v12/fixtures.json',JSON.stringify(fixtures));
console.log(`${fixtures.length} exact web/native fixtures: jazz, pop, rock, ballad, house, arp; 8 bars each.`);
