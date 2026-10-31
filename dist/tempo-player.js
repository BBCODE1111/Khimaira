export const validTempo=value=>Number.isFinite(Number(value))&&Number(value)>=30&&Number(value)<=260;
export const clampTempo=(value,fallback=92)=>validTempo(value)?Number(value):fallback;

// Musical beats are the source of truth; audio seconds are derived only near playback.
export class BeatPlayer {
 constructor(piano,notes,beats,{bpm=92,loop=false,lead=.04,lookahead=.18,startBeat=0}={}){
  this.piano=piano;this.notes=notes;this.beats=beats;this.bpm=clampTempo(bpm);
  this.anchorTime=piano.context.currentTime+lead;this.anchorBeat=Math.max(0,Math.min(beats,Number(startBeat)||0));
  this.lookahead=lookahead;this.scheduled=new Map;this.stopBeat=loop?Infinity:beats;this.stopped=false;this.revision=0;this.pending=null;
 }
 beatAt(time=this.piano.context.currentTime){return this.anchorBeat+(time-this.anchorTime)*this.bpm/60;}
 timeAt(beat){return this.anchorTime+(beat-this.anchorBeat)*60/this.bpm;}
 setTempo(value){
  if(!validTempo(value)||Number(value)===this.bpm||this.stopped)return;
  const now=this.piano.context.currentTime,beat=this.beatAt(now);
  // Before the first attack, retain the short startup lead instead of scheduling past events.
  this.anchorBeat=Math.max(0,beat);this.anchorTime=beat<0?this.anchorTime:now;this.bpm=Number(value);
  for(const [key,event] of this.scheduled){
   if(event.when>now){event.voice.cancel();this.scheduled.delete(key);}
   else if(event.endBeat>beat){event.voice.retime(this.timeAt(event.endBeat),event.duration*60/this.bpm);}
  }
  this.pump();
 }
 // MORPH can queue a bar-boundary switch; other live edits preserve common held pitches.
 setNotes(notes,beats=this.beats,{quantize=0}={}){
  if(quantize>0&&beats===this.beats){
   const beat=Math.max(0,this.beatAt()),cut=(Math.floor(beat/quantize)+1)*quantize;
   if(this.pending&&beat>=this.pending.cut)this.pump();
   this.pending={notes,cut};
   for(const [key,event] of this.scheduled){
    if(event.startBeat>=cut){event.voice.cancel();this.scheduled.delete(key);}
    else if(event.endBeat>cut){event.endBeat=cut;event.voice.retime(this.timeAt(cut),event.duration*60/this.bpm);}
   }
   this.pump();return;
  }
  this.pending=null;
  const now=this.piano.context.currentTime,oldBeat=Math.max(0,this.beatAt()),loop=this.stopBeat===Infinity;
  const beat=Math.floor(oldBeat/this.beats)*beats+Math.min(oldBeat%this.beats,Math.max(0,beats-1e-8));
  const active=[...this.scheduled.values()].filter(e=>e.when<=now&&e.endBeat>oldBeat);
  for(const event of this.scheduled.values())if(event.when>now)event.voice.cancel();
  this.notes=notes;this.beats=beats;this.anchorBeat=beat;this.anchorTime=now;
  this.stopBeat=loop?Infinity:(Math.floor(beat/beats)+1)*beats;this.scheduled.clear();
  const cycle=Math.floor(beat/beats);
  notes.forEach((n,i)=>{
   const startBeat=cycle*beats+n.beat,endBeat=Math.min(startBeat+n.duration,this.stopBeat);
   if(startBeat>beat||endBeat<=beat)return;
   const index=active.findIndex(e=>e.note===n.note);if(index<0)return;
   const event=active.splice(index,1)[0];event.voice.retime(this.timeAt(endBeat),n.duration*60/this.bpm);
   this.scheduled.set(this.revision+':'+cycle+':'+i,{...event,startBeat,endBeat,duration:n.duration});
  });
  for(const e of active){if(e.voice.damp)e.voice.damp(now);else e.voice.cancel();}
  this.pump();
 }
 setLoop(enabled){
  const beat=Math.max(0,this.beatAt());this.stopBeat=enabled?Infinity:(Math.floor(beat/this.beats)+1)*this.beats;
  for(const [key,event] of this.scheduled){
   if(event.startBeat>=this.stopBeat){event.voice.cancel();this.scheduled.delete(key);}
   else {const cut=this.pending&&key.startsWith(this.revision+':')?this.pending.cut:Infinity;const endBeat=Math.min(event.startBeat+event.duration,this.stopBeat,cut);if(endBeat!==event.endBeat){event.endBeat=endBeat;event.voice.retime(this.timeAt(endBeat),event.duration*60/this.bpm);}}
  }
 }
 pump(){
  if(this.stopped||!(this.beats>0))return false;
  const now=this.piano.context.currentTime,beat=this.beatAt(now);
  if(beat>=this.stopBeat)return false;
  if(this.pending&&beat>=this.pending.cut){this.notes=this.pending.notes;this.pending=null;this.revision++;}
  for(const [key,event] of this.scheduled)if(event.endBeat<=beat)this.scheduled.delete(key);
  const firstCycle=Math.floor(Math.max(0,beat)/this.beats),lastCycle=Math.floor(Math.max(0,this.beatAt(now+this.lookahead))/this.beats);
  const streams=this.pending?[{notes:this.notes,from:-Infinity,to:this.pending.cut,revision:this.revision},{notes:this.pending.notes,from:this.pending.cut,to:Infinity,revision:this.revision+1}]:[{notes:this.notes,from:-Infinity,to:Infinity,revision:this.revision}];
  for(const stream of streams)for(let cycle=firstCycle;cycle<=lastCycle;cycle++)for(let i=0;i<stream.notes.length;i++){
   const n=stream.notes[i],originalStart=cycle*this.beats+n.beat;
   if(originalStart>=stream.to||originalStart+n.duration<=stream.from)continue;
   const startBeat=Math.max(originalStart,stream.from),endBeat=Math.min(originalStart+n.duration,this.stopBeat,stream.to),key=stream.revision+':'+cycle+':'+i;
   if(startBeat>=this.stopBeat||endBeat<=Math.max(0,beat)||this.scheduled.has(key))continue;
   const when=Math.max(now,this.timeAt(startBeat));if(when>now+this.lookahead)continue;
   // If the browser was suspended, resume a held note; never replay a burst of expired attacks.
   const duration=this.timeAt(endBeat)-when;if(duration<=0)continue;
   const voice=this.piano.note(n.note,when,duration,n.velocity);
   this.scheduled.set(key,{voice,when,startBeat,endBeat,duration:originalStart+n.duration-startBeat,note:n.note});
  }
  return true;
 }
 stop({natural=false}={}){this.stopped=true;this.pending=null;this.scheduled.clear();if(!natural)this.piano.stop();}
}
