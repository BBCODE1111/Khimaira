// Reproduce decision 6 / P2-D without replacing any golden fixture.
// Optional argv[2]: path to a read-only exported round-4 checkout.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {popOpeningStyles,openingTonicChoice} from '../dist/morph-profiles.js';
async function measure(base){
 const [{styles,mutate},{createHarmony,applyHarmonyAction:act,harmonyView},{parseChart,serialize}]=await Promise.all([
  import(new URL('dist/style-engine.js',base)),import(new URL('dist/harmony-state.js',base)),import(new URL('dist/solutions.js',base))
 ]);
 const key={root:0,tonic:'C',mode:'major'},diversity={},minimumSliding12={},opening={};
 for(const style of Object.keys(styles)){
  let s=createHarmony({text:'C | G | Am | F',style,key,locked:true});const unique=new Set(),outputs=[];
  for(let i=0;i<36;i++){s=act(s,{type:'generate',options:{randomness:'high'}});const output=serialize(harmonyView(s).bars);outputs.push(output);if(i<12)unique.add(output);}
  diversity[style]=unique.size;
  minimumSliding12[style]=Math.min(...Array.from({length:25},(_,i)=>new Set(outputs.slice(i,i+12)).size));
 }
 for(const style of popOpeningStyles){
  let unprotected=0,protectedLoop=0;
  for(let seed=0;seed<1200;seed++)for(const loop of [false,true]){
   const c=mutate(parseChart('C | G | Am | F'),{style,tonality:key,randomness:'high',seed,loop})[0].chords[0];
   if(c.morph.technique==='parallel'){if(loop)protectedLoop++;else unprotected++;}
  }
  opening[style]={unprotected,protectedLoop,total:1200};
 }
 return {diversity,passing:Object.values(diversity).filter(n=>n>=10).length,minimumSliding12,opening};
}
const result={protocol:'LOCK C major; C | G | Am | F; high; default density; first 12 consecutive stateful MORPH actions, plus all 25 sliding windows of 12 over 36 actions. Opening stats: seeds 0–1199, loop off / on.'};
if(process.argv[2])result.before=await measure(pathToFileURL(resolve(process.argv[2])+'/'));
result.after=await measure(new URL('../',import.meta.url));
result.openingProposals=Object.fromEntries(popOpeningStyles.map(style=>[style,Array.from({length:1200},(_,seed)=>openingTonicChoice(style,seed)).filter(n=>n===1).length]));
console.log(JSON.stringify(result,null,2));
