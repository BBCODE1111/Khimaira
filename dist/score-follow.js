// Only the score's horizontal viewport moves. User browsing never seeks the audio.
export function mountScoreFollow(grid, button) {
 let following=true, active=null, playing=false, pointer=null;
 function label(){
  button.setAttribute('aria-pressed',String(following));
  button.textContent=following?'跟隨播放':'回到播放';
  button.title=following?'左右滑動可暫停跟隨':'回到目前小節並繼續跟隨';
 }
 function reveal(){
  if(!active?.isConnected||!following)return;
  const viewport=grid.getBoundingClientRect(),target=active.getBoundingClientRect();
  const left=viewport.left+8,right=viewport.right-8;
  if(target.left<left-1||target.right>right+1){
   const delta=target.width>right-left||target.left<left?target.left-left:target.right-right;
   grid.scrollTo({left:grid.scrollLeft+delta,behavior:'instant'});
  }
 }
 function pause(){following=false;label();}
 function resume(){following=true;label();reveal();}
 grid.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};},{passive:true});
 grid.addEventListener('pointermove',e=>{
  if(pointer?.id!==e.pointerId)return;
  const dx=Math.abs(e.clientX-pointer.x),dy=Math.abs(e.clientY-pointer.y);
  if(dx>8&&dx>dy){pause();pointer=null;}
 },{passive:true});
 // Touch scrolling can cancel Pointer Events as soon as the browser takes over.
 grid.addEventListener('touchstart',e=>{const t=e.touches[0];pointer={x:t.clientX,y:t.clientY};},{passive:true});
 grid.addEventListener('touchmove',e=>{
  if(!pointer)return;const t=e.touches[0];
  const dx=Math.abs(t.clientX-pointer.x),dy=Math.abs(t.clientY-pointer.y);
  if(dx>8&&dx>dy){pause();pointer=null;}
 },{passive:true});
 grid.addEventListener('pointerup',()=>{pointer=null;},{passive:true});
 grid.addEventListener('touchend',()=>{pointer=null;},{passive:true});
 grid.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)>2||e.shiftKey&&Math.abs(e.deltaY)>2)pause();},{passive:true});
 grid.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))pause();});
 button.addEventListener('click',resume);
 // Width changes (rotation, browser chrome) must keep the current chord visible.
 new ResizeObserver(()=>{if(playing)reveal();}).observe(grid);
 label();
 return {resume,update(element,isPlaying){active=element;playing=isPlaying;if(playing)reveal();}};
}
