import {parse,names,mod,spellInterval} from './music.js?v=1.0.7';
import {chordList} from './solutions.js?v=1.0.7';
import {insertApproach,cadenceTo} from './style-engine.js?v=1.0.7';

// Resolve to the next sounding event. Never skip a rest or overwrite a target.
export function insertCadence(bars,barIndex,chordIndex,{loop=false,startBar=0}={}){
 startBar=Math.max(0,Math.min(bars.length-1,Math.trunc(startBar)||0));
 const list=chordList(bars[barIndex]||{}),current=list[chordIndex];
 if(!current)throw Error('請先選擇一個和弦。');
 const next=list[chordIndex+1]||(barIndex+1<bars.length?chordList(bars[barIndex+1])[0]:loop?chordList(bars[startBar])[0]:null);
 if(!next)throw Error('後方沒有相鄰和弦可解決；最後一小節可開啟 LOOP 連回開頭。');
 const target=parse(next.symbol);
 if(!target||target.intervals.includes(6)||target.intervals.includes(8)||!target.intervals.some(n=>n===3||n===4))throw Error('下一個和弦沒有明確的大／小三和弦核心，請改用手動編輯安排接近。');
 if(current.beats<1)throw Error('這段沒有足夠空間放入接近和弦；請先留至少一拍。');
 const out=structuredClone(bars);
 const pair=cadenceTo(next.symbol);
 const replacement=list.length>=4?[{symbol:pair[1],beats:current.beats}]:list.length===3?pair.map(symbol=>({symbol,beats:current.beats/2})):insertApproach([current],next.symbol);
 const previous=list[chordIndex-1]||(barIndex>startBar?chordList(bars[barIndex-1]).at(-1):loop?chordList(bars.at(-1)).at(-1):null);
 if(replacement.length===2&&previous&&parse(previous.symbol).root===parse(replacement[0].symbol).root){replacement[1].beats+=replacement[0].beats;replacement.splice(0,1);}
 if(replacement.length===3&&[current,previous].some(c=>c&&parse(c.symbol).root===parse(replacement[1].symbol).root)){replacement[2].beats+=replacement[1].beats;replacement.splice(1,1);}
 out[barIndex].chords.splice(chordIndex,1,...replacement);
 out[barIndex].reason=`ii–V → ${next.symbol}`;
 return {bars:out,target:next.symbol,kind:replacement.length===1?'V':'ii–V'};
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
