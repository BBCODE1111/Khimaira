const pc={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function parseMelody(text='') {
 let beat=0;const notes=[];
 for(const token of String(text).replaceAll('|',' ').trim().split(/\s+/).filter(Boolean)){
  const m=token.match(/^([A-Ga-g][#b]?[-]?\d|[Rr-]):(\d+(?:\.\d+)?)$/);
  if(!m)throw Error('旋律請用 E4:1 G4:0.5 R:0.5；R 是休止、數字是拍數。');
  const duration=Number(m[2]);if(!(duration>0&&duration<=64)||beat+duration>64.000001)throw Error('旋律最多 16 小節（64 拍），音長必須大於 0。');
  if(!/^[Rr-]$/.test(m[1])){
   const pitch=m[1].match(/^([A-Ga-g])([#b]?)(-?\d)$/),note=(Number(pitch[3])+1)*12+pc[pitch[1].toUpperCase()]+(pitch[2]==='#'?1:pitch[2]==='b'?-1:0);
   if(note<21||note>108)throw Error('旋律音域請使用 A0 至 C8。');
   notes.push({beat,duration,note});
  }beat+=duration;
 }
 return notes;
}
export function melodyText(notes) {
 const names=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],out=[];let end=0;
 const number=n=>Number(n.toFixed(6));
 for(const n of [...notes].sort((a,b)=>a.beat-b.beat)){
  if(n.beat<end-1e-6)throw Error('此音軌有重疊音符，請先在 DAW 匯出單音旋律音軌。');
  if(n.beat+n.duration>64.000001)throw Error('請匯出從專案第 1 拍開始、最多 16 小節的旋律。');
  if(n.beat>end+1e-6)out.push('R:'+number(n.beat-end));
  out.push(names[n.note%12]+(Math.floor(n.note/12)-1)+':'+number(n.duration));end=n.beat+n.duration;
 }return out.join(' ');
}

// Read SMF 0/1 as beats, preserving leading silence and separating track/channel.
// Tempo is deliberately not converted: reference and accompaniment share DAW beats.
export function readMelodyMidi(buffer) {
 const d=new DataView(buffer);let p=0,limit=d.byteLength;
 if(limit>5*1024*1024)throw Error('旋律 MIDI 請小於 5 MB。');
 const need=n=>{if(p+n>limit)throw Error('MIDI 檔案不完整。');};
 const u8=()=>{need(1);return d.getUint8(p++);};
 const u16=()=>{need(2);const n=d.getUint16(p);p+=2;return n;};
 const u32=()=>{need(4);const n=d.getUint32(p);p+=4;return n;};
 const str=n=>Array.from({length:n},()=>String.fromCharCode(u8())).join('');
 const vlq=()=>{let n=0;for(let i=0;i<4;i++){const b=u8();n=n*128+(b&127);if(!(b&128))return n;}throw Error('MIDI 時間格式錯誤。');};
 if(str(4)!=='MThd')throw Error('請選擇標準 MIDI 檔案。');
 const h=u32(),headEnd=p+h;if(h<6||headEnd>limit)throw Error('MIDI 標頭錯誤。');
 const format=u16(),tracks=u16(),ppq=u16();if(format>1||!ppq||ppq&0x8000)throw Error('只支援以拍為單位的 MIDI 格式 0 / 1。');p=headEnd;
 const results=[];let eventCount=0;
 for(let track=0;track<tracks;track++){
  if(str(4)!=='MTrk')throw Error('MIDI 音軌格式錯誤。');const size=u32(),end=p+size;
  if(end>d.byteLength)throw Error('MIDI 音軌不完整。');limit=end;
  let tick=0,status=0,name='Track '+(track+1);const active=new Map(),channels=new Map();
  while(p<end){
   if(++eventCount>100000)throw Error('MIDI 太複雜，請只匯出旋律音軌。');
   tick+=vlq();let b=u8();if(b&128)status=b;else {if(status<0x80||status>=0xf0)throw Error('MIDI running status 錯誤。');p--;}
   if(status===255){const type=u8(),len=vlq();need(len);if(type===3)name=new TextDecoder().decode(new Uint8Array(buffer,p,len));p+=len;continue;}
   if(status===240||status===247){const len=vlq();need(len);p+=len;status=0;continue;}
   if(status>=0xf0)throw Error('不支援此 MIDI 系統事件。');
   const kind=status>>4,ch=status&15,note=u8(),v=kind===12||kind===13?0:u8();
   if(note>127||v>127)throw Error('MIDI 音符資料錯誤。');
   if(ch===9)continue;
   const key=ch+':'+note;
   if(kind===9&&v>0){if(active.has(key))throw Error('MIDI 有重疊同音，請先整理旋律。');active.set(key,{beat:tick/ppq,note});}
   else if(kind===8||kind===9){const on=active.get(key);if(on){active.delete(key);const duration=tick/ppq-on.beat;if(duration>0){if(!channels.has(ch))channels.set(ch,[]);channels.get(ch).push({...on,duration});}}}
  }
  if(active.size)throw Error('MIDI 有缺少 note-off 的音符。');
  for(const [channel,notes] of channels)results.push({name:name+' · Ch '+(channel+1),notes:notes.sort((a,b)=>a.beat-b.beat)});
  limit=d.byteLength;
 }
 if(!results.length)throw Error('這份 MIDI 沒有可用的旋律音符。');return results;
}

export function referenceNotes(options={}) {
 if(options.melodyFollow==='off')return [];
 const input=Array.isArray(options.melody)?options.melody:parseMelody(options.melodyText||'');
 return input.filter(n=>Number.isFinite(n.beat)&&n.beat>=0&&Number.isFinite(n.duration)&&n.duration>0&&Number.isInteger(n.note)&&n.note>=21&&n.note<=108);
}
export const overlaps=(n,start,end)=>n.beat<end-1e-7&&n.beat+n.duration>start+1e-7;
export function protectMelody(events,melody) {
 if(!melody.length)return events;
 return events.flatMap(n=>{
  if(n.part==='bass')return [n];
  const sounding=melody.filter(m=>overlaps(m,n.beat,n.beat+n.duration));
  if(n.fill&&sounding.length)return [];
  const anchors=sounding.filter(m=>m.duration>=.5||Math.abs(m.beat-Math.round(m.beat))<.02);
  if(!anchors.length)return [n];
  // Do not rewrite the lead or harmony. Omit a close clash and make room below it.
  // A distant semitone pitch class can still be expressive; only close/minor-ninth
  // clashes are suppressed, rather than banning every non-chord melody note.
  if(anchors.some(m=>{const d=Math.abs(m.note-n.note);return d===1||d===2||d===13;}))return [];
  const ceiling=Math.min(...anchors.map(m=>m.note))-3;let note=n.note;
  while(note>ceiling&&note-12>=52)note-=12;
  if(note>ceiling||anchors.some(m=>[1,2,13].includes(Math.abs(m.note-note))))return [];
  return [{...n,note,velocity:n.velocity*.85}];
 });
}
