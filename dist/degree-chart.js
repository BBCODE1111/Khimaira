import {parse,mod,keyName,spellInterval,analyzeHarmony} from './music.js?v=key-functional-1';

// Chromatic Roman notation is major-referenced in BOTH modes: Cm–Ab–Bb is
// i–bVI–bVII. Quality is explicit, so changing tonic never changes chord type.
const steps=[0,2,4,5,7,9,11],numerals=['I','II','III','IV','V','VI','VII'];
const letters='CDEFGAB';
const signed=n=>{n=mod(n);return n>6?n-12:n;};
export function normalizeKey(value={}){
 if(typeof value==='number')value={root:value};
 const root=mod(Number(value.root??0)),mode=value.mode||'major';
 if(!Number.isFinite(root)||!Number.isInteger(root))throw Error('Invalid tonic');
 const tonic=value.tonic||keyName(root,mode==='minor'?'minor':'major');
 if(parse(tonic)?.root!==root)throw Error('Tonic spelling does not match pitch');
 return {root,mode,tonic};
}
function pitchDegree(name,key){
 const p=parse(name);if(!p)throw Error('Invalid pitch: '+name);
 const degree=mod7(letters.indexOf(p.rootName[0])-letters.indexOf(key.tonic[0]));
 return {degree:degree+1,alteration:signed(p.root-key.root-steps[degree])};
}
const mod7=n=>((n%7)+7)%7;
function degreePitch(d,key){return spellInterval(key.tonic,steps[d.degree-1]+d.alteration,d.degree-1);}
export function chordToDegree(symbol,key={}){
 key=normalizeKey(key);const c=parse(symbol);if(!c)throw Error('無法辨識 '+symbol);
 return {...pitchDegree(c.rootName,key),quality:c.q,bass:c.bassName?pitchDegree(c.bassName,key):null};
}
export function degreeToChord(chord,key={}){
 key=normalizeKey(key);const symbol=degreePitch(chord,key)+chord.quality+(chord.bass?'/'+degreePitch(chord.bass,key):'');
 if(!parse(symbol))throw Error('Unsupported chord spelling: '+symbol);
 return symbol;
}
function romanHead(text){
 const m=text.replaceAll('♭','b').replaceAll('♯','#').match(/^([b#]{0,2})(VII|III|VI|IV|II|V|I|vii|iii|vi|iv|ii|v|i)(.*)$/);
 if(!m)throw Error('無法辨識級數 '+text);
 const degree=numerals.indexOf(m[2].toUpperCase())+1;
 const alteration=[...m[1]].reduce((n,c)=>n+(c==='#'?1:-1),0),minor=m[2]===m[2].toLowerCase();
 let q=m[3];
 if(/^ø7?$/.test(q))q='m7b5';else if(/^°7?$/.test(q))q=q.endsWith('7')?'dim7':'dim';
 else if(q==='+')q='aug';else if(minor&&(q.startsWith('maj')||!/^(m|dim|sus|5)/.test(q)))q=q.startsWith('maj')?'mM'+q.slice(1):'m'+q;
 if(!parse('C'+q))throw Error('不支援的級數和弦 '+text);
 return {degree,alteration,quality:q,bass:null};
}
export function parseRoman(token,key={}){
 key=normalizeKey(key);
 // 6/9 is a chord quality, /V is a secondary function, /3 is a bass degree.
 const parts=token.replace('6/9','69').split('/');
 const head=parts.shift(),sub=head.startsWith('subV');let chord=romanHead(sub?'bII'+head.slice(4):head);
 if(parts.length&&/^[b#♭♯]*(?:[ivIV]+)$/.test(parts[0])){
  const target=romanHead(parts.shift()),targetName=degreePitch(target,key);
  chord=chordToDegree(degreeToChord(chord,{root:parse(targetName).root,tonic:targetName,mode:'major'}),key);
 }
 if(parts.length){
  const m=parts.shift().replaceAll('♭','b').replaceAll('♯','#').match(/^([b#]{0,2})([1-7])$/);
  if(m)chord.bass={degree:+m[2],alteration:[...m[1]].reduce((n,c)=>n+(c==='#'?1:-1),0)};
  else {const bass=token.split('/').at(-1);if(!/^[A-G][#b]{0,2}$/.test(bass))throw Error('轉位低音請用音名或級數，例如 I/E 或 I/3');chord.bass=pitchDegree(bass,key);}
 }
 if(parts.length)throw Error('無法辨識級數 '+token);
 return chord;
}
export function resolveChordToken(token,key={}){return parse(token)?token:degreeToChord(parseRoman(token,key),key);}
export function chartToDegrees(bars,key={}){
 return bars.map(b=>({chords:(b.chords||[]).map(c=>({...chordToDegree(c.symbol,key),beats:c.beats}))}));
}
export function materializeChart(bars,key={}){
 return bars.map(b=>({chords:b.chords.map(c=>({symbol:degreeToChord(c,key),beats:c.beats}))}));
}
export function parseDegreeChart(text,key={}){
 key=normalizeKey(key);let t=text.trim().replace(/[.。]+$/,'').trim();if(t.startsWith('|'))t=t.slice(1);if(t.endsWith('|'))t=t.slice(0,-1);
 const bars=t.split('|');if(bars.length>16)throw Error('目前最多支援 16 小節。');
 return bars.map(bar=>{
  const tokens=bar.trim().split(/\s+|,(?![^()]*\))/).filter(Boolean);if(tokens.length>4)throw Error('每小節最多四個和弦。');
  const chords=tokens.map((token,i)=>{
   const [symbol,duration,...rest]=token.split(':');if(rest.length)throw Error('無法辨識拍數 '+token);
   const beats=duration===undefined?(tokens.length===3?[2,1,1][i]:4/tokens.length):Number(duration);
   if(!Number.isFinite(beats)||beats<=0)throw Error('拍數必須大於零。');
   return {...(parse(symbol)?chordToDegree(symbol,key):parseRoman(symbol,key)),beats};
  });
  if(chords.length&&Math.abs(chords.reduce((n,c)=>n+c.beats,0)-4)>1e-8)throw Error('每小節的拍數合計須為 4。');
  return {chords};
 });
}
export function formatDegree(chord){
 const accidental=n=>n>0?'#'.repeat(n):'b'.repeat(-n);
 let numeral=numerals[chord.degree-1],q=chord.quality;
 if(q==='m7b5'){numeral=numeral.toLowerCase();q='ø7';}
 else if(q.startsWith('dim')){numeral=numeral.toLowerCase();q=q==='dim7'?'°7':'°';}
 else if(q.startsWith('m')&&!q.startsWith('maj')){numeral=numeral.toLowerCase();q=q.startsWith('mMaj')?'maj'+q.slice(4):q.slice(1);}
 return accidental(chord.alteration)+numeral+q+(chord.bass?'/'+accidental(chord.bass.alteration)+chord.bass.degree:'');
}
// One analysis feeds both the detector and all user-facing function labels.
export function analyzeDegreeChart(bars,key={root:0,mode:'major'},options={}){return analyzeHarmony(materializeChart(bars,key),normalizeKey(key),options);}
export function degreeLabels(bars,key,options={}){
 const labels=bars.map(b=>b.chords.map(()=>''));for(const c of analyzeDegreeChart(bars,key,options).events)labels[c.bar][c.chord]=c.label;return labels;
}
export function formatDegreeChart(bars,key={root:0,mode:'major'},{bassNames=false}={}){
 const labels=degreeLabels(bars,key);
 return '| '+bars.map((b,i)=>b.chords.map((c,j)=>{
  let label=labels[i][j];
  if(c.bass&&!bassNames){label=label.replace(/\/[A-G][#b]*$/,'');const a=c.bass.alteration;label+='/'+(a>0?'#'.repeat(a):'b'.repeat(-a))+c.bass.degree;}
  if(!bassNames){const restored=parseRoman(label,key);if(restored.degree!==c.degree||restored.alteration!==c.alteration||restored.quality!==c.quality)label=formatDegree(c);}
  return label+(c.beats===4?'':':'+c.beats);
 }).join(' ')).join(' | ')+' |';
}
export function sameDegrees(a,b){return JSON.stringify(a)===JSON.stringify(b);}
