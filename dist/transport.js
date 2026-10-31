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
 return event.code==='Space'&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!target?.closest?.('button,[role="button"],input,textarea,select,a,summary,[contenteditable],dialog');
}
