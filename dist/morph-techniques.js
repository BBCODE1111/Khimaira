import {parse, mod, spellInterval, chordTones} from './music.js?v=1.0.14';

// Parallel modes use the SAME numbered degree, not the same chromatic root.
// Keep this separate from whole-chart mode conversion (which retains minor V).
export function parallelDegreeChord(symbol, key) {
 const c = parse(symbol);
 if (!c || !['major', 'minor'].includes(key.mode)) return null;
 const major = [0, 2, 4, 5, 7, 9, 11], minor = [0, 2, 3, 5, 7, 8, 10];
 const qualities = {major: ['', 'm', 'm', '', '', 'm', 'dim'], minor: ['m', 'dim', '', 'm', 'm', '', '']};
 const from = key.mode, to = from === 'major' ? 'minor' : 'major';
 const index = (from === 'major' ? major : minor).indexOf(mod(c.root - key.root));
 if (index < 0) return null;
 const sevenths={major:['maj7','m7','m7','maj7','7','m7','m7b5'],minor:['m7','m7b5','maj7','m7','m7','maj7','7']};
 let quality;
 if(c.q===qualities[from][index])quality=qualities[to][index];
 else if(c.q===sevenths[from][index])quality=sevenths[to][index];
 else if(['9','11','13'].some(n=>c.q===sevenths[from][index].replace(/7$/,n))&&!sevenths[from][index].includes('b5')){
  const extension=c.q.match(/(9|11|13)$/)?.[0];
  quality=sevenths[to][index].includes('b5')?'m7b5':sevenths[to][index].replace(/7$/,extension);
 }else return null;
 const offset = (to === 'major' ? major : minor)[index];
 const result=spellInterval(key.tonic || spellInterval(c.rootName, -mod(c.root-key.root), -index), offset, index) + quality;
 if(!c.bassName)return result;
 const position=c.intervals.findIndex(n=>mod(c.root+n)===c.bass);
 const bass=position<0?c.bassName:chordTones(result)[position]||c.bassName;
 // A retained non-chord bass must not become the new root's major seventh.
 if(mod(parse(result+'/'+bass).bass-parse(result).root)===11)return symbol;
 return result+'/'+bass;
}

export function invertForMorph(symbol,seed=0,{powerBass=false}={}) {
 const c = parse(symbol);
 if(powerBass&&c.q==='5')return symbol;
 const choices=c.intervals.filter(n=>[3,4,5,6,7,8,10,11].includes(n));
 const interval=choices[Math.floor(seed/3)%choices.length];
 if (interval === undefined) return symbol;
 const bass = spellInterval(c.rootName, interval, interval>=10?6:interval===5?3:interval>=6?4:2);
 return c.rootName + c.q + '/' + bass;
}

// Check the rendered adjacency, including inserted approaches and loop wrap.
// Authored seventh basses and manual INVERT remain unrestricted.
export function resolveAutomaticBass(bars,source,{loop=true}={}) {
 const events=bars.flatMap(b=>b.chords.length?b.chords:[{symbol:'N.C.'}]);
 const seventhBass=c=>c&&((!c.minor&&c.intervals.includes(10)&&mod(c.bass-c.root)===10)||(c.intervals.includes(11)&&mod(c.bass-c.root)===11));
 let changed;
 do {
  changed=false;
  for(let i=events.length-1;i>=0;i--){
   const event=events[i],c=parse(event.symbol),address=event.morph?.source;
   if(!seventhBass(c)||!address)continue;
   const original=parse(source[address.bar]?.chords[address.chord]?.symbol);
   if(seventhBass(original)&&original.root===c.root&&original.bass===c.bass)continue;
   const next=parse((events[i+1]||(loop?events[0]:null))?.symbol);
   if(next&&[1,2].includes(mod(c.bass-next.bass)))continue;
   // Reject this inversion without moving the next protected arrival.
   event.symbol=original?.bassName&&!seventhBass({...c,bass:original.bass})
    ?c.rootName+c.q+'/'+original.bassName
    :original?.bassName?original.symbol:c.rootName+c.q;
   if(event.morph.technique==='inversion')event.morph.technique='color';
   changed=true;
  }
  // Rejecting one bass can invalidate its predecessor, including across wrap.
 }while(changed);
 return bars;
}
