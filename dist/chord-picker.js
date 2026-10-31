import {rootPicker} from './root-picker.js?v=1.0.4';
import {chordChoices,extraChordChoices,quickProgressions} from './chord-input.js?v=1.0.4';
import {parse,spellPitch,chordTones} from './music.js?v=1.0.4';
import {materializeChart} from './degree-chart.js?v=1.0.4';
export function mountChordPicker({state,dispatch,select,editScore}){
 const panel=document.createElement('section');panel.id='chordPicker';panel.className='chord-picker';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','點按編輯骨幹');
 document.getElementById('grid').after(panel);
 let activeBar=0,activeChord=0,trigger=null;
 const close=()=>{panel.hidden=true;(trigger?.isConnected?trigger:document.getElementById('editBackbone'))?.focus();};
 const button=(label,fn,attrs={})=>{const b=document.createElement('button');b.type='button';b.textContent=label;for(const [k,v] of Object.entries(attrs))b.setAttribute(k,v);b.onclick=fn;return b;};
 const act=(operation,extra={})=>{const ok=dispatch({type:'backboneEdit',operation,bar:activeBar,chord:activeChord,...extra},{resetDraft:true,message:'已更新骨幹；GENERATE 從這組進行變化，可 UNDO。'});if(ok){open(activeBar,activeChord,false);panel.querySelector('.root-picker [aria-pressed="true"]')?.focus({preventScroll:true});}};
 const choose=symbol=>{act('select',{symbol});};
 function open(bar,chord=0,focus=true){
  if(focus)trigger=document.activeElement;activeBar=bar;activeChord=chord;const s=state(),key=s.key,source=materializeChart(s.backbone.degrees,key);
  activeChord=Math.min(activeChord,Math.max(0,(source[bar]?.chords.length||1)-1));
  panel.replaceChildren();panel.hidden=false;
  const header=document.createElement('div');header.className='picker-heading';const title=document.createElement('strong');title.textContent=`BAR ${bar+1} · 編輯骨幹`;
  const barSelect=document.createElement('select');barSelect.setAttribute('aria-label','編輯骨幹小節');source.forEach((_,i)=>barSelect.add(new Option(`BAR ${i+1}`,i)));barSelect.value=bar;barSelect.onchange=()=>open(+barSelect.value,0,false);
  header.append(title,barSelect,button('關閉',close,{'aria-label':'關閉和弦選擇'}));panel.append(header);
  if(source[bar]?.chords.length>1){const halves=document.createElement('div');halves.className='picker-halves';source[bar].chords.forEach((c,i)=>halves.append(button(`${i+1} · ${c.symbol}`,()=>open(bar,i,false),{'aria-pressed':String(i===activeChord),'data-half':i})));panel.append(halves);}
  const grid=document.createElement('div');grid.className='picker-choices';const choices=chordChoices(key);
  for(const c of choices)grid.append(button(`${c.symbol}  ${c.label}`,()=>choose(c.symbol),{'data-choice':c.symbol}));panel.append(grid);
  const actions=document.createElement('div');actions.className='picker-actions';actions.append(button('分成兩半',()=>{act('split');},{'data-picker-action':'split'}),button('清除此小節',()=>act('clear'),{'data-picker-action':'clear'}),button('複製到下一小節',()=>act('copy'),{'data-picker-action':'copy'}));panel.append(actions);
  const move=document.createElement('select');move.setAttribute('aria-label','交換到小節');source.forEach((_,i)=>move.add(new Option(`BAR ${i+1}`,i)));move.value=bar;
  actions.append(move,button('交換位置',()=>act('move',{to:+move.value})));
  const more=document.createElement('details'),summary=document.createElement('summary');summary.textContent='更多和弦 · 七和弦、色彩、轉位';more.append(summary);
  const sevens=document.createElement('div');sevens.className='picker-choices';for(const c of choices)sevens.append(button(c.seventh,()=>choose(c.seventh),{'data-choice':c.seventh}));more.append(sevens);
  const extra=document.createElement('div');extra.className='picker-choices';for(const c of extraChordChoices(key))extra.append(button(`${c.symbol} ${c.label}`,()=>choose(c.symbol),{'data-choice':c.symbol}));more.append(extra);
  const current=source[bar]?.chords[activeChord]?.symbol||choices[0].symbol,c=parse(current),controls=document.createElement('div');controls.className='picker-custom';
  const root=document.createElement('select');root.setAttribute('aria-label','任意根音');for(let i=0;i<12;i++)root.add(new Option(spellPitch(i,key),i));root.value=c.root;
  const quality=document.createElement('select');quality.setAttribute('aria-label','和弦性質');for(const q of ['','m','7','maj7','m7','9','maj9','m9','sus2','sus4','add9','6','m6','m7b5','dim','dim7','aug','13','7#11'])quality.add(new Option(q||'大三',q));if(![...quality.options].some(o=>o.value===c.q))quality.add(new Option(c.q,c.q));quality.value=c.q;
  const bass=document.createElement('select');bass.setAttribute('aria-label','轉位低音');bass.add(new Option('根音',''));for(let i=0;i<12;i++)bass.add(new Option('/'+spellPitch(i,key),i));bass.value=c.bassName?c.bass:'';
  controls.append(root,quality,bass,button('套用和弦',()=>choose(root.selectedOptions[0].textContent+quality.value+(bass.value!==''?'/'+bass.selectedOptions[0].textContent.slice(1):'')),{'data-picker-action':'apply'}));
  const inversions=document.createElement('div');inversions.className='picker-choices';const tones=chordTones(current);for(const i of [1,2])if(tones[i])inversions.append(button(`${c.rootName+c.q}/${tones[i]}`,()=>choose(c.rootName+c.q+'/'+tones[i])));
  const roots=rootPicker(key,c.root,value=>{root.value=value;quality.focus();});
  header.after(roots,controls);more.append(inversions);panel.append(more);
  if(focus){roots.querySelector('button')?.focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'smooth'});}
 }
 function decorate(){
  const s=state();let chips=document.getElementById('quickProgressions');if(!chips){chips=document.createElement('div');chips.id='quickProgressions';chips.className='quick-progressions';document.getElementById('grid').before(chips);}
  chips.replaceChildren();chips.hidden=s.backbone.degrees.some(b=>b.chords.length);
  if(!chips.hidden)for(const [name] of quickProgressions)chips.append(button(name,()=>act('quick',{name})));
  document.querySelectorAll('#grid .bar').forEach((bar,i)=>{
   bar.oncontextmenu=e=>{e.preventDefault();editScore(i,0);};
   let timer=null;bar.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')timer=setTimeout(()=>editScore(i,0),550);});for(const event of ['pointerup','pointercancel','pointermove'])bar.addEventListener(event,()=>clearTimeout(timer));
   bar.querySelectorAll('.chord-event').forEach((b,j)=>b.onclick=()=>{panel.hidden=true;editScore(i,j);});
   if(!bar.querySelector('.chord-event')){const add=button('＋ 選和弦',()=>open(i,0),{'data-empty-bar':i});add.className='empty-chord';bar.querySelector('.chord-lane').append(add);}
  });
  if(!panel.hidden)open(Math.min(activeBar,Math.max(0,s.backbone.degrees.length-1)),activeChord,false);
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();close();}});
 return {open,decorate,close};
}
