import {morphTraceText,morphHistoryLabel} from './morph-presentation.js?v=1.0.7';
import {spellSelectedChord} from './chord-input.js?v=1.0.7';
import {mountScoreFollow} from './score-follow.js?v=1.0.7';
import {rootPicker} from './root-picker.js?v=1.0.7';
import {readSession} from './session-storage.js?v=1.0.7';
import {mountChordPicker} from './chord-picker.js?v=1.0.7';
import {selectGenre,swingDescription,genreProfiles} from './genre-rhythm.js?v=1.0.7';
import {referenceNotes} from './melody-reference.js?v=1.0.7';
import {mountPianoTools} from './piano-tools.js?v=1.0.7';
import {arpModes,arpRates,arpPresets} from './arpeggiator.js?v=1.0.7';
import {examplesForKey} from './keyed-examples.js?v=1.0.7';
import {createHarmony,migrateHarmony,applyHarmonyAction,effectiveKey,harmonyView} from './harmony-state.js?v=1.0.7';
import {formatDegreeChart,materializeChart,parseDegreeChart} from './degree-chart.js?v=1.0.7';
import {BeatPlayer,validTempo,clampTempo} from './tempo-player.js?v=1.0.7';
import {insertCadence,invertChord,parallelColor} from './harmony-actions.js?v=1.0.7';
import {playbackSlice,spaceToggles} from './transport.js?v=1.0.7';
import {names,mod,parse,spellPitch,keyName,guitarShapes,scales,midiBytes,chordTones} from './music.js?v=1.0.7';
import {parseChart,chordList,serialize} from './solutions.js?v=1.0.7';
import {styles,styleLabels} from './style-engine.js?v=1.0.7';
import {performance as events,patterns,voicePlan,performanceLabel} from './performance.js?v=1.0.7';
import {scaleNotes,scalePositions} from './scale-library.js?v=1.0.7';
import {guitarMelody,melodyShapes,melodyEvents} from './guitar-melody.js?v=1.0.7';
import {Piano} from './piano.js?v=1.0.7';
const $=id=>document.getElementById(id);let bars=parseChart('| C | Am | F | G |'),source=structuredClone(bars),selected=0,selectedChord=0,tab='scales',timer=null,run=0;
let startBar=0,isPlaying=false,loading=false,player=null,playbackKind='score';
let piano=null,scaleChoice='',lastScaleChord='',positionChoice=0,method='style',melodySeed=0,arrangement=[];
let chordPicker=null;
const scoreFollow=mountScoreFollow($('grid'),$('scoreFollow'));
let pianoTools=null,harmony=createHarmony(),inputDirty=false,legacyRenderKey=null;
const currentKey=()=>effectiveKey(harmony);
let pianoSettings={genreRevision:2,pianoRevision:2,pianoPhrase:'original',pianoFills:'phrase',melodyFollow:'gentle',melodyText:'',ideaFamily:'auto'};
const settings=['tempo','style','pattern','freedom','density','voicing','rate','gate','swing','human','randomness','arpMode','arpRate','arpOctaves','arpPhase','arpAccent','arpSeed','midiSplit','midiPedal','bassMode','balladEntry','arpFoundation'];
for(const groupName of ['現代流行與和聲','黑暗／重型與另類','跨文化流行與舞曲','地域調式與器樂靈感']){const group=document.createElement('optgroup');group.label=groupName;Object.keys(styles).filter(s=>(styles[s].group||'現代流行與和聲')===groupName).forEach(s=>group.append(new Option(styleLabels[s]||s,s)));$('style').append(group);}for(const [title,include] of [['其他伴奏',id=>!id.startsWith('piano')&&!id.startsWith('texture')],['POP · 12 款流行伴奏',id=>id.startsWith('piano')],['TEXTURE · 6 款織體',id=>id.startsWith('texture')]]){const group=document.createElement('optgroup');group.label=title;Object.entries(patterns).filter(([id])=>(id==='arp'||!id.startsWith('arp'))&&include(id)).forEach(([id,label])=>group.append(new Option(label,id)));$('pattern').append(group);}Object.entries(arpModes).forEach(([id,[label]])=>$('arpMode').add(new Option(label,id)));['4','8','8T','16','24','32'].forEach(id=>$('arpRate').add(new Option(arpRates[id].label,id)));$('arpMode').value='upDown';$('arpRate').value='16';applyStyleDefaults();
const morphSwitches=['morphInversion','morphParallel','morphIIV','preserveBass'];
let statusTimer;const status=s=>{clearTimeout(statusTimer);$('status').textContent=s;$('dockStatus').textContent=s;statusTimer=setTimeout(()=>{$('status').textContent='';$('dockStatus').textContent='';},6500);};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
names.forEach((n,i)=>$('keyTonic').add(new Option(i===6?'F#':n,i)));
for(const tonic of ['C#','D#','E#','Gb','G#','A#','Cb','Fb'])$('keyTonic').add(new Option(tonic,tonic));
const selectedTonic=()=>{const tonic=$('keyTonic').selectedOptions[0].textContent;return {root:parse(tonic).root,tonic};};
const session=readSession({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
harmony=session.harmony;
{
 const old=session.saved;
 for(const id of morphSwitches)if(old?.morphOptions?.[id]!=null)$(id).checked=old.morphOptions[id];
 if(old){
  legacyRenderKey=old.legacyRenderKey||(!old.harmony?{root:+old.key||0,mode:old.mode||'major'}:null);
  pianoSettings={...pianoSettings,...old.pianoSettings,genreRevision:old.pianoSettings?.genreRevision??1,pianoRevision:old.pianoSettings?.pianoRevision===2?2:1,pianoPhrase:old.pianoSettings?.pianoPhrase||'original'};
  for(const id of settings)if(old[id]!=null){const control=$(id);if(control.tagName!=='SELECT'||[...control.options].some(o=>o.value===String(old[id])))control.value=old[id];}
  $('freedom').value=old.harmony&&['morph','color'].includes(old.freedom)?old.freedom:'morph';
  const legacyArp={arpUp:'up',arpDown:'down',arpBounce:'upDown',arpRandom:'random',arpOctave:'up'};
  if(legacyArp[old.pattern]){$('pattern').value='arp';$('arpMode').value=legacyArp[old.pattern];$('arpRate').value=String(4/Number(old.rate||.5));$('arpOctaves').value=old.pattern==='arpOctave'?'2':'1';}
  if(!old.pattern||!$('pattern').value)$('pattern').value=styles[harmony.style].pattern;
  if(!old.voicing)$('voicing').value=styles[harmony.style].voicing;
  if(old.inputFormat)$('inputFormat').value=old.inputFormat;
  if(old.sourceDraft!=null){$('chartInput').value=old.sourceDraft;inputDirty=true;}
 }
}
if(session.message)status(session.message);
function save(){if(!session.canSave)return;try{localStorage.setItem('khimaira-v5',JSON.stringify({morphOptions:Object.fromEntries(morphSwitches.map(id=>[id,$(id).checked])),harmony,pianoSettings,legacyRenderKey,inputFormat:$('inputFormat').value,sourceDraft:inputDirty?$('chartInput').value:null,...Object.fromEntries(settings.map(id=>[id,$(id).value]))}));}catch{status('無法儲存於瀏覽器。');}}
function confirmAction(title,message,action){$('confirmTitle').textContent=title;$('confirmText').textContent=message;$('confirmHarmony').showModal();$('confirmApply').onclick=()=>{$('confirmHarmony').close();action();};}
$('confirmCancel').onclick=()=>$('confirmHarmony').close();
const keyText=k=>k.tonic+' '+k.mode.replaceAll('-',' ');
function projectHarmony(){bars=harmonyView(harmony).bars;source=materializeChart(harmony.backbone.degrees,harmony.key);$('style').value=harmony.style;}
function dispatch(action,{resetDraft=false,message='',resume=true}={}){
 try{
  let next=harmony;
  if(action.type==='generate'&&inputDirty){next=applyHarmonyAction(next,{type:'load',text:$('chartInput').value});resetDraft=true;}
  next=applyHarmonyAction(next,action);harmonyView(next); // Validate derived chords before changing the live state.
  const playing=resume&&isPlaying&&playbackKind==='score';if(!playing)stop();harmony=next;legacyRenderKey=null;projectHarmony();
  if(['load','example','keep','undo','backboneEdit'].includes(action.type)||!inputDirty&&['transpose','reinterpret','auto','convertMode'].includes(action.type))resetDraft=true;
  if(resetDraft){inputDirty=false;syncInput();}
  selected=Math.min(selected,Math.max(0,bars.length-1));selectedChord=Math.min(selectedChord,Math.max(0,(bars[selected]?.chords.length||1)-1));startBar=Math.min(startBar,Math.max(0,bars.length-1));
  if(action.type!=='style')syncLength();
  render();styleInfo();syncMethod();save();
  if(next.warning?.type==='technique-limit')status(`本進行功能／音集保護與手法設定後僅可變動 ${next.warning.used} 格（本次預算 ${next.warning.budget} 格）。`);else if(next.warning?.type==='length-preserved')status(`MORPH 保留骨幹 ${next.warning.length} 小節，未截斷或重複；小節選單僅用於空白生成。`);else if(next.warning?.type==='variation-exhausted')status('目前骨幹與設定沒有更多合適的色彩變化；可調整樂風或變化幅度。');else if(message)status(message);if(playing)refreshScorePlayback({quantize:action.type==='generate'?4:0});return true;
 }catch(e){status(e.message);return false;}
}
function commitScore(message='已更新播放譜；骨幹保留，可 RESTORE。'){dispatch({type:'replaceScore',bars},{message});}
function syncLength(){if(!Array.from($('length').options).some(o=>+o.value===bars.length))$('length').add(new Option(String(bars.length),bars.length));$('length').value=bars.length;}
function invalidateMelody(){arrangement=[];$('melodyGrid').replaceChildren();$('melodyNote').textContent='和弦已更新，按產生旋律 產生這組進行的頂聲部按法。';}
function selectedSymbol(){return chordList(bars[selected]||{})[selectedChord]?.symbol||'';}
function select(i,j=0){selected=i;selectedChord=j;document.querySelectorAll('.chord-event').forEach(el=>el.classList.toggle('chosen',+el.dataset.bar===i&&+el.dataset.chord===j));if($('selectedTarget'))$('selectedTarget').textContent='BAR '+(i+1)+' · '+selectedSymbol();reference();}
function syncInput(){if(!inputDirty)$('chartInput').value=$('inputFormat').value==='roman'?formatDegreeChart(harmony.backbone.degrees,harmony.key):harmonyView(harmony).sourceText.replaceAll(':4','');$('sourceLine').textContent=serialize(source).replaceAll(':4','')+'  ·  '+formatDegreeChart(harmony.backbone.degrees,harmony.key,{bassNames:true});}
function renderKey(){
 const key=currentKey(),view=harmonyView(harmony);$('keyLabel').textContent=keyText(key);$('keyLock').textContent=harmony.keyMode.toUpperCase();$('keyLock').setAttribute('aria-pressed',String(harmony.keyMode==='locked'));
 $('restore').disabled=!view.canRestore;$('undo').disabled=!harmony.history.length;
 const candidate=view.candidates.find(k=>k.root!==key.root||k.mode!==key.mode);$('keyCandidate').hidden=!candidate;
 if(candidate){$('keyCandidate').textContent='Also fits: '+keyText(candidate);$('keyCandidate').onclick=()=>dispatch({type:'reinterpret',key:candidate},{message:'已改判調性；實際音高保留。'});}
 const suggestion=view.warning?.type==='key-mismatch'?view.warning.suggested:null;$('keyWarning').hidden=!suggestion;
 if(suggestion){$('keyWarning').querySelector('span').textContent='骨幹看起來是 '+keyText(suggestion)+'，要切換嗎？';$('acceptKeySuggestion').onclick=()=>dispatch({type:'reinterpret',key:suggestion},{message:'已改判調性；實際音高保留。'});}
 const origin=view.origin;$('scoreOrigin').textContent=({compare:'COMPARE · '+(origin.side||'B'),backbone:'BACKBONE · 骨幹',edit:'EDIT · 播放譜',legacy:'已載入存檔',conversion:'MODE · 調式轉換',example:'EXAMPLE · 範例',idea:'NEW IDEA · 重新創作',morph:'MORPH '+harmony.variation+' · '+($('randomness').selectedOptions[0]?.textContent||''),inspire:'INSPIRE · '+({example:'範例靈感',fusion:'範例 × 樂風',backbone:'骨幹延伸'})[origin.kind]})[origin.type]||'播放譜';
 $('sourceLine').textContent=serialize(source).replaceAll(':4','')+'  ·  '+formatDegreeChart(harmony.backbone.degrees,harmony.key,{bassNames:true});populateLibrary();
}
function render(){renderMorphHistory();$('seedMood').hidden=harmony.origin.type!=='inspire';if(harmony.origin.type==='inspire')$('seedMood').textContent='INSPIRE · 預覽（KEEP 採用／RESTORE 回骨幹）';$('dockSummary').textContent=bars.map((b,i)=>(i+1)+': '+(b.chords.map(c=>c.symbol).join(' → ')||'N.C.')).join(' | ');const functionalLabels=harmonyView(harmony).degreeLabels;renderKey();startBar=Math.min(startBar,bars.length-1);invalidateMelody();const grid=$('grid');grid.replaceChildren();bars.forEach((b,i)=>{const list=chordList(b);const el=document.createElement('div');el.className='bar';el.dataset.index=i;el.innerHTML=`<div class="bar-number"><button class="bar-cue" aria-label="BAR ${String(i+1).padStart(2,'0')} · 從第 ${i+1} 小節開始" aria-pressed="${i===startBar}">BAR ${String(i+1).padStart(2,'0')}</button><span>4/4</span></div><div class="beat-ruler"><span>1</span><span>2</span><span>3</span><span>4</span></div><div class="chord-lane"></div><input class="bar-edit" aria-label="第 ${i+1} 小節和弦" placeholder="C:2 Dm7:1 G7:1" value="${safe(list.map(c=>c.symbol+':'+c.beats).join(' '))}"><div class="function">${safe(b.reason||'自由編輯')}</div>`;el.style.minWidth=Math.max(160,...list.map(c=>(c.symbol.length*8+24)*4/c.beats+28))+'px';el.style.setProperty('--bar-min-width',el.style.minWidth);let beat=0;list.forEach((c,j)=>{const btn=document.createElement('button');btn.className='chord-event'+(selected===i&&selectedChord===j?' chosen':'');btn.dataset.bar=i;btn.dataset.chord=j;btn.style.width=(c.beats/4*100)+'%';btn.style.setProperty('--chord-size',(c.beats<1?12:c.beats<=1&&c.symbol.length>6?12:c.beats<=1&&c.symbol.length>4?15:c.beats<=1?19:c.symbol.length>8?18:25)+'px');btn.innerHTML=`<strong>${safe(c.symbol)}</strong><small class="degree">${safe(functionalLabels[i][j])}</small>`;const trace=morphTrace(c);if(trace){const small=document.createElement('small');small.className='morph-trace';small.textContent=trace;btn.append(small);btn.setAttribute('aria-label',c.symbol+' '+functionalLabels[i][j]+' '+trace+'，編輯和弦');}btn.title=(trace||c.symbol)+' · 第 '+(beat+1)+' 拍';btn.onfocus=()=>select(i,j);btn.onclick=()=>{select(i,j);openEditor();};el.querySelector('.chord-lane').append(btn);beat+=c.beats;});el.querySelector('.bar-cue').onclick=()=>cueBar(i);el.onclick=e=>{if(!e.target.closest('button,input'))cueBar(i);};const input=el.querySelector('input');const commit=()=>{try{if(!dispatch({type:'edit',bar:i,text:input.value},{message:'已編輯播放譜；骨幹保留，可 RESTORE。'}))input.setAttribute('aria-invalid','true');}catch(e){input.setAttribute('aria-invalid','true');status(e.message);}};input.onchange=commit;input.onkeydown=e=>{if(e.key==='Enter')input.blur();};const restores=document.createElement('div');restores.className='morph-restores';const seen=new Set();for(const c of list){const address=c.morph?.source;if(!address||!morphTrace(c)||seen.has(address.chord))continue;seen.add(address.chord);const restore=document.createElement('button');restore.textContent='還原 '+(source[address.bar]?.chords[address.chord]?.symbol||'骨幹');restore.setAttribute('aria-label',restore.textContent+'，還原第 '+(address.bar+1)+' 小節第 '+(address.chord+1)+' 個骨幹和弦');restore.onclick=()=>dispatch({type:'restoreSource',source:address},{message:'已還原這個骨幹位置；可 UNDO。'});restores.append(restore);}el.append(restores);grid.append(el);});updateCue();select(selected,selectedChord);syncArp();chordPicker?.decorate();}
function morphTrace(c){return morphTraceText(c,source,harmony.traceValid!==false);}
function renderMorphHistory(){
 const entries=harmony.morphHistory||[],select=$('morphHistory');select.replaceChildren();
 entries.forEach((entry,i)=>select.add(new Option(morphHistoryLabel(entry,harmony.key),String(i))));
 if(!entries.length)select.add(new Option('尚無 MORPH 結果',''));
 select.value=entries.length?String(harmony.compareIndex??entries.length-1):'';select.disabled=!entries.length;$('compareB').disabled=!entries.length;
 $('compareA').setAttribute('aria-pressed',String(harmony.origin.type==='compare'&&harmony.origin.side==='A'));
 $('compareB').setAttribute('aria-pressed',String(harmony.origin.type==='compare'&&harmony.origin.side==='B'));
}
function pitchLabel(symbol,note){const c=parse(symbol),i=c.intervals.findIndex(n=>mod(c.root+n)===mod(note));return (i<0?names[mod(note)]:chordTones(symbol)[i])+(Math.floor(note/12)-1);}
function diagram(frets){const positive=frets.filter(x=>x>0);const start=Math.max(1,positive.length?Math.min(...positive):1);let s=`<svg viewBox="0 0 260 150" role="img" aria-label="由低音弦至高音弦 ${frets.join(' ')}"><text x="8" y="49" fill="#52604d" font-size="12">${start}fr</text>`;for(let i=0;i<6;i++){const x=48+i*34;s+=`<line x1="${x}" y1="32" x2="${x}" y2="132" stroke="#8b9785"/><text x="${x}" y="20" text-anchor="middle" fill="#30402c" font-size="12">${frets[i]<0?'×':frets[i]===0?'○':''}</text>`;if(frets[i]>0)s+=`<circle cx="${x}" cy="${44+(frets[i]-start)*25}" r="9" fill="#66503c"/>`;}for(let f=0;f<5;f++)s+=`<line x1="48" y1="${32+25*f}" x2="218" y2="${32+25*f}" stroke="#8b9785"/>`;return s+'</svg>';}
function scaleGraphic(scale,start,root){let s=`<svg viewBox="0 0 620 245" role="img" aria-label="${safe(scale.name)} 第 ${start} 至 ${start+4} 格六線指板"><text x="20" y="24" fill="#53634b" font-size="13">POSITION ${start}–${start+4} · 紅點 = 根音</text>`;for(let f=0;f<6;f++)s+=`<line x1="${75+f*100}" y1="55" x2="${75+f*100}" y2="205" stroke="#c4ccbd"/>`;[64,59,55,50,45,40].forEach((t,i)=>{let y=55+i*30;s+=`<text x="34" y="${y+5}" fill="#44513d" font-size="15">${['e','B','G','D','A','E'][i]}</text><line x1="75" y1="${y}" x2="575" y2="${y}" stroke="#6b7960" stroke-width="${1+i*.15}"/>`;for(let f=0;f<5;f++){const pitch=mod(t+start+f);if(scale.pcs.includes(pitch))s+=`<circle cx="${125+f*100}" cy="${y}" r="12" fill="${pitch===root?'#af573f':'#66503c'}"/><text x="${125+f*100}" y="${y+4}" text-anchor="middle" fill="white" font-size="12">${start+f}</text>`;}});for(let f=0;f<5;f++)s+=`<text x="${125+f*100}" y="235" text-anchor="middle" fill="#67735f" font-size="12">${start+f}</text>`;return s+'</svg>';}
function scaleTabGraphic(scale,start){const notes=[];[40,45,50,55,59,64].forEach((t,i)=>{for(let f=start;f<start+5;f++)if(scale.pcs.includes(mod(t+f)))notes.push({string:5-i,fret:f});});const width=70+notes.length*32;let s=`<svg viewBox="0 0 ${width} 170" role="img" aria-label="${safe(scale.name)} 把位上行練習六線譜">`;for(let i=0;i<6;i++)s+=`<text x="12" y="${34+i*24}" fill="#44513d" font-size="14">${['e','B','G','D','A','E'][i]}</text><line x1="40" y1="${30+i*24}" x2="${width-10}" y2="${30+i*24}" stroke="#8c9783"/>`;notes.forEach((n,i)=>{const x=58+i*32,y=30+n.string*24;s+=`<rect x="${x-11}" y="${y-10}" width="22" height="20" fill="#eee8dc"/><text x="${x}" y="${y+5}" fill="#43382b" text-anchor="middle" font-size="15" font-weight="600">${n.fret}</text>`;});return s+'</svg>';}
function reference(){const c=parse(selectedSymbol());$('chordName').textContent=c?c.symbol:'—';$('tones').textContent=c?chordTones(c.symbol).join(' · ')+' / BAR '+(selected+1):'點選任一和弦';$('reference').replaceChildren();if(!c)return;if(tab==='chords'){const full=guitarShapes(c.symbol);const shapes=full.length?full:melodyShapes(c.symbol).slice(0,3);if(!shapes.length)$('reference').textContent='目前無完整把位；可參考較簡單七和弦，或切換音階圖。';shapes.forEach((shape,i)=>{const d=document.createElement('div');d.className='diagram';d.innerHTML=`<div class="diagram-title">VOICING 0${i+1}</div>${diagram(shape.frets)}<div class="fret-label">${shape.frets.map(f=>f<0?'×':f).join('　')}</div>${shape.omitted?.length?'<p class="scale-note">省略音：'+shape.omitted.join(' · ')+'</p>':''}`;$('reference').append(d);});return;}const opts=scales(c.symbol,{style:$('style').value,key:currentKey().root});const context=c.symbol+'|'+$('style').value+'|'+currentKey().root;if(lastScaleChord!==context){scaleChoice=styles[$('style').value].world?opts[0]?.name:opts.find(o=>o.level==='和弦相容')?.name||opts[0]?.name;lastScaleChord=context;}const chosen=opts.find(o=>o.name===scaleChoice)||opts[0];if(!chosen)return;const controls=document.createElement('div');controls.className='scale-selector';const select=document.createElement('select');select.setAttribute('aria-label','選擇吉他音階');opts.forEach(o=>select.add(new Option(o.name+' · '+o.level,o.name)));select.value=chosen.name;select.onchange=()=>{scaleChoice=select.value;reference();};const audition=document.createElement('button');audition.textContent='▶ 試聽音階';audition.onclick=()=>previewScale(chosen,c);controls.append(select,audition);$('reference').append(controls);const positions=scalePositions(chosen),pos=positions[positionChoice]||positions[0];const d=document.createElement('div');d.className='diagram scale-card';d.innerHTML=`<div class="diagram-title">${safe(chosen.name)}</div><div class="scale-notes">${scaleNotes(chosen).join(' · ')}</div><div class="scale-level">${safe(chosen.level)}</div><p class="scale-note">${safe(chosen.note)}${chosen.conflicts.length?' 不含目前和弦的 '+safe(chosen.conflicts.join('、'))+'；可當經過色彩，或調整和弦配置。':''}</p><div class="position-tabs">${positions.map((p,i)=>`<button data-position="${i}" class="${i===positionChoice?'active':''}">Pattern ${i+1} · ${p.start}–${p.end}</button>`).join('')}</div><p class="scale-note">五個重疊把位區域 · 依 CAGED 區域延伸；此圖標示音位，不指定每個手指。紅點＝音階根音。</p>${scaleGraphic(chosen,pos.start,chosen.root)}<div class="tab-caption">Pattern ${pos.index} · 第 ${pos.start}–${pos.end} 格 · 上行練習</div><div class="tab-scroll" tabindex="0" role="region" aria-label="可捲動的音階六線譜">${scaleTabGraphic(chosen,pos.start)}</div>`;$('reference').append(d);d.querySelectorAll('[data-position]').forEach(btn=>btn.onclick=()=>{positionChoice=+btn.dataset.position;reference();});}

function config(){return {techniques:{inversion:$('morphInversion').checked,parallel:$('morphParallel').checked,iiV:$('morphIIV').checked},preserveBass:$('preserveBass').checked,ideaFamily:pianoSettings.ideaFamily,key:currentKey().root,mode:currentKey().mode,style:$('style').value,freedom:$('freedom').value,density:+$('density').value,randomness:$('randomness').value,method:$('freedom').value==='color'?'color':method,loop:$('loop').checked};}
function performanceOptions(){return {...pianoSettings,key:legacyRenderKey||currentKey(),arpFoundation:$('arpFoundation').value,bpm:+$('tempo').value,bassMode:$('bassMode').value,balladEntry:$('balladEntry').value,loop:$('loop').checked,voicing:$('voicing').value,rate:+$('rate').value,gate:+$('gate').value/100,swing:+$('swing').value/100,human:+$('human').value/100,seed:42,arpMode:$('arpMode').value,arpRate:$('arpRate').value,arpOctaves:+$('arpOctaves').value,arpPhase:$('arpPhase').value,arpAccent:$('arpAccent').value,arpSeed:+$('arpSeed').value};}

function syncArp(){
 syncGenreLabel();
 pianoTools?.refresh();
 const enabled=$('pattern').value==='arp';$('arpPanel').hidden=!enabled;if(!enabled)return;
 const opts=performanceOptions(),rate=arpRates[opts.arpRate]||arpRates['16'];
 $('arpHint').textContent=(arpModes[opts.arpMode]||arpModes.upDown)[1]+' 每個 4/4 小節 '+Math.round(4/rate.step)+' 步。'+(rate.triplet?'三連音不套用 SWING。':'')+(opts.human?'HUMAN 會偏移格線；按「等距音序」設為 0。':'HUMAN 0：依格線等距。');
 const notes=events(bars,'arp',opts).filter(n=>n.beat<4),pitches=notes.map(n=>n.note);
 if(!notes.length){$('arpPreview').textContent='先載入和弦，即可預覽音序。';return;}
 const low=Math.min(...pitches),high=Math.max(low+12,...pitches),y=n=>54-(n-low)/(high-low)*42;
 $('arpPreview').innerHTML='<svg viewBox="0 0 640 76" role="img" aria-label="第一小節分解音序預覽，橫向為拍點，縱向為音高">'+[0,1,2,3,4].map(b=>`<line x1="${12+b*154}" x2="${12+b*154}" y1="5" y2="59" stroke="currentColor" opacity=".2"/><text x="${12+b*154}" y="73" fill="currentColor" font-size="10">${b<4?b+1:''}</text>`).join('')+notes.map(n=>`<rect x="${12+n.beat*154}" y="${y(n.note)}" width="${Math.max(2,n.duration*154-1)}" height="3" rx="1" fill="currentColor"/>`).join('')+'</svg>';
}
document.querySelectorAll('[data-arp-preset]').forEach(button=>button.onclick=()=>{
 const resume=isPlaying,preset=arpPresets[button.dataset.arpPreset];stop();$('pattern').value='arp';
 for(const [id,value] of Object.entries(preset))if($(id))$(id).value=value;
 syncArp();save();status(preset.description+'。按 PLAY 試聽，MIDI 匯出相同音序。');if(resume)play();
});
$('arpStraight').onclick=()=>{$('human').value=0;$('human').dispatchEvent(new Event('change'));};
$('arpVariate').onclick=()=>{const resume=isPlaying;stop();$('arpSeed').value=(Number($('arpSeed').value)+1)>>>0;syncArp();save();status(['random','walk'].includes($('arpMode').value)?'已換一組隨機音序；試聽和 MIDI 使用相同變體。':'VARIATE 用於 RANDOM / WALK；目前模式維持固定音序。');if(resume)play();};

function activateGenre(){const cfg=selectGenre({swing:+$('swing').value},$('pattern').value);pianoSettings.genreRevision=cfg.genreRevision;$('swing').value=cfg.swing;}
function syncGenreLabel(){$('applyPattern').hidden=pianoSettings.genreRevision>=2||!genreProfiles[$('pattern').value];for(const o of $('pattern').options)o.textContent=performanceLabel(o.value,o.value===$('pattern').value?pianoSettings.genreRevision:2);const label=$('swing').closest('label');if(label?.firstChild?.nodeType===3)label.firstChild.textContent=pianoSettings.genreRevision>=2?swingDescription($('pattern').value,$('swing').value):'SWING';}
function applyStyleDefaults(){const cfg=styles[$('style').value]||styles.Jazz;$('pattern').value=cfg.pattern;$('voicing').value=cfg.voicing;$('swing').value=['Jazz','Major blues','Minor blues','Lo-fi hip-hop'].includes($('style').value)?16:['Funk','Fusion','Neo-soul'].includes($('style').value)?8:0;activateGenre();}
function styleInfo(){const cfg=styles[$('style').value];$('styleNote').textContent=cfg.description;}
function syncMethod(){document.querySelectorAll('[data-solution]').forEach(b=>b.classList.toggle('active',b.dataset.solution===method));$('methodLabel').textContent=({original:'原始進行',style:'風格改寫',color:'延伸色彩',cadence:'ii–V 接近',tritone:'三全音代理'})[method]+' · 更多設定';}
$('chartInput').addEventListener('input',()=>{inputDirty=true;$('seedMood').hidden=true;$('chartInput').removeAttribute('aria-invalid');save();});
$('inputFormat').onchange=()=>{try{if(inputDirty){const degrees=parseDegreeChart($('chartInput').value,harmony.key);$('chartInput').value=$('inputFormat').value==='roman'?formatDegreeChart(degrees,harmony.key):serialize(materializeChart(degrees,harmony.key)).replaceAll(':4','');}else syncInput();save();}catch(e){$('inputFormat').value=$('inputFormat').value==='roman'?'chords':'roman';status(e.message);}};
$('applyChart').onclick=()=>{if(dispatch({type:'load',text:$('chartInput').value},{message:'已載入骨幹。MORPH 發展樂風，INSPIRE 探索靈感。'}))$('chartInput').removeAttribute('aria-invalid');else $('chartInput').setAttribute('aria-invalid','true');};
function generateFromInput(chosenMethod){method=chosenMethod;if(chosenMethod==='original'){dispatch({type:'restore'},{message:'已還原目前調性下的骨幹。'});return;}
 const options={...config(),length:+$('length').value,recreate:false};delete options.seed;
 dispatch({type:'generate',options},{message:'已從骨幹產生新的樂風變化；調性維持不變。'});
}
$('generate').onclick=()=>generateFromInput(method==='original'?'style':method);
$('dockMorph').onclick=$('generate').onclick;
for(const id of morphSwitches)$(id).onchange=save;
$('compareA').onclick=()=>dispatch({type:'compare',index:'backbone'},{message:'A：原骨幹，按 PLAY 試聽。'});
$('compareB').onclick=()=>dispatch({type:'compare',index:Number($('morphHistory').value)},{message:'B：選定變化，按 PLAY 試聽或 KEEP 採用。'});
$('morphHistory').onchange=$('compareB').onclick;
document.querySelectorAll('[data-solution]').forEach(btn=>btn.onclick=()=>generateFromInput(btn.dataset.solution));
$('undo').onclick=()=>dispatch({type:'undo'},{message:'已復原上一個和聲操作。'});
$('restore').onclick=()=>dispatch({type:'restore'},{message:'已還原目前調性下的骨幹；可 UNDO。'});
$('clear').onclick=()=>dispatch({type:'backboneEdit',operation:'clearAll'},{resetDraft:true,message:'已清空骨幹；可 UNDO 復原。'});
$('useCurrent').onclick=()=>confirmAction('KEEP · 設為新骨幹？','目前播放譜會取代輸入骨幹，作為往後 MORPH 與 RESTORE 的起點。可用 UNDO 復原。',()=>dispatch({type:'keep',confirmed:true},{message:'已將播放譜設為新骨幹。'}));
$('length').onchange=()=>status('已設定空白生成長度；MORPH 保留現有骨幹小節數，不截斷或重複。');
for(const id of settings.filter(id=>id!=='tempo'))$(id).onchange=()=>{
 if(['pattern','style'].includes(id))pianoSettings.pianoRevision=2;if(id==='pattern')activateGenre();
 if(id==='style'){const style=$('style').value;method='style';applyStyleDefaults();dispatch({type:'style',style},{message:'已選樂風；MORPH 改變骨幹風格，INSPIRE 提供新想法。'});return;}
 const resume=isPlaying&&playbackKind==='score';if(!resume)stop();syncArp();save();if(resume)refreshScorePlayback();
};
$('applyPattern').onclick=()=>{stop();activateGenre();syncArp();save();status('已套用目前演奏方式的節奏與建議 Swing。');};
$('styleGroove').onclick=()=>{stop();applyStyleDefaults();syncArp();save();status('已套用 '+$('style').value+' 的演奏與配置；MIDI 會使用同一組音符。');};
function currentPool(){return examplesForKey(harmony.style,currentKey());}
function populateLibrary(){const selected=$('library').value,items=currentPool();$('library').replaceChildren();items.forEach(p=>$('library').add(new Option(p.title,p.id)));if(items.some(p=>p.id===selected))$('library').value=selected;$('loadPreset').disabled=!items.length;$('library').disabled=!items.length;$('presetNote').textContent=items.length?items.length+' 組相容範例 · LOAD 依目前調性載入，設為新骨幹；可 UNDO。':'此樂風沒有相容的範例；INSPIRE 會從骨幹延伸，或改選其他樂風。';}
$('loadPreset').onclick=()=>{const p=currentPool().find(p=>p.id===$('library').value);if(p&&dispatch({type:'example',id:p.id},{message:'已載入 '+p.title+'；已設為新骨幹，可 UNDO。'})){$('seedMood').hidden=false;$('seedMood').textContent='EXAMPLE · '+p.title;}};
$('nextSong').onclick=()=>{if(dispatch({type:'inspire',options:config()},{message:'已探索新的靈感；按 KEEP 可採用為新骨幹，再用 MORPH 發展。'})){$('seedMood').hidden=false;$('seedMood').textContent='INSPIRE · 預覽（KEEP 採用／RESTORE 回骨幹）';}};
$('voicingTab').onclick=()=>{tab='chords';$('voicingTab').classList.add('active');$('scaleTab').classList.remove('active');reference();};$('scaleTab').onclick=()=>{tab='scales';$('scaleTab').classList.add('active');$('voicingTab').classList.remove('active');reference();};
$('resolve').onclick=()=>{try{const result=insertCadence(bars,selected,selectedChord,{loop:$('loop').checked,startBar});dispatch({type:'replaceScore',bars:result.bars},{message:'已插入 '+result.kind+'，解決到 '+result.target+'；骨幹保留。'});}catch(e){status(e.message);}};
function editHarmony(transform,message){try{const symbol=transform(selectedSymbol());stop();bars[selected].chords[selectedChord].symbol=symbol;delete bars[selected].chords[selectedChord].morph;commitScore(message);}catch(e){status(e.message);}}
$('invert').onclick=()=>editHarmony(invertChord,'已使用和弦內音轉位；延伸音不作傳統轉位低音。');
$('borrow').onclick=()=>editHarmony(parallelColor,'已切換平行大小調色彩，保留延伸音設定及仍相容的低音。這是手動借用，可 UNDO。');
const qualities=[['','Major · 大三和弦'],['m','Minor · 小三和弦'],['5','Power · 五度和弦'],['dim','Diminished · 減三'],['aug','Augmented · 增三'],['sus2','Sus2'],['sus4','Sus4'],['6','Major 6'],['m6','Minor 6'],['maj7','Major 7'],['m7','Minor 7'],['7','Dominant 7'],['7b5','Dominant 7 flat 5'],['dim7','Diminished 7'],['m7b5','Half diminished'],['mMaj7','Minor major 7'],['maj9','Major 9'],['m9','Minor 9'],['9','Dominant 9'],['69','6/9'],['add9','Add9'],['madd9','Minor add9'],['11','Dominant 11'],['m11','Minor 11'],['maj11','Major 11'],['13','Dominant 13'],['m13','Minor 13'],['maj13','Major 13'],['7alt','Altered dominant'],['7sus4','7sus4']];
names.forEach((n,i)=>{$('editRoot').add(new Option(n,i));$('editBass').add(new Option(n,i));});qualities.forEach(([v,n])=>$('editQuality').add(new Option(n,v)));
function editorSymbol(){const ext=['edit9','edit11','edit13','edit5'].map(id=>$(id).value).filter(Boolean);const current=parse(selectedSymbol()),root=+$('editRoot').value,bass=$('editBass').value;const rootName=current?.root===root?current.rootName:spellPitch(root,currentKey());const symbol=rootName+$('editQuality').value+(ext.length?'('+ext.join(',')+')':'')+($('editBass').value===''?'':'/'+(current?.bass===+bass&&current.bassName?current.bassName:spellPitch(+bass,currentKey())));const next=bars[selected]?.chords[selectedChord+1]||bars[selected+1]?.chords[0]||($('loop').checked?bars[0]?.chords[0]:null);return spellSelectedChord(symbol,currentKey(),next?.symbol);}
function editorPreview(){document.querySelectorAll('#editorRoots [data-root]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.root===$('editRoot').value)));const symbol=editorSymbol(),c=parse(symbol);$('editorPreview').innerHTML=safe(symbol)+'<small>'+safe(c?chordTones(symbol).join(' · '):'此組合無法辨識')+'</small>';$('editorApply').disabled=!c;}
let editorTrigger=null;
$('chordEditor').addEventListener('close',()=>{requestAnimationFrame(()=>{const chord=document.querySelector(`.chord-event[data-bar="${selected}"][data-chord="${selectedChord}"]`);(editorTrigger?.isConnected?editorTrigger:chord||$('editChord')).focus();});});
function openEditor(){editorTrigger=document.activeElement;const c=parse(selectedSymbol());if(!c)return;for(const id of ['editRoot','editBass'])for(const option of $(id).options)if(option.value!=='')option.textContent=spellPitch(+option.value,currentKey());$('editRoot').options[c.root].textContent=c.rootName;if(c.bassName)$('editBass').options[c.bass+1].textContent=c.bassName;$('editorTitle').textContent='BAR '+(selected+1)+' · '+c.symbol;const event=chordList(bars[selected])[selectedChord],trace=morphTrace(event);$('editorTrace').textContent=trace;$('editorProvenance').hidden=!trace;$('editorRestoreSource').onclick=()=>{$('chordEditor').close();dispatch({type:'restoreSource',source:event.morph.source},{message:'已還原這個骨幹位置；可 UNDO。'});};$('editRoot').value=c.root;$('editBass').value=c.bass===c.root?'':c.bass;['edit9','edit11','edit13','edit5'].forEach(id=>$(id).value='');let q=c.q;const m=q.match(/^([^()]*)\((.*)\)$/);if(m){q=m[1];m[2].split(',').forEach(t=>{const id=t.includes('9')?'edit9':t.includes('11')?'edit11':t.includes('13')?'edit13':'edit5';$(id).value=t;});}if(!qualities.some(([v])=>v===q)&&!Array.from($('editQuality').options).some(o=>o.value===q))$('editQuality').add(new Option(q,q));$('editQuality').value=q;$('editorSplit').disabled=bars[selected].chords.length>=4||bars[selected].chords[selectedChord].beats<1;editorPreview();$('editorRoots').replaceChildren(rootPicker(currentKey(),c.root,value=>{$('editRoot').value=value;editorPreview();$('editQuality').focus();}));$('chordEditor').showModal();$('editorRoots').querySelector('button').focus();}
['editRoot','editQuality','editBass','edit9','edit11','edit13','edit5'].forEach(id=>$(id).onchange=editorPreview);$('editChord').onclick=openEditor;
$('editorApply').onclick=()=>{const symbol=editorSymbol();if(!parse(symbol))return;stop();bars[selected].chords[selectedChord].symbol=symbol;delete bars[selected].chords[selectedChord].morph;bars[selected].reason='手動選擇和弦與延伸音';$('chordEditor').close();commitScore('已套用 '+symbol+'；骨幹保留。');};
$('editorSplit').onclick=()=>{const c=bars[selected].chords[selectedChord];if(c.beats<1||bars[selected].chords.length>=4)return;stop();bars[selected].chords.splice(selectedChord,1,{...c,beats:c.beats/2},{...c,beats:c.beats/2});$('chordEditor').close();commitScore();};
$('editorDelete').onclick=()=>{stop();const list=bars[selected].chords,removed=list.splice(selectedChord,1)[0];if(list.length)list[Math.max(0,selectedChord-1)].beats+=removed.beats;selectedChord=Math.max(0,selectedChord-1);$('chordEditor').close();commitScore();};
$('melodyGenerate').onclick=()=>{stop();const [minFret,maxFret]=$('melodyRegion').value.split(',').map(Number);arrangement=guitarMelody(bars,{seed:++melodySeed,minFret,maxFret});$('melodyGrid').innerHTML=arrangement.map(s=>{const v=s.shape;return `<div class="melody-card ${v?'':'missing'}"><div class="melody-top">BAR ${Math.floor(s.beat/4)+1} · 拍 ${s.beat%4+1} · ${s.beats} 拍</div><h3>${safe(s.symbol)}</h3>${v?`<div class="melody-top">MELODY ${pitchLabel(s.symbol,v.top)}</div>${diagram(v.frets)}<div class="melody-frets">${v.frets.map(f=>f<0?'×':f).join(' ')}</div><p>${v.omitted.length?'省略音 '+v.omitted.join(' · '):'完整和弦音'} · 最高音帶旋律</p>`:'<p>這個區域沒有符合跨度與低音條件的按法。可改選全指板或簡化延伸音。</p>'}</div>`;}).join('');const missing=arrangement.filter(s=>!s.shape).length;$('melodyNote').textContent=missing?'有 '+missing+' 個和弦沒有合適按法；請放寬把位或編輯和弦後再生成。':'第 '+melodySeed+' 組 · 四音和弦、至多跨四格 · 圖示由低 E 到高 e；× 弦需悶音，請依手掌調整指法。';};
async function previewArrangement(){if(!arrangement.length){status('請先產生和弦旋律。');return;}await startPerformance(playbackSlice(melodyEvents(arrangement),startBar,bars.length),{label:'吉他按法與頂聲部',kind:'melody'});}
$('melodyPlay').onclick=previewArrangement;
$('melodyMidi').onclick=()=>{if(!arrangement.length||arrangement.some(s=>!s.shape)){status('請先生成所有和弦都有按法的一組 chord melody。');return;}downloadNotes(melodyEvents(arrangement),'chord-melody');};
function updateCue(){
 $('startPoint').textContent='FROM BAR '+(startBar+1);
 document.querySelectorAll('.bar-cue').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===startBar)));
 if(!isPlaying&&!loading){$('position').textContent='READY · BAR '+(startBar+1);scoreFollow.update($('grid').children[startBar],false);}
}
function cueBar(i){const resume=isPlaying||loading;stop();startBar=i;select(i);updateCue();if(resume)play();else status('將從第 '+(i+1)+' 小節開始。按 PLAY 或空白鍵播放。');}
function stop({natural=false}={}){run++;isPlaying=false;loading=false;clearTimeout(timer);timer=null;if(player){player.stop({natural});player=null;}else if(!natural)piano?.stop();$('play').textContent='PLAY';$('play').setAttribute('aria-pressed','false');updateCue();document.querySelectorAll('.playing,.sounding').forEach(el=>el.classList.remove('playing','sounding'));}
let appliedTempo=clampTempo($('tempo').value);$('tempo').value=appliedTempo;
function updateTempoHint(){
 $('tempoHint').textContent=`每拍 ${(60/appliedTempo).toFixed(2)} 秒 · 4/4 每小節 ${(240/appliedTempo).toFixed(2)} 秒。播放中可直接變速。`;
}
function applyTempo(commit=false){
 let value=Number($('tempo').value);
 if(!validTempo(value)){if(!commit)return;value=$('tempo').value.trim()&&Number.isFinite(value)?Math.max(30,Math.min(260,value)):appliedTempo;$('tempo').value=value;}
 appliedTempo=value;player?.setTempo(value);updateTempoHint();save();
}
$('tempo').oninput=()=>applyTempo();$('tempo').onchange=()=>applyTempo(true);$('tempo').onblur=()=>applyTempo(true);
$('tempo').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applyTempo(true);$('tempo').blur();}};
async function previewScale(scale,c){
 const root=scale.root??c.root,offsets=scale.pcs.map(pc=>mod(pc-root)).sort((a,b)=>a-b);
 const notes=[...offsets,12].map((n,i)=>({note:60+root+n,beat:i*.5,duration:.42,velocity:.65}));
 await startPerformance({notes,beats:notes.length*.5,startBar:0},{label:scale.name+' · 上行試聽',kind:'scale'});
}
function refreshScorePlayback({quantize=0}={}){
 if(!player||playbackKind!=='score')return;
 applyTempo(true);
 const clip=playbackSlice(events(bars,$('pattern').value,performanceOptions()),startBar,bars.length);
 player.setNotes(clip.notes,clip.beats,{quantize});player.setLoop($('loop').checked);
}
async function play(from=startBar){await startPerformance(playbackSlice(events(bars,$('pattern').value,performanceOptions()),startBar,bars.length),{label:performanceLabel($('pattern').value,pianoSettings.genreRevision),kind:'score',initialBeat:Math.max(0,from-startBar)*4});}
async function startPerformance(clip,{label,kind,initialBeat=0}){
 stop();applyTempo(true);if(!clip.notes.length){status('起播點後沒有音符，請選擇其他小節或生成和弦。');return;}
 const token=run;loading=true;playbackKind=kind;$('position').textContent='LOADING PIANO';
 try{piano ||=new Piano;await piano.load();if(token!==run)return;}
 catch{if(token===run){stop();status('鋼琴採樣載入失敗，請重試。MIDI 匯出仍可使用。');}return;}
 loading=false;isPlaying=true;scoreFollow.resume();$('play').setAttribute('aria-pressed','true');
 player=new BeatPlayer(piano,clip.notes,clip.beats,{startBeat:initialBeat,bpm:appliedTempo,loop:kind!=='scale'&&$('loop').checked});
 function tick(){
  if(token!==run)return;if(!player.pump()){stop({natural:true});return;}
  const localBeat=Math.max(0,player.beatAt())%player.beats,beat=(kind==='score'?startBar:clip.startBar)*4+localBeat,idx=Math.min(bars.length-1,Math.floor(beat/4)),within=beat%4;
  if(kind!=='scale'){
   document.querySelectorAll('.bar').forEach((el,j)=>el.classList.toggle('playing',j===idx));
   document.querySelectorAll('.chord-event').forEach(el=>{let at=0;const cs=chordList(bars[+el.dataset.bar]);for(let j=0;j<+el.dataset.chord;j++)at+=cs[j].beats;el.classList.toggle('sounding',+el.dataset.bar===idx&&within>=at&&within<at+cs[+el.dataset.chord].beats);});
   scoreFollow.update($('grid').querySelector('.sounding')||$('grid').children[idx],true);
  }
  $('position').textContent=(kind==='scale'?'SCALE':`BAR ${idx+1} / ${bars.length}`)+` · BEAT ${Math.floor(within)+1} · ${player.bpm} BPM`;
  $('position').dataset.beat=beat.toFixed(3);timer=setTimeout(tick,25);
 }
 tick();status((kind==='scale'?'':('從 BAR '+(clip.startBar+1)+' 試聽 · '))+label);
}
function togglePlayback(){if(isPlaying||loading)stop();else play();}
$('play').onclick=()=>play();$('stop').onclick=stop;
$('loopButton').onclick=()=>{$('loop').checked=!$('loop').checked;$('loopButton').setAttribute('aria-pressed',String($('loop').checked));if(playbackKind!=='scale')player?.setLoop($('loop').checked);};
document.addEventListener('keydown',e=>{if(spaceToggles(e)&&!document.querySelector('dialog[open]')){e.preventDefault();togglePlayback();}});
$('dockMidi').onclick=()=>exportMidi();
let downloadURL=null;function downloadNotes(notes,suffix){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([midiBytes(notes,bars.length*4,{bpm:appliedTempo})],{type:'audio/midi'}));const a=document.createElement('a');a.href=downloadURL;a.download='KHIMAIRA-'+suffix+'.mid';a.click();status('已下載 '+suffix+' MIDI。');}
function exportMidi(sustained=false){const notes=events(bars,sustained?'sustain':$('pattern').value,performanceOptions());if(!notes.length){status('尚無可匯出的音符。');return;}if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([midiBytes(notes,bars.length*4,{bpm:appliedTempo,split:$('midiSplit').value==='split',pedal:$('midiPedal').value==='on',chordSpans:voicePlan(bars).map(c=>({start:c.beat,end:c.beat+c.beats,symbol:c.symbol})),melody:referenceNotes(performanceOptions()).map(n=>({start:n.beat,end:n.beat+n.duration}))})],{type:'audio/midi'}));const a=document.createElement('a');a.href=downloadURL;a.download='KHIMAIRA-'+keyName(currentKey().root,currentKey().mode)+'-'+bars.length+'bars-'+(sustained?'sustain':$('pattern').value==='arp'?'arp-'+$('arpMode').value+'-'+$('arpRate').value+'-'+$('arpOctaves').value+'oct':$('pattern').value)+'.mid';a.click();status(sustained?'已匯出原樣長音：音符準確填滿每個和弦拍數。':'已匯出目前演奏：音序、音長、力度與試聽使用同一組資料。');}
$('midiSustain').onclick=()=>exportMidi(true);
function transposeChart(delta){dispatch({type:'transpose',key:{root:mod(currentKey().root+delta),mode:currentKey().mode}},{message:'已移調；級數保留，可 UNDO。'});}
$('transposeDown').onclick=()=>transposeChart(-1);$('transposeUp').onclick=()=>transposeChart(1);
$('keyLock').onclick=()=>dispatch({type:harmony.keyMode==='auto'?'lock':'auto'},{message:harmony.keyMode==='auto'?'已鎖定調性。':'已依骨幹重新判定；音高保留。'});
$('keyButton').onclick=()=>{const tonicOption=[...$('keyTonic').options].find(o=>o.textContent===currentKey().tonic);$('keyTonic').value=tonicOption?.value??String(currentKey().root);const mode=currentKey().mode;for(const option of [...$('keyMode').options])if(!['major','minor'].includes(option.value))option.remove();if(!['major','minor'].includes(mode))$('keyMode').add(new Option(mode.replaceAll('-',' '),mode));$('keyMode').value=mode;$('enteredKey').textContent='Backbone entered in '+keyText(harmony.backbone.enteredKey);$('keyMode').disabled=!['major','minor'].includes(currentKey().mode);$('convertMode').disabled=true;$('keyDialog').showModal();$('keyTonic').focus();};
$('applyKey').onclick=()=>{if(dispatch({type:'transpose',key:{...selectedTonic(),mode:currentKey().mode}},{message:'已移調；骨幹與播放譜的級數保留。'}))$('keyDialog').close();};
$('originalKey').onclick=()=>{if(dispatch({type:'transpose',key:{root:harmony.backbone.enteredKey.root,tonic:harmony.backbone.enteredKey.tonic,mode:currentKey().mode}},{message:'已回到骨幹輸入時的主音；目前調式保留。'}))$('keyDialog').close();};
$('keyMode').onchange=()=>{$('convertMode').disabled=$('keyMode').value===currentKey().mode;};
$('convertMode').onclick=()=>{const mode=$('keyMode').value;if(mode===currentKey().mode){status('目前已使用這個調式。');return;}$('keyDialog').close();confirmAction('確認轉換大小調？','順階和弦會轉換為'+(mode==='minor'?'小調':'大調')+'對應。次屬與借用和弦保留；主音不變。原始骨幹留存，可 UNDO。',()=>dispatch({type:'convertMode',mode,confirmed:true},{message:'已轉換大小調；原始骨幹留存，可 UNDO。'}));};
$('copyChords').onclick=async()=>{
 const numeric=$('textFormat').value==='roman';
 const text=numeric?formatDegreeChart(harmony.score,harmony.key,{bassNames:true}):serialize(bars).replaceAll(':4','');
 try{await navigator.clipboard.writeText(text);status('已複製 '+text);}catch{$('copyOutput').hidden=false;$('copyOutput').value=text;$('copyOutput').select();status('請複製文字欄中的和弦。');}
};
chordPicker=mountChordPicker({state:()=>({...harmony,key:currentKey()}),dispatch,select,editScore:(i,j)=>{select(i,j);openEditor();}});
$('editBackbone').onclick=()=>chordPicker.open(Math.min(selected,harmony.backbone.degrees.length-1),0);
projectHarmony();syncLength();updateTempoHint();syncMethod();styleInfo();syncInput();render();save();

pianoTools=mountPianoTools($('pianoTools'),{patternControl:$('pattern'),phraseAfter:$('pattern').closest('label'),getState:()=>({...pianoSettings,style:$('style').value,pattern:$('pattern').value}),setState:patch=>{if(patch.pattern)$('pattern').value=patch.pattern;else Object.assign(pianoSettings,patch);},onChange:kind=>{if(['pattern','pianoPhrase'].includes(kind))pianoSettings.pianoRevision=2;if(kind==='pattern')activateGenre();const resume=isPlaying&&playbackKind==='score';if(!resume)stop();save();syncArp();if(resume)refreshScorePlayback();}});
$('pianoDetails').addEventListener('toggle',()=>{if($('pianoDetails').open)pianoTools.refresh();});

for(const id of ['style','pattern'])$(id).addEventListener('change',()=>{if($('pianoDetails').open)pianoTools.refresh();});
