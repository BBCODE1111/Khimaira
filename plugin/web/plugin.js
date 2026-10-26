import {compilePattern} from './pattern.js';
import {restoreSession,selectExample,loadExample,generateSession,loadBackbone,keepResult} from './session.js';
import {names,parse} from './engine/music.js';
import {parseChart} from './engine/solutions.js';
import {styles,styleLabels} from './engine/style-engine.js';
import {examplePool} from './engine/example-pool.js';
import {patterns} from './engine/performance.js';
import {arpModes,arpRates} from './engine/arpeggiator.js';
import {invertChord,insertCadence} from './engine/harmony-actions.js';
const $=id=>document.getElementById(id),clone=o=>structuredClone(o);
const native=!!window.__JUCE__?.backend;let pending=new Map,callId=0;
if(native)window.__JUCE__.backend.addEventListener('__juce__complete',({promiseId,result})=>{pending.get(promiseId)?.(result);pending.delete(promiseId);});
const invoke=(name,...params)=>native?new Promise(resolve=>{const resultId=callId++;pending.set(resultId,resolve);window.__JUCE__.backend.emitEvent('__juce__invoke',{name,params,resultId});}):Promise.resolve(name==='snapshot'?null:name==='status'?{host:false,standalone:true,bpm:120}:{ok:true});
let state={bars:parseChart('| C | Am | F | G |'),source:parseChart('| C | Am | F | G |'),style:'Jazz',key:0,mode:'major',length:4,randomness:'medium',pattern:'jazz',voicing:'rootless',gate:82,human:20,swing:16,rate:.5,seed:42,bassMode:'root',balladEntry:'together',arpFoundation:'off',arpAccent:'beat',density:3,freedom:'color',arpMode:'upDown',arpRate:'16',arpOctaves:2,arpPhase:'flow',arpSeed:1,variation:0,exampleId:null,mood:'輸入骨幹後 GENERATE；範例需按 LOAD 才載入。'};
state=restoreSession(state);
$('input').addEventListener('input',()=>{state.sourceText=$('input').value;invoke('saveUi',clone(state));});
let hostBpm=120,chartPage=0;
let selected=[0,0],history=[],syncSerial=0,isHost=true,isLoop=true,isPlaying=false;
function message(s){$('message').textContent=s;}
function checkpoint(){history.push(clone(state));if(history.length>32)history.shift();}
function attempt(fn){try{fn();}catch(e){message(e.message);}}
for(const groupName of ['現代流行與和聲','黑暗／重型與另類','跨文化流行與舞曲','地域調式與器樂靈感']){let g=document.createElement('optgroup');g.label=groupName;for(const [id,s]of Object.entries(styles))if((s.group||'現代流行與和聲')===groupName)g.append(new Option(styleLabels[id]||id,id));$('style').append(g);}
for(const id of ['key','root','bass'])names.forEach((n,i)=>$(id).add(new Option(n,id==='key'?i:n)));
Object.entries(patterns).filter(([id])=>id==='arp'||!id.startsWith('arp')).forEach(([id,label])=>$('pattern').add(new Option(label,id)));
Object.entries(arpModes).forEach(([id,[label]])=>$('arpMode').add(new Option(label,id)));['4','8','8T','16','24','32'].forEach(id=>$('arpRate').add(new Option(arpRates[id].label,id)));
['','m','5','sus2','sus4','6','m6','add9','madd9','maj7','m7','7','dim','dim7','m7b5','aug','maj9','m9','9','7b9','7#9','11','maj11','m11','13','maj13','m13','7sus4','7alt'].forEach(q=>$('quality').add(new Option(q||'Major',q)));
const controls=['style','key','mode','randomness','pattern','voicing','gate','human','arpMode','arpRate','arpOctaves','arpPhase','arpSeed','arpAccent','arpFoundation','swing','bassMode','balladEntry','rate','seed','density','freedom'];
function render(){
 controls.forEach(id=>$(id).value=state[id]);if(![...$('bars').options].some(o=>+o.value===+state.length))$('bars').add(new Option(state.length,state.length));$('bars').value=state.length;if($('input').value!==state.sourceText)$('input').value=state.sourceText;$('mood').textContent=state.mood;$('gateText').textContent=state.gate+'%';$('humanText').textContent=state.human+'%';
 const pool=examplePool(state.style);$('example').replaceChildren(new Option('選擇範例 · '+pool.length+' EXAMPLES',''));pool.forEach(p=>$('example').add(new Option(p.title,p.id)));$('example').value=state.exampleId||'';$('loadExample').disabled=!pool.some(p=>p.id===state.exampleId);
 $('chart').replaceChildren();state.bars.forEach((b,i)=>{if(Math.floor(i/4)!==chartPage)return;const bar=document.createElement('div');bar.className='bar';bar.dataset.bar=i;const label=document.createElement('label');label.textContent='BAR '+String(i+1).padStart(2,'0')+'　4/4';bar.append(label);let row=document.createElement('div');row.className='chords';b.chords.forEach((c,j)=>{let btn=document.createElement('button');btn.className='chord'+(selected[0]===i&&selected[1]===j?' sel':'');btn.style.flex=1;btn.title=c.symbol+' · '+c.beats+' beats';btn.append(document.createTextNode(c.symbol));let beats=document.createElement('span');beats.textContent=c.beats+' beats';btn.append(beats);btn.onclick=()=>{selected=[i,j];render();};btn.ondblclick=openEdit;row.append(btn);});bar.append(row);$('chart').append(bar);});$('selectedLabel').textContent='BAR '+(selected[0]+1);$('undo').disabled=!history.length;$('prevPage').disabled=chartPage===0;$('nextPage').disabled=(chartPage+1)*4>=state.bars.length;
}
async function sync(){let serial=++syncSerial;const pattern=compilePattern(state,hostBpm);$('noteCount').textContent=pattern.notes.length+' NOTES · '+state.bars.length+' BARS · MIDI CH 1';let result=await invoke('update',pattern);if(serial===syncSerial)message(result?.ok?(isPlaying?'新設定將在下一小節生效':native?'MIDI ready · 拖曳底部 DRAG MIDI 到 DAW':'DESIGN PREVIEW'):result?.message||'Native connection unavailable');}
function commit(){render();sync().catch(e=>message(e.message));}
function change(fn){attempt(()=>{const next=fn(state);checkpoint();state=next;selected=[0,0];chartPage=0;commit();});}
$('load').onclick=()=>change(loadBackbone);
$('keep').onclick=()=>change(keepResult);
function chooseExample(id){attempt(()=>{state=selectExample(state,id);render();invoke('saveUi',clone(state));message('範例已選取 · 按 LOAD 載入；播放譜維持原樣。');});}
$('inspire').onclick=()=>chooseExample();
$('example').onchange=()=>{if($('example').value)chooseExample($('example').value);};
$('loadExample').onclick=()=>change(loadExample);
$('generate').onclick=()=>change(generateSession);
controls.forEach(id=>$(id).onchange=()=>attempt(()=>{checkpoint();state[id]=$(id).value;if(id==='style'){let cfg=styles[state.style];state.pattern=cfg.pattern;state.voicing=cfg.voicing;state.mode=cfg.world?'modal':cfg.defaultMode||(['Minor blues','Neoclassical rock'].includes(state.style)?'minor':'major');state.exampleId=null;state.mood=cfg.description;}commit();}));
$('bars').onchange=()=>{state.length=+$('bars').value;invoke('saveUi',clone(state));message('按 LOAD 或 GENERATE 套用小節數。');};
$('variate').onclick=()=>{checkpoint();state.arpSeed++;commit();};$('undo').onclick=()=>{if(history.length){state={...history.pop(),sourceText:state.sourceText,source:state.source};selected=[0,0];chartPage=0;commit();}};
function chord(){return state.bars[selected[0]]?.chords[selected[1]];}
$('invert').onclick=()=>attempt(()=>{if(!chord())throw Error('請先選擇和弦');checkpoint();chord().symbol=invertChord(chord().symbol);commit();});
$('cadence').onclick=()=>attempt(()=>{let out=insertCadence(state.bars,...selected,{loop:isLoop});checkpoint();state.bars=out.bars;state.mood='ii–V → '+out.target;commit();});
function openEdit(){if(!chord())return;const c=parse(chord().symbol);$('root').value=names[c.root];$('quality').value=c.q;$('bass').value=c.bass===c.root?'':names[c.bass];$('symbol').value=c.symbol;$('editor').showModal();}
$('edit').onclick=openEdit;['root','quality','bass'].forEach(id=>$(id).onchange=()=>{$('symbol').value=$('root').value+$('quality').value+($('bass').value?'/'+$('bass').value:'');});
$('applyEdit').onclick=()=>attempt(()=>{let s=$('symbol').value.trim();if(!parse(s))throw Error('無法辨識此和弦');checkpoint();chord().symbol=s;$('editor').close();commit();});
function updateTransport(t){isHost=!!t.host;isPlaying=!!t.playing;hostBpm=+t.bpm||120;$('host').setAttribute('aria-pressed',isHost);$('play').setAttribute('aria-pressed',isPlaying);$('bpm').disabled=!t.standalone;$('bpm').value=Math.round(hostBpm);$('clock').textContent=t.playing?(t.preview?'PREVIEW · ':'HOST · ')+'BAR '+(Math.floor(t.beat/4)+1)+' · BEAT '+(Math.floor(t.beat%4)+1):isHost?'HOST · 按 DAW / PLAY':'READY · 按 PLAY';
 if(t.playing){const page=Math.floor(t.beat/16);if(page!==chartPage){chartPage=page;render();}}
 document.querySelectorAll('.bar').forEach(b=>b.classList.toggle('active',t.playing&&+b.dataset.bar===Math.floor(t.beat/4)));
}
$('prevPage').onclick=()=>{chartPage=Math.max(0,chartPage-1);render();};$('nextPage').onclick=()=>{chartPage=Math.min(Math.ceil(state.bars.length/4)-1,chartPage+1);render();};
$('advancedToggle').onclick=()=>{$('advanced').showModal();$('advancedToggle').setAttribute('aria-expanded','true');};
$('advancedClose').onclick=()=>$('advanced').close();$('advanced').onclose=()=>$('advancedToggle').setAttribute('aria-expanded','false');
$('host').onclick=async()=>updateTransport(await invoke('transport',{host:!isHost}));$('loop').onclick=()=>{isLoop=!isLoop;$('loop').setAttribute('aria-pressed',isLoop);invoke('transport',{loop:isLoop});};$('play').onclick=async()=>{updateTransport(await invoke('transport',{play:true}));};$('stop').onclick=async()=>updateTransport(await invoke('transport',{play:false}));$('bpm').onchange=()=>invoke('transport',{bpm:+$('bpm').value});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&!$('editor').open&&!$('advanced').open){e.preventDefault();(isPlaying?$('stop'):$('play')).click();}});
if(native)window.__JUCE__.backend.addEventListener('transportState',updateTransport);else $('version').textContent='DESIGN PREVIEW / 1.2.0';
try{let saved=await invoke('snapshot');if(saved?.ui?.bars){state=restoreSession(state,saved.ui);isLoop=saved.transportLoop??true;$('loop').setAttribute('aria-pressed',isLoop);}updateTransport(await invoke('status'));render();await sync();}catch(e){message(e.message);}
