import {parse,names,mod,spellInterval} from './music.js?v=morph-1';
import {chordList} from './solutions.js?v=morph-1';
import {insertApproach} from './style-engine.js?v=morph-1';

// Resolve to the next sounding event. Never skip a rest or overwrite a target.
export function insertCadence(bars,barIndex,chordIndex,{loop=false}={}){
 const list=chordList(bars[barIndex]||{}),current=list[chordIndex];
 if(!current)throw Error('請先選擇一個和弦。');
 const next=list[chordIndex+1]||(barIndex+1<bars.length?chordList(bars[barIndex+1])[0]:loop?chordList(bars[0])[0]:null);
 if(!next)throw Error('後方沒有相鄰和弦可解決；最後一小節可開啟 LOOP 連回開頭。');
 const target=parse(next.symbol);
 if(!target||target.intervals.includes(6)||target.intervals.includes(8)||!target.intervals.some(n=>n===3||n===4))throw Error('下一個和弦沒有明確的大／小三和弦核心，請改用手動編輯安排接近。');
 if(list.length>2||current.beats<2)throw Error('這段沒有足夠空間放入 ii–V；請先合併和弦或留至少兩拍。');
 const out=structuredClone(bars);
 out[barIndex].chords.splice(chordIndex,1,...insertApproach([current],next.symbol));
 out[barIndex].reason=`ii–V → ${next.symbol}`;
 return {bars:out,target:next.symbol};
}
export function invertChord(symbol){
 const c=parse(symbol);if(!c)throw Error('請先選擇和弦。');
 // Extensions are not traditional inversion bass notes. Includes altered fifths and diminished seventh.
 const core=c.intervals.filter(n=>n<12&&(n!==9||c.q.startsWith('dim7'))),index=core.findIndex(n=>mod(c.root+n)===c.bass);
 const bass=mod(c.root+core[(index+1)%core.length]);
 return c.rootName+c.q+(bass===c.root?'':'/'+spellInterval(c.rootName,core[(index+1)%core.length],({0:0,3:2,4:2,5:3,6:4,7:4,8:4,9:6,10:6,11:6})[core[(index+1)%core.length]]));
}
export function parallelColor(symbol){
 const c=parse(symbol);if(!c)throw Error('請先選擇和弦。');
 const pairs={'':'m',m:'','6':'m6',m6:'6',add9:'madd9',madd9:'add9',maj7:'m7',m7:'maj7','7':'m7',maj9:'m9',m9:'maj9','9':'m9',maj11:'m11',m11:'maj11','11':'m11',maj13:'m13',m13:'maj13','13':'m13'};
 const match=c.q.match(/^([^()]*)(\(.*\))?$/),q=pairs[match?.[1]];
 if(q===undefined)throw Error('此和弦含特殊結構，請用 EDIT 選擇色彩，避免丟失重要和弦音。');
 const result=c.rootName+q+(match[2]||''),changed=parse(result);
 // Keep an existing slash bass only if it remains a chord tone after the change.
 return result+(c.bass!==c.root&&changed.pcs.includes(c.bass)?'/'+c.bassName:'');
}
