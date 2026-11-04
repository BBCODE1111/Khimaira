import {parse,mod} from './music.js?v=1.0.14';

export function voicingCandidates(symbol,voicing='close'){
 const c=parse(symbol);if(!c)return [];
 let ints=[...c.intervals];const maxUpper=5;
 const tensionIntervals={'b5':6,'#5':8,b9:13,'9':14,'#9':15,'11':17,'#11':18,b13:20,'13':21};
 const named=new Set((c.q.match(/(?:b|#)?(?:13|11|9|5)/g)||[]).map(n=>tensionIntervals[n]));
 // Only a root-position bass supplies a duplicate root. Slash voicings retain it.
 // Explicit rootless is the opt-in exception; protect register and #9 below.
 if(ints.some(n=>n>=13)&&c.bass===c.root||voicing==='rootless'&&ints.length>=4)ints=ints.filter(n=>n!==0);
 if(ints.includes(21)&&ints.includes(4)&&!named.has(17))ints=ints.filter(n=>n!==17);
 if(ints.length>maxUpper)ints=ints.filter(n=>n!==7);
 if(ints.length>maxUpper&&!named.has(17))ints=ints.filter(n=>n!==17);
 // A slash bass may already supply a guide tone. Remove only that duplicate
 // before dropping a named tension (e.g. Cmaj7(9,#11,13)/E keeps all three).
 if(ints.length>maxUpper&&c.bass!==c.root)ints=ints.filter(n=>mod(c.root+n)!==c.bass);
 if(ints.length>maxUpper)ints=ints.filter(n=>![6,8].includes(n)||named.has(n));
 if(ints.length>maxUpper){
  const guides=ints.filter(n=>[...(c.bass!==c.root&&voicing!=='rootless'?[0]:[]),3,4,10,11].includes(n));
  // alt is a palette, not a demand to sound every alteration at once. With
  // a retained slash root, prefer its b9/#9 pair over the implicit b13.
  const priority=n=>named.has(n)?200+n:c.q==='7alt'&&[13,15].includes(n)?100+n:n;
  const tensions=ints.filter(n=>!guides.includes(n)).sort((a,b)=>priority(b)-priority(a));
  ints=[...guides,...tensions].slice(0,maxUpper);
 }
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
