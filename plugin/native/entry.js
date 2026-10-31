import * as product from '@product';
import {midiSafeNotes} from './midi-notes.js';
import {pedalIntervals,pedalMidiEvents} from '@site/piano-pedal.js';
const clone=x=>JSON.parse(JSON.stringify(x));
globalThis.structuredClone ||= clone;
const isSeiren=PRODUCT==='Seiren';
function defaults(){return {bars:product.parseChart('| C | Am | F | G |'),sourceText:'| C | Am | F | G |',style:isSeiren?'Mandopop':'Jazz',key:0,mode:'major',length:4,randomness:'medium',pattern:isSeiren?'popHalf':'jazz',genreRevision:isSeiren?1:2,voicing:'close',gate:82,human:20,swing:16,arpSwing:0,arpGate:82,arpHuman:0,rate:.5,seed:42,bassMode:'root',balladEntry:'together',arpFoundation:'off',arpAccent:'beat',density:isSeiren?3:2,freedom:isSeiren?'color':'morph',techniques:{inversion:true,parallel:true,iiV:true},preserveBass:false,arpMode:'upDown',arpRate:'16',arpOctaves:2,arpPhase:'flow',arpSeed:1,variation:0,exampleId:null,pianoRevision:2,pianoPhrase:isSeiren?'auto':'original',pianoFills:'phrase',melodyFollow:'gentle',melodyText:'',melody:[],policy:'strict',meter:{numerator:4,denominator:4},barBeats:4,midiPedal:false};}
function restore(old){const s={...defaults(),...old};if(Object.keys(old).length){s.genreRevision=old.genreRevision??1;s.pianoRevision=old.pianoRevision??1;s.pianoPhrase=old.pianoPhrase||'original';if(old.arpSwing==null)s.arpSwing=old.pattern==='arp'&&![8,16].includes(+old.swing)?(+old.swing||0):0;s.arpHuman=old.arpHuman??0;}return s;}
function options(s){return {...s,key:s.legacyRenderKey||{root:+s.key,mode:s.mode},gate:(s.pattern==='arp'?(s.arpGate??82):s.gate)/100,human:(s.pattern==='arp'?s.arpHuman:s.human)/100,swing:(s.pattern==='arp'?s.arpSwing:s.swing)/100,bpm:s.bpm||120,pianoFills:s.pianoFills,barBeats:s.barBeats};}
function compile(s){const o=options(s),plan=product.voicePlan(s.bars,o);const notes=s.pattern==='arp'?[]:midiSafeNotes(product.render(s,o));const length=s.bars.length*s.barBeats;const spans=plan.map(c=>({start:c.beat,end:c.beat+c.beats,symbol:c.symbol}));return {schema:3,notes,length,plan,melody:s.melody,pedal:s.midiPedal?pedalMidiEvents(pedalIntervals({chordSpans:spans,notes:notes.length?notes:[{start:0,end:length}],melody:s.melody,totalBeats:length}),480):[],ui:s};}
export function call(request){const {action='init',state={},value,key}=request;let s=restore(state);
if(!isSeiren){
 if(action!=='init'&&!state.harmony&&state.sourceText==null&&(state.source||state.bars))delete s.sourceText;
 const handled=Reflect.get(product,'harmonyCommand')(s,action,value,key);if(handled)return compile(handled);
}
switch(action){
case 'metadata':return {product:PRODUCT,patterns:Object.entries(product.patterns).filter(([id])=>!id.startsWith('arp')||id==='arp').map(([id,label])=>({id,label,...(!isSeiren?{legacyLabel:Reflect.get(product,'performanceLabel')(id,1)}:{})})),styles:Object.keys(product.styles).map(id=>({id,label:product.styleLabels[id]||id}))};
case 'examples':return (isSeiren?product.examplePool(s.style):Reflect.get(product,'examplesForState')(s)).map(p=>({id:p.id,label:p.title}));
case 'set':s[key]=value;if(['pattern','style','pianoPhrase'].includes(key))s.pianoRevision=2;if(key==='pattern'&&value==='arp')s.arpSwing=0;if(key==='style'){const cfg=product.styles[value];s.pattern=cfg.pattern;s.voicing=cfg.voicing;s.exampleId=null;}break;
case 'load':s.bars=product.parseChart(s.sourceText,s.barBeats);s.length=s.bars.length;break;
case 'keep':s.sourceText=product.serialize(s.bars);break;
case 'generate':s.variation++;s.bars=product.generate(s);s.length=s.bars.length;break;
case 'example':{const p=product.examplePool(s.style).find(p=>p.id===value);if(!p)throw Error('Choose an example first / 請先選擇範例');s.exampleId=p.id;s.bars=product.parseChart(p.chart).map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:product.transposeSymbol(c.symbol,+s.key-(p.key||0),+s.key)}))}));s.length=s.bars.length;break;}
case 'demo':s.melody=product.demo();s.bars=product.generate(s);s.length=s.bars.length;break;
case 'melody':s.melody=value;s.bars=product.generate(s);s.length=s.bars.length;break;
case 'transpose':s.key=(+s.key+value+12)%12;s.bars=s.bars.map(b=>({...b,chords:b.chords.map(c=>({...c,symbol:product.transposeSymbol(c.symbol,value,s.key)}))}));s.melody=s.melody.map(n=>({...n,pitch:n.pitch+value}));break;
case 'invert':s.bars[value].chords[0].symbol=product.invertChord(s.bars[value].chords[0].symbol);break;
case 'edit':s.bars[value.bar]={chords:product.parseChart(value.text,s.barBeats)[0].chords};break;
}
return compile(s);}
globalThis.nativeCall=function(json){try{return JSON.stringify({ok:true,result:call(JSON.parse(json))});}catch(e){return JSON.stringify({ok:false,message:String(e.message||e)+" "+String(e.stack||'')});}};
