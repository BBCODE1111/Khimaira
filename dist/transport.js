// Cut a performance at a bar boundary and rebase it; never schedule earlier bars.
export function playbackSlice(notes,startBar,totalBars){
 const bar=Math.max(0,Math.min(totalBars-1,Math.trunc(startBar)||0)),offset=bar*4,end=totalBars*4;
 return {startBar:bar,beats:end-offset,notes:notes.flatMap(n=>{
  const start=Math.max(offset,n.beat),finish=Math.min(end,n.beat+n.duration);
  return finish>start?[{...n,beat:start-offset,duration:finish-start}]:[];
 })};
}
export function spaceToggles(event){
 const target=event.target;
 if(event.code!=='Space'||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return false;
 if(target?.closest?.('input,textarea,select,a,summary,[contenteditable],dialog'))return false;
 const button=target?.closest?.('button,[role="button"]');
 // Playback buttons keep focus after a click. Space must toggle transport,
 // not activate their native click handler (which starts from the cue again).
 return !button||['play','melodyPlay'].includes(button.id);
}
