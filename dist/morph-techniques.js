import {parse, mod, spellInterval} from './music.js?v=1.0.3';

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
 return spellInterval(key.tonic || spellInterval(c.rootName, -mod(c.root-key.root), -index), offset, index) + quality;
}

export function invertForMorph(symbol) {
 const c = parse(symbol);
 const interval = c.intervals.find(n => n === 3 || n === 4) ?? c.intervals.find(n => n === 5 || n === 7);
 if (interval === undefined) return symbol;
 const bass = spellInterval(c.rootName, interval, interval === 5 ? 3 : interval === 7 ? 4 : 2);
 return c.rootName + c.q + '/' + bass;
}
