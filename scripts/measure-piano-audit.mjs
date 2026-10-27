import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'../Seiren'),read=path=>import(pathToFileURL(resolve(root,path)));
const {renderProtected}=await read('fusion.js'),{patterns}=await read('performance.js'),{demoMelody}=await read('harmony.js'),{vocalPhrases}=await read('tests/seiren-harness/fixtures/vocal-phrases.mjs');
const ids=Object.keys(patterns).filter(id=>/^pop[A-Z]|^texture/.test(id));
const opts={human:0,popFill:'off',key:{root:0,mode:'major'},policy:'musical'};
const report={rhythmGroups:{},demoCollapsed:[],vocalContrast:[],lowVocal:[]};
for(const [bb,meter] of [[4,{numerator:4,denominator:4}],[3,{numerator:3,denominator:4}],[3,{numerator:6,denominator:8}]]){
 const groups={};for(const id of ids){const notes=renderProtected([{chords:[{symbol:'C',beats:bb}]}],id,{...opts,barBeats:bb,meter},[]).notes;const sig=JSON.stringify(notes.map(n=>[+n.beat.toFixed(6),n.role,+n.duration.toFixed(6)]));(groups[sig]??=[]).push(id);}
 report.rhythmGroups[meter.numerator+'/'+meter.denominator]=Object.values(groups);
}
const chart=['C','G','Am','F','C','G','F','G'].map(symbol=>({chords:[{symbol,beats:4}]}));
const render=(id,pianoPhrase,melody)=>renderProtected(chart,id,{...opts,pianoPhrase},melody);
for(const id of ids){
 if(JSON.stringify(render(id,'auto',demoMelody()).accompaniment)===JSON.stringify(render(id,'space',demoMelody()).accompaniment))report.demoCollapsed.push(id);
 for(const {name,notes} of vocalPhrases){const counts=Object.fromEntries(['space','two','four','auto'].map(mode=>[mode,render(id,mode,notes).accompaniment.filter(n=>n.role!=='bass').length]));report.vocalContrast.push({pattern:id,phrase:name,counts,relativeDifference:Math.abs(counts.two-counts.four)/counts.two});}
 const male=vocalPhrases[0].notes.map(n=>({...n,pitch:n.pitch-12})),out=render(id,'original',male),upper=out.accompaniment.filter(n=>n.role!=='bass');let muddyPairs=0;
 for(let i=0;i<upper.length;i++)for(let j=i+1;j<upper.length;j++){const a=upper[i],b=upper[j];if(Math.min(a.pitch,b.pitch)<52&&Math.abs(a.pitch-b.pitch)>0&&Math.abs(a.pitch-b.pitch)<7&&Math.min(a.end,b.end)-Math.max(a.start,b.start)>1e-7)muddyPairs++;}
 report.lowVocal.push({pattern:id,upperNotes:upper.length,belowE3:upper.filter(n=>n.pitch<52).length,muddyPairs,lowered:out.lowered});
}
report.summary={distinctRhythms:Object.fromEntries(Object.entries(report.rhythmGroups).map(([k,v])=>[k,v.length])),demoCollapsed:report.demoCollapsed.length,minTwoFourDifference:Math.min(...report.vocalContrast.map(r=>r.relativeDifference)),lowVocalMuddyPairs:report.lowVocal.reduce((sum,r)=>sum+r.muddyPairs,0)};
if(process.argv[3])writeFileSync(resolve(process.argv[3]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
