import {parse,mod} from './music.js?v=piano-audit-1';

export function voicingCandidates(symbol,voicing='close'){
 const c=parse(symbol);if(!c)return [];
 let ints=[...c.intervals];
 // Bass supplies the root; extensions need space above the guide tones.
 if(ints.some(n=>n>=13)||voicing==='rootless'&&ints.length>=4)ints=ints.filter(n=>n!==0);
 if(ints.includes(21)&&ints.includes(4))ints=ints.filter(n=>n!==17);
 if(ints.length>5)ints=ints.filter(n=>n!==7);
 if(ints.length>5)ints=ints.filter(n=>n!==17);
 if(ints.length>5)ints=ints.filter(n=>![6,8].includes(n));
 if(ints.length>5){const guides=ints.filter(n=>[3,4,10,11].includes(n));ints=[...guides,...ints.filter(n=>!guides.includes(n)).sort((a,b)=>b-a)].slice(0,5);}
 const pcs=[...new Set(ints.map(n=>mod(c.root+n)))].sort((a,b)=>a-b),out=[];
 for(let inv=0;inv<pcs.length;inv++)for(const shift of [0,12]){
  const seq=pcs.slice(inv).concat(pcs.slice(0,inv));let upper=seq.map(n=>48+n+shift);
  for(let i=1;i<upper.length;i++)while(upper[i]<=upper[i-1])upper[i]+=12;
  while(upper[0]<52)upper=upper.map(n=>n+12);
  if(voicing==='open'&&upper.length>=4){upper[1]+=12;upper.sort((a,b)=>a-b);}
  const third=upper.find(n=>mod(n-c.root)===4);
  if(c.intervals.includes(15)&&third!==undefined)upper=upper.map(n=>mod(n-c.root)===3&&n<third?n+12:n);
  // Keep root above major seventh from becoming a semitone cluster.
  const seventh=upper.find(n=>mod(n-c.root)===11);
  if(seventh!==undefined)upper=upper.map(n=>mod(n-c.root)===0&&n-seventh===1?n+12:n);
  upper.sort((a,b)=>a-b);if(upper.at(-1)>88)continue;
  let bass=36+c.bass;while(upper[0]-bass<12)bass-=12;
  out.push([bass,...upper]);
 }
 const spaced=out.filter(v=>v.slice(2).every((n,i)=>n-v[i+1]>1));
 return spaced.length?spaced:out;
}
