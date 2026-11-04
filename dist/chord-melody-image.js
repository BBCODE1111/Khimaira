import {parse,chordTones,mod,names} from './music.js?v=1.0.14';
import {chordList} from './solutions.js?v=1.0.14';

// Export the selected voicings, never run the guitar generator a second time.
export function melodyImageModel(bars,arrangement){
 const cards=[];
 bars.forEach((bar,index)=>{
  const chords=chordList(bar);let beat=index*4;
  if(!chords.length)cards.push({bar:index+1,beat:1,beats:4,symbol:'N.C.',rest:true,tones:[],played:[]});
  for(const item of chords){
   const c=parse(item.symbol);if(!c)throw Error('Invalid chord');
   const tones=chordTones(item.symbol),source=arrangement.find(s=>s.symbol===item.symbol&&Math.abs(s.beat-beat)<.001&&Math.abs(s.beats-item.beats)<.001);
   const shape=source?.shape?structuredClone(source.shape):null;
   const noteName=n=>{const i=c.intervals.findIndex(v=>mod(c.root+v)===mod(n));return i>=0?tones[i]:c.bassName&&mod(n)===c.bass?c.bassName:names[mod(n)];};
   cards.push({bar:index+1,beat:beat-index*4+1,beats:item.beats,symbol:item.symbol,tones,bass:c.bassName,shape,
    played:shape?[...new Set(shape.notes.map(noteName))]:[],melody:shape?noteName(shape.top):null});
   beat+=item.beats;
  }
 });
 return {bars:bars.map((bar,i)=>({number:i+1,text:chordList(bar).map(c=>c.symbol+(c.beats===4?'':` (${c.beats})`)).join('  →  ')||'N.C.'})),cards};
}

const copy={
 'zh-Hant':{title:'和弦旋律練習譜',progression:'和弦進行',bar:'小節',beat:'起拍',duration:'拍長',tones:'和弦組成音',bass:'指定低音',played:'指法實際音',melody:'最高旋律音',rest:'休止小節',missing:'目前區域無合適指法',retry:'請調整把位或和弦，再生成。',legend:'標準調弦 E A D G B e（由低至高） · × 不彈 · ○ 空弦 · 數字為品格',note:'組成音列出完整和弦；吉他指法可能省略部分音。進行中括號表示拍長。'},
 en:{title:'Chord Melody Practice Sheet',progression:'CHORD PROGRESSION',bar:'BAR',beat:'BEAT',duration:'LENGTH',tones:'CHORD TONES',bass:'SLASH BASS',played:'VOICING TONES',melody:'TOP MELODY NOTE',rest:'Rest bar',missing:'No voicing in this region',retry:'Adjust the fret region or chord and generate again.',legend:'Standard tuning E A D G B e (low to high) · × mute · ○ open · Numbers show frets',note:'Chord tones show the full chord; a guitar voicing may omit notes. Parentheses show duration in beats.'}
};
const palette={paper:'#f5f0e5',ink:'#182d3d',muted:'#52616a',gold:'#af8750',line:'#d4c8b4',card:'#fffdf8'};
const font='system-ui, -apple-system, "Noto Sans TC", sans-serif';
function lines(ctx,text,width){
 const result=[];let line='';
 // Word wrapping for English; character wrapping also handles long chord names and CJK.
 for(const token of String(text).match(/\S+\s*|\s+/g)||[]){
  if(ctx.measureText(line+token).width<=width){line+=token;continue;}
  if(line.trim()){result.push(line.trimEnd());line='';}
  for(const char of token){if(ctx.measureText(line+char).width>width&&line){result.push(line.trimEnd());line='';}line+=char;}
 }
 if(line.trim())result.push(line.trimEnd());return result;
}
function write(ctx,text,x,y,width,{size=18,weight=400,color=palette.ink,lineHeight=size*1.45}={}){
 ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;
 const rows=lines(ctx,text,width);for(const row of rows){ctx.fillText(row,x,y);y+=lineHeight;}return y;
}
function diagram(ctx,frets,x,y,width){
 const pressed=frets.filter(f=>f>0),start=Math.max(1,pressed.length?Math.min(...pressed):1);
 const left=x+44,gap=(width-64)/5,top=y+35,step=30;
 ctx.strokeStyle=palette.line;ctx.lineWidth=1.5;
 for(let f=0;f<=4;f++){ctx.beginPath();ctx.moveTo(left,top+f*step);ctx.lineTo(left+5*gap,top+f*step);ctx.stroke();}
 ctx.font=`14px ${font}`;ctx.fillStyle=palette.muted;ctx.fillText(`${start}fr`,x+2,top+20);
 for(let i=0;i<6;i++){
  const sx=left+i*gap;ctx.beginPath();ctx.moveTo(sx,top);ctx.lineTo(sx,top+4*step);ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle=palette.ink;ctx.font=`16px ${font}`;
  ctx.fillText(frets[i]<0?'×':frets[i]===0?'○':'',sx,top-12);
  if(frets[i]>0){ctx.beginPath();ctx.arc(sx,top+(frets[i]-start+.5)*step,9,0,2*Math.PI);ctx.fill();}
  ctx.font=`14px ${font}`;ctx.fillStyle=palette.muted;ctx.fillText(['E','A','D','G','B','e'][i],sx,top+4*step+23);
  ctx.fillStyle=palette.ink;ctx.fillText(frets[i]<0?'×':String(frets[i]),sx,top+4*step+46);
 }
 ctx.textAlign='left';
}

