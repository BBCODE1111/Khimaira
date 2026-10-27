import {parseMelody,readMelodyMidi,melodyText} from './melody-reference.js?v=18';
import {pianoPatterns,pianoRecommendations} from './piano-patterns.js?v=course-1';
import {texturePatterns} from './piano-motion.js?v=1.0.0';
const allPianoPatterns={...pianoPatterns,...texturePatterns};
export function mountPianoTools(container,{getState,setState,onChange,blankUsesExamples=false}){
 container.innerHTML=`<div class="piano-tool-grid">
 <label>PIANO PATTERN<select data-piano="pattern" aria-label="鋼琴伴奏音型"><option value="">選擇鋼琴伴奏與織體</option></select></label>
 <label>FILLS<select data-piano="pianoFills" aria-label="鋼琴填句"><option value="off">關閉 · 純伴奏</option><option value="phrase">每四小節 · 短句回答</option><option value="light">輕填句 · 每兩小節回應</option></select></label>
 <label>MELODY SPACE<select data-piano="melodyFollow" aria-label="旋律避讓"><option value="gentle">避讓重要音與演唱區域</option><option value="off">關閉旋律參考</option></select></label>
 <label>IDEA FAMILY<select data-piano="ideaFamily" aria-label="和聲靈感骨架"><option value="auto">自動挑選</option><option value="1645">1645 · 簡潔循環</option><option value="canon">Canon · 下降低音</option><option value="4536251">4536251 · 副歌推進</option></select></label></div>
 <p data-piano="recommendation"></p>
 <label>MELODY REFERENCE<textarea data-piano="melodyText" aria-label="旋律參考" rows="2" placeholder="E4:1 G4:1 R:2 | A4:2 R:2"></textarea></label>
 <div class="piano-import"><label>IMPORT MELODY MIDI<input data-piano="file" aria-label="匯入旋律 MIDI" type="file" accept=".mid,.midi,audio/midi"></label><label>TRACK<select data-piano="track" aria-label="旋律 MIDI 音軌" disabled><option>請先選擇檔案</option></select></label></div>
 <div class="piano-actions"><button type="button" data-piano="apply">APPLY MELODY</button><button type="button" data-piano="clear">CLEAR MELODY</button></div>
 <p data-piano="status" role="status"></p><p>Piano 與 TEXTURE 音型適用；數字是拍數，R 是休止，從第 1 拍對齊、最多 16 小節。參考旋律不會重複輸出成伴奏，也不會自動監聽 DAW。TEXTURE 加入附點、延留、留白、分解、三連音與五聲回應；只在旋律休止處填句，會朝下一和弦靠近；重要音相撞時減少上聲部。和弦本身若不合旋律，仍需修改和聲。${blankUsesExamples?'靈感骨架：有骨幹時，在進階選 Free 再生成；空白仍載入選定範例。':'靈感骨架用於空白生成或 Free 重構。'}</p>`;
 const el=k=>container.querySelector(`[data-piano="${k}"]`);let tracks=[];
 for(const [id,label] of Object.entries(allPianoPatterns))el('pattern').add(new Option(label,id));
 const report=t=>el('status').textContent=t;
 const refresh=()=>{
  const s=getState();for(const k of ['pianoFills','melodyFollow','ideaFamily'])el(k).value=s[k]||({pianoFills:'phrase',melodyFollow:'gentle',ideaFamily:'auto'}[k]);
  el('ideaFamily').disabled=!['Mandopop','Ballad','American pop','K-pop','Japanese rock','R&B','Soul'].includes(s.style);
  el('melodyText').value=s.melodyText||'';el('pattern').value=allPianoPatterns[s.pattern]?s.pattern:'';
  const recommended=pianoRecommendations[s.style]||pianoRecommendations.Ballad;
  el('recommendation').textContent='建議起點：'+recommended.map(id=>pianoPatterns[id]).join(' / ')+'。所有風格都可選用其餘音型。';
  try{report(s.melodyText?'已載入 '+parseMelody(s.melodyText).length+' 個旋律音；不自動重複短旋律。':'未提供旋律：依和弦演奏，填句保持稀疏。');}catch(e){report(e.message);}
 };
 for(const k of ['pattern','pianoFills','melodyFollow','ideaFamily'])el(k).onchange=()=>{if(k==='pattern'&&!el(k).value)return;setState({[k]:el(k).value});onChange(k);};
 el('apply').onclick=()=>{try{const value=el('melodyText').value.trim(),notes=parseMelody(value);setState({melodyText:value});onChange('melodyText');report('已套用 '+notes.length+' 個音，旋律在伴奏中的原始位置不變。');}catch(e){report(e.message);}};
 el('clear').onclick=()=>{setState({melodyText:''});el('melodyText').value='';tracks=[];el('file').value='';el('track').replaceChildren(new Option('請先選擇檔案',''));el('track').disabled=true;onChange('melodyText');refresh();};
 const selectTrack=()=>{try{el('melodyText').value=melodyText(tracks[+el('track').value].notes);report('已讀取音軌；請按 APPLY MELODY 套用。');}catch(e){report(e.message);}};
 el('track').onchange=selectTrack;
 el('file').onchange=async()=>{try{const file=el('file').files[0];if(!file)return;if(file.size>5*1024*1024)throw Error('旋律 MIDI 請小於 5 MB。');tracks=readMelodyMidi(await file.arrayBuffer());el('track').replaceChildren(...tracks.map((t,i)=>new Option(t.name,String(i))));el('track').disabled=false;selectTrack();}catch(e){report(e.message);}};
 refresh();return {refresh};
}
