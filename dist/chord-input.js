import {parse,spellInterval,spellPitch,mod} from './music.js?v=1.0.7';
import {parseDegreeChart,materializeChart,degreeLabels} from './degree-chart.js?v=1.0.7';
const modes={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],locrian:[0,1,3,5,6,8,10]};
export function chordChoices(key){
 const scale=modes[key.mode]||modes.major;
 return scale.map((root,i)=>{
  const third=mod(scale[(i+2)%7]-root),fifth=mod(scale[(i+4)%7]-root);
  const quality=third===3?(fifth===6?'dim':'m'):fifth===8?'aug':'';
  const symbol=spellInterval(key.tonic,root,i)+quality;
  const seventh=mod(scale[(i+6)%7]-root);
  const seventhQuality=quality==='dim'?'m7b5':quality==='m'?(seventh===11?'mMaj7':'m7'):seventh===11?'maj7':'7';
  const label=degreeLabels(parseDegreeChart(symbol,key),key)[0][0];
  return {symbol,label,seventh:spellInterval(key.tonic,root,i)+seventhQuality};
 });
}
export function extraChordChoices(key){
 const secondary=chordChoices(key).filter(choice=>{const chord=parse(choice.symbol);return chord.root!==key.root&&!chord.intervals.includes(6);}).map(choice=>({label:'V7/'+choice.label,symbol:spellInterval(parse(choice.symbol).rootName,7,4)+'7'}));
 const borrowed=key.mode==='minor'?['I','ii','IV','vi']:key.mode==='major'?['iv','bVI','bVII']:[];
 return [...secondary,...borrowed.map(label=>{
  const c=parse(materializeChart(parseDegreeChart(label,key),key)[0].chords[0].symbol);
  // Match the contextual picker, including the raised sixth in minor keys.
  return {label,symbol:spellPitch(c.root,key)+c.q};
 })];
}
export const quickProgressions=[['I–V–vi–IV','I | V | vi | IV'],['vi–IV–I–V','vi | IV | I | V'],['ii–V–I','ii7 | V7 | Imaj7'],['1645','I | vi | IV | V'],['卡農','I | V | vi | iii | IV | I | IV | V']];
// Pure, shared website/JUCE edit contract. Actual pitches enter first; callers
// then reanalyse only in AUTO and save the result as degrees, with undo history.
export function editBackbone(bars,action,key){
 const result=structuredClone(bars),bar=Number(action.bar??0),chord=Number(action.chord??0);
 if(action.operation==='quick'){
  const preset=quickProgressions.find(([name])=>name===action.name);if(!preset)throw Error('Unknown progression');
  return materializeChart(parseDegreeChart(preset[1],key),key);
 }
 if(action.operation==='clearAll')return Array.from({length:Math.max(1,result.length)},()=>({chords:[]}));
 if(!Number.isInteger(bar)||bar<0||bar>=16)throw Error('Invalid bar');
 while(result.length<=bar)result.push({chords:[]});
 const list=result[bar].chords;
 if(action.operation==='select'){
  if(!parse(action.symbol))throw Error('Invalid chord');
  if(!Number.isInteger(chord)||chord<0||chord>=Math.max(1,list.length))throw Error('Invalid chord slot');
  if(!list.length)list.push({symbol:action.symbol,beats:4});else list[chord]={...list[chord],symbol:action.symbol};
 }else if(action.operation==='split'){
  if(list.length>2)throw Error('此小節已有多個和弦，請用進階輸入調整。');
  if(!list.length)list.push({symbol:chordChoices(key)[0].symbol,beats:4});
  if(list.length===1){const c=list[0];list.splice(0,1,{...c,beats:2},{...c,beats:2});}
 }else if(action.operation==='clear')result[bar]={chords:[]};
 else if(action.operation==='copy'){
  if(bar>=15)throw Error('最多 16 小節');result[bar+1]=structuredClone(result[bar]);
 }else if(action.operation==='move'){
  const to=Number(action.to);if(!Number.isInteger(to)||to<0||to>=result.length)throw Error('Invalid destination');
  [result[bar],result[to]]=[result[to],result[bar]];
 }else throw Error('Unknown backbone operation');
 return result;
}

// Only picker-created chords are respelled; typed/authored symbols stay literal.
export function spellSelectedChord(symbol,key,nextSymbol){
 const c=parse(symbol),next=parse(nextSymbol);if(!c)return symbol;
 let root=c.rootName;
 if(c.intervals.includes(3)&&c.intervals.includes(6)){
  if(next&&mod(next.root-c.root)===1)root=spellInterval(next.rootName,-1,-1);
  else if(next&&c.q==='m7b5'&&mod(c.root-next.root)===7)root=spellInterval(next.rootName,7,4);
  else if(['dim7','m7b5'].includes(c.q))root=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][c.root];
  else {
   const offset=mod(c.root-key.root),raised={1:0,3:1,6:3,8:4,10:5};
   if(key.mode==='major'&&raised[offset]!==undefined)root=spellInterval(key.tonic,offset,raised[offset]);
   if(key.mode==='minor'&&offset===9)root=spellInterval(key.tonic,9,5);
  }
 }
 return root+c.q+(c.bassName?'/'+c.bassName:'');
}