export function renderMelodyImage(model,{language='zh-Hant',key='',tempo='',canvas=document.createElement('canvas')}={}){
 const t=copy[language]||copy['zh-Hant'],ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const width=1440,pad=52,gap=20,cols=Math.min(4,Math.max(1,model.cards.length)),cardWidth=(width-pad*2-gap*(cols-1))/cols;
 const contentWidth=cardWidth-40;
 const rowHeight=card=>{
  ctx.font=`600 34px ${font}`;const title=lines(ctx,card.symbol,contentWidth).length*44;
  ctx.font=`400 18px ${font}`;
  const detail=[`${t.tones}: ${card.tones.join(' · ')}`,card.bass?`${t.bass}: ${card.bass}`:'',`${t.played}: ${card.played.join(' · ')}`].filter(Boolean).reduce((h,s)=>h+lines(ctx,s,contentWidth).length*27+10,0);
  return Math.max(520,160+title+250+detail);
 };
 const heights=[];for(let i=0;i<model.cards.length;i+=cols)heights.push(Math.max(...model.cards.slice(i,i+cols).map(rowHeight)));
 ctx.font=`500 22px ${font}`;
 const progression=model.bars.map(b=>`${String(b.number).padStart(2,'0')}  | ${b.text} |`);
 const progressionCols=Math.min(4,Math.max(1,progression.length)),progressionWidth=(width-pad*2)/progressionCols,progressionRows=[];
 for(let i=0;i<progression.length;i+=progressionCols)progressionRows.push(Math.max(...progression.slice(i,i+progressionCols).map(s=>lines(ctx,s,progressionWidth-36).length*32))+30);
 const progressionHeight=progressionRows.reduce((a,b)=>a+b,0)+14;
 const top=230+progressionHeight,height=top+heights.reduce((a,b)=>a+b+gap,0)+136;
 // A single PNG fits common mobile canvas limits even for 16 bars × 4 chords.
 const scale=Math.min(2,Math.sqrt(15000000/(width*height)),16000/height);
 canvas.width=Math.floor(width*scale);canvas.height=Math.floor(height*scale);ctx.scale(scale,scale);ctx.textBaseline='alphabetic';
 ctx.fillStyle=palette.paper;ctx.fillRect(0,0,width,height);ctx.fillStyle=palette.ink;ctx.fillRect(0,0,width,152);
 write(ctx,'KHIMAIRA',pad,48,600,{size:22,weight:700,color:'#ddbd86'});
 write(ctx,t.title,pad,104,1050,{size:38,weight:700,color:'#ffffff'});
 write(ctx,[key,tempo?`${tempo} BPM`:''].filter(Boolean).join('  ·  '),pad,134,1200,{size:17,color:'#d4e0e5'});
 write(ctx,t.progression,pad,194,1200,{size:19,weight:700});
 ctx.fillStyle=palette.card;ctx.fillRect(pad,210,width-pad*2,progressionHeight);
 let py=244;for(let row=0;row<progressionRows.length;row++){
  for(let col=0;col<progressionCols;col++){const line=progression[row*progressionCols+col];if(line)write(ctx,line,pad+18+col*progressionWidth,py,progressionWidth-36,{size:22,weight:500,lineHeight:32});}
  py+=progressionRows[row];
 }
 let y=top;
 for(let row=0;row<heights.length;row++){
  for(let col=0;col<cols;col++){
   const card=model.cards[row*cols+col];if(!card)break;const x=pad+col*(cardWidth+gap);
   ctx.fillStyle=palette.card;ctx.fillRect(x,y,cardWidth,heights[row]);ctx.strokeStyle=palette.line;ctx.lineWidth=1;ctx.strokeRect(x,y,cardWidth,heights[row]);
   ctx.fillStyle=palette.gold;ctx.fillRect(x,y,cardWidth,4);
   let cy=write(ctx,`${t.bar} ${String(card.bar).padStart(2,'0')} · ${t.beat} ${card.beat} · ${t.duration} ${card.beats}`,x+20,y+34,contentWidth,{size:14,color:palette.muted});
   cy=write(ctx,card.symbol,x+20,cy+24,contentWidth,{size:34,weight:600,lineHeight:44});
   if(card.shape){
    write(ctx,`${t.melody}: ${card.melody}`,x+20,cy+8,contentWidth,{size:16,color:palette.muted});diagram(ctx,card.shape.frets,x+20,cy+20,contentWidth);cy+=250;
   }else{
    cy=write(ctx,card.rest?t.rest:t.missing,x+20,cy+55,contentWidth,{size:20,weight:600});
    if(!card.rest)cy=write(ctx,t.retry,x+20,cy+15,contentWidth,{size:18,color:palette.muted});cy+=35;
   }
   if(!card.rest){
    cy=write(ctx,`${t.tones}: ${card.tones.join(' · ')}`,x+20,cy,contentWidth,{size:18})+10;
    if(card.bass)cy=write(ctx,`${t.bass}: ${card.bass}`,x+20,cy,contentWidth,{size:18})+10;
    if(card.shape)write(ctx,`${t.played}: ${card.played.join(' · ')}`,x+20,cy,contentWidth,{size:18,color:palette.muted});
   }
  }
  y+=heights[row]+gap;
 }
 y=write(ctx,t.legend,pad,y+24,width-pad*2,{size:18});
 write(ctx,t.note,pad,y+10,width-pad*2,{size:17,color:palette.muted});
 return canvas;
}

export async function melodyImageBlob(model,options){
 const canvas=renderMelodyImage(model,options);
 return new Promise((resolve,reject)=>{canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG export failed')),'image/png');});
}
