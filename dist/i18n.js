import {english,chinese} from './i18n-catalog.js?v=1.0.13';

export const LANGUAGE_KEY='khimaira-language';
export const normalizeLanguage=value=>value==='en'?'en':'zh-Hant';
const han=/[\u3400-\u9fff]/;
const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const en={...Object.fromEntries(Object.entries(chinese).map(([source,target])=>[target,source])),...english};
const zh={...Object.fromEntries(Object.entries(english).map(([source,target])=>[target,source])),...chinese};
// Only known Chinese phrases are substituted inside dynamic messages. English
// labels use exact matching, so note names, chord symbols and musical IDs stay intact.
const fragments=Object.keys(en).filter(s=>han.test(s)&&s.trim().length>1).sort((a,b)=>b.length-a.length);
const phrasePattern=new RegExp(fragments.map(escapePattern).join('|'),'g');

export function translateText(value,language){
 const source=String(value),trimmed=source.trim(),map=language==='en'?en:zh;
 if(!trimmed)return source;
 if(Object.hasOwn(map,source))return map[source];
 if(Object.hasOwn(map,trimmed))return source.replace(trimmed,map[trimmed]);
 if(language==='en'){
  return source
   .replace(/從第 (\d+) 小節開始/g,'Start from bar $1')
   .replace(/第 (\d+) 小節和弦/g,'Bar $1 chords')
   .replace(/每拍 ([\d.]+) 秒 · 4\/4 每小節 ([\d.]+) 秒。播放中可直接變速。/g,'$1 seconds per beat · $2 seconds per 4/4 bar. Tempo can change during playback.')
   .replace(/(\d+) 分 SWING · (\d+)%（50% 直拍）/g,'$1th-note SWING · $2% (50% straight)')
   .replace(/ · 拍 ([\d.]+) · ([\d.]+) 拍/g,' · Beat $1 · $2 beats')
   .replace(/^第 (\d+)(?= 組 · )/,'Variation $1')
   .replace(/ · 第 ([\d.]+) 拍/g,' · Beat $1')
   .replace(/第 (\d+) 至 (\d+) 格六線指板/g,'six-string fretboard, frets $1 to $2')
   .replace(/第 (\d+)–(\d+) 格 · 上行練習/g,'Frets $1–$2 · Ascending exercise')
   .replace(/本進行功能／音集保護與手法設定後僅可變動 (\d+) 格（本次預算 (\d+) 格）。/g,'Harmonic / pitch-set protection and technique settings allow $1 changes (budget: $2).')
   .replace(/MORPH 保留骨幹 (\d+) 小節，未截斷或重複；小節選單僅用於空白生成。/g,'MORPH preserves all $1 backbone bars without truncating or repeating them. The bar menu applies only to blank generation.')
   .replace(/已保留原屬和弦，解決到 (.+)；未插入新和弦。/g,'Kept the original dominant, resolving to $1; no new chord inserted.')
   .replace(/已插入 (.+)，解決到 (.+)；骨幹保留。/g,'Inserted $1, resolving to $2; backbone retained.')
   .replace(/存檔無法讀取，原始資料已備份至 (.+)；已載入預設進行。/g,'Could not read the session. Original data backed up to $1; default progression loaded.')
   .replace(/存檔無法讀取且無法備份；原始資料保留在 (.+)，本次不會覆寫。/g,'Could not read or back up the session. Original data remains in $1 and will not be overwritten.')
   .replace(/ · (低|中|高) · /g,(_,level)=>' · '+({低:'Low',中:'Medium',高:'High'})[level]+' · ')
   .replace(phrasePattern,s=>en[s]);
 }
 return source
  .replace(/^FROM BAR (\d+)$/,'從第 $1 小節')
  .replace(/^READY · BAR (\d+)$/,'就緒 · 第 $1 小節')
  .replace(/^BAR (\d+)( \/ \d+)?(?= ·|$)/,'第 $1 小節$2')
  .replace(/ · BEAT (\d+)/,' · 第 $1 拍')
  .replace(/^Backbone entered in /,'骨幹原調：')
  .replace(/^Also fits: /,'也適用：');
}

export function mountLanguage(root=document){
 let language='zh-Hant';
 try{language=normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));}catch{/* Storage is optional. */}
 const originals=new WeakMap(),attributes=new WeakMap();
 const ignored='script,style,textarea,input,[contenteditable="true"],[data-language-switch],[translate="no"]';
 const attributeNames=['title','aria-label','placeholder','label'];
 function text(node){
  if(!node.parentElement||node.parentElement.closest(ignored))return;
  const old=originals.get(node),current=node.data;
  const source=old&&current===old.rendered?old.source:current;
  const rendered=translateText(source,language);
  originals.set(node,{source,rendered});
  if(rendered!==current){
   // An option without a value attribute derives its value from its text.
   // Freeze that value before translating its visible label.
   const option=node.parentElement.closest('option');
   if(option&&!option.hasAttribute('value'))option.value=option.textContent;
   node.data=rendered;
  }
 }
 function element(el){
  if(el.closest('script,style,[data-language-switch]'))return;
  let stored=attributes.get(el);if(!stored){stored={};attributes.set(el,stored);}
  for(const name of attributeNames){
   if(!el.hasAttribute(name))continue;
   const current=el.getAttribute(name),old=stored[name];
   const source=old&&current===old.rendered?old.source:current;
   const rendered=translateText(source,language);stored[name]={source,rendered};
   if(current!==rendered)el.setAttribute(name,rendered);
  }
 }
 function visit(node){
  if(node.nodeType===3){text(node);return;}
  if(node.nodeType===1)element(node);
  const walker=root.createTreeWalker(node,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  while(walker.nextNode())if(walker.currentNode.nodeType===3)text(walker.currentNode);else element(walker.currentNode);
 }
 const observer=new MutationObserver(records=>{
  observer.disconnect();
  for(const record of records){
   if(record.type==='characterData')text(record.target);
   else if(record.type==='attributes')element(record.target);
   else for(const node of record.addedNodes)visit(node);
  }
  observe();
 });
 function observe(){observer.observe(root.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributeNames});}
 function render(){
  observer.disconnect();root.documentElement.lang=language;visit(root.documentElement);
  root.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  observe();
 }
 function setLanguage(next,{persist=true}={}){
  language=normalizeLanguage(next);
  if(persist)try{localStorage.setItem(LANGUAGE_KEY,language);}catch{/* Switching still works in private/restricted storage. */}
  render();
 }
 root.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.language)));
 window.addEventListener('storage',event=>{if(event.key===LANGUAGE_KEY)setLanguage(event.newValue,{persist:false});});
 render();
 return {setLanguage,get language(){return language;},disconnect:()=>observer.disconnect()};
}
