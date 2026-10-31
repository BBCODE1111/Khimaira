export function virtualPiano(){
 return {context:{currentTime:0},voices:[],note(note,when,duration,velocity){
  const v={note,when,end:when+duration,velocity,cancelled:false,retimes:0,cancel(){this.cancelled=true;},damp(t){this.end=Math.min(this.end,t);},retime(end){this.end=end;this.retimes++;}};
  this.voices.push(v);return v;
 },stop(){this.voices.forEach(v=>v.cancel());}};
}
