import {degreeToChord,chordToDegree} from './degree-chart.js?v=1.0.15';
import {parse,chordTones} from './music.js?v=1.0.15';

// Only authored diatonic chords change. Chromatic/borrowed/applied chords
// retain their functional degrees and qualities, including slash basses.
export function convertDegreeMode(chart,from,to){
 if(!['major','minor'].includes(from)||!['major','minor'].includes(to))throw Error('目前只支援大調與小調之間的明確轉換。');
 if(from===to)return structuredClone(chart);
 const halfDiminished=q=>{const c=parse('C'+q);return c.intervals.includes(3)&&c.intervals.includes(6)&&c.intervals.includes(10);};
 const major=q=>q===''||/^(maj|add|6|\()/.test(q),minor=q=>!halfDiminished(q)&&q.startsWith('m')&&!q.startsWith('maj');
 const extensionName={13:'b9',14:'9',15:'#9',17:'11',18:'#11',20:'b13',21:'13'};
 const withExtensions=(base,q)=>{const extensions=parse('C'+q).intervals.filter(n=>n>=13).map(n=>extensionName[n]);if(q.includes('no5'))extensions.push('no5');return base+(extensions.length?'('+extensions.join(',')+')':'');};
 const toMinor=q=>{const minor=q==='69'?'m6(9)':q.startsWith('maj')?'m'+q.slice(3):'m'+q;return /^m(?:7|9)#11$/.test(minor)?minor.replace('#11','(#11)'):minor;};
 const toMajor=q=>q==='m6(9)'?'69':q.startsWith('mMaj')?'maj'+q.slice(4):/^m(?:7|9|11|13)/.test(q)?'maj'+q.slice(1):q.slice(1);
 return chart.map(bar=>({chords:bar.chords.map(original=>{
  const c=structuredClone(original),d=c.degree,a=c.alteration,q=c.quality;
  if(from==='major'&&a===0){
   if([1,4].includes(d)&&major(q))c.quality=toMinor(q);
   else if(d===2&&minor(q))c.quality=withExtensions('m7b5',q);
   else if([3,6].includes(d)&&minor(q)){c.alteration=-1;c.quality=toMajor(q);}
   else if(d===7&&(q==='dim'||q==='dim7'||q==='m7b5')){c.alteration=-1;c.quality=q==='dim'?'':'7';}
  }else if(from==='minor'){
   if(a===0&&[1,4].includes(d)&&minor(q))c.quality=toMajor(q);
   else if(a===0&&d===2&&halfDiminished(q))c.quality=withExtensions('m7',q);
   else if(a===-1&&[3,6].includes(d)&&major(q)){c.alteration=0;c.quality=toMinor(q);}
   else if(a===-1&&d===7&&(major(q)||q==='7')){c.degree=5;c.alteration=0;}
  }
  if(c.bass&&(c.degree!==d||c.alteration!==a||c.quality!==q)){
   const key={root:0,mode:'major'},before=degreeToChord({...original,bass:null},key),after=degreeToChord({...c,bass:null},key);
   const bass=parse(degreeToChord(original,key)).bass,tones=chordTones(before),index=tones.findIndex(n=>parse(n).root===bass),next=chordTones(after);
   // Match the chord-tone letter role, not the array slot: conversion may
   // add a seventh or remove a sixth ahead of an explicit ninth.
   if(index>=0){const letters='CDEFGAB',role=(letters.indexOf(tones[index][0])-letters.indexOf(parse(before).rootName[0])+7)%7;
    const mapped=next.find(n=>(letters.indexOf(n[0])-letters.indexOf(parse(after).rootName[0])+7)%7===role);
    if(mapped)c.bass=chordToDegree('C/'+mapped,key).bass;
   }
  }
  degreeToChord(c,{root:0,mode:'major'}); // Reject unsupported qualities before committing a conversion.
  return c;
 })}));
}
