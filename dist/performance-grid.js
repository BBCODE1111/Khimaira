// Timing repair shared by every legacy genre, including recalled sessions.
// Quarter-note coordinates; template choice and ARP phase are independent.
const EPS=1e-8;
const anticipates=new Set(['funk','pop','house','afrobeats','bossa','latinPop','flamenco']);
const heldBass=new Set(['sustain','doom','alternative','gothic','requiem','ballad','bossa','gospel','soul','rnb','lofi','neosoul','chill','ambient','neoclassical','modalPluck','sparsePluck','pentatonicAnswer','breathingDrone','ragaDrone']);
const heldUpper=new Set(['sustain','requiem','ballad','soul','chill','gospel','ambient']);

// Timing randomness belongs to a grid slot, not to the number of chords or
// previously emitted voices. Splitting a chord cannot shift the RNG stream.
export function gridRandom(seed,beat,voice=0,salt=0){
 let state=((seed>>>0)^Math.imul(Math.round(beat*960),0x9e3779b1)^Math.imul(voice+1,0x85ebca6b)^salt)>>>0;
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}

export const sameHarmony=(a,b)=>!!a&&!!b&&a.notes[0]%12===b.notes[0]%12&&JSON.stringify([...new Set(a.notes.map(n=>n%12))].sort())===JSON.stringify([...new Set(b.notes.map(n=>n%12))].sort());
export function gridTarget(plan,index,beat,pattern,{part='upper',acrossBars=false}={}){
 const current=plan[index],next=plan[index+1];
 if(!anticipates.has(pattern))return {chord:current,anticipated:false};
 // Only genuine eighth/sixteenth pickups into an adjacent chord. Never jump
 // over a rest, skip a short intermediate chord, or anticipate an absent tail.
 // A chart/transport loop starts a fresh pass; never wrap a pickup across its
 // MIDI end marker. Pickups across ordinary bar boundaries are supported.
 const target=next;
 if(!target||Math.abs(current.beat+current.beats-target.beat)>EPS)return {chord:current,anticipated:false};
 if(sameHarmony(current,target)||current.beats<=.5+EPS||beat<=current.beat+EPS||part==='bass'&&!acrossBars||!acrossBars&&Math.abs(target.beat%4)<EPS)return {chord:current,anticipated:false};
 const distance=target.beat-beat,offbeat=Math.abs(beat-Math.round(beat))>EPS;
 if(offbeat&&distance>EPS&&distance<=.5+EPS)return {chord:target,anticipated:true};
 return {chord:current,anticipated:false};
}

export function pickupPitch(note,part,from,to){
 if(part==='bass')return Math.max(21,Math.min(108,to.notes[0]+note-from.notes[0]));
 const old=from.notes.slice(1),upper=to.notes.slice(1);
 const index=old.indexOf(note);
 if(index>=0)return upper[Math.min(index,upper.length-1)];
 // Legacy plucks may double a chord voice at the octave.
 const nearest=old.reduce((best,n,i)=>Math.abs(note-n)<Math.abs(note-old[best])?i:best,0);
 return Math.max(21,Math.min(108,upper[Math.min(nearest,upper.length-1)]+note-old[nearest]));
}

export function finishGrid(events,plan,pattern,{gate=.8,totalBeats=0,bpm=92}={}){
 // Once a part anticipates, release that part's previous harmony. Preserve
 // the new harmony through the boundary, without adding a second attack.
 for(const [i,chord] of plan.entries()){
  for(const part of ['bass','upper']){
   const pickups=events.filter(n=>n._harmony===chord.beat&&n._pickup&&n.part===part);
   if(pickups.length){
    const start=Math.min(...pickups.map(n=>n.beat));
    for(const n of events)if(n.part===part&&n._harmony<chord.beat&&n.beat<chord.beat){
     n.duration=Math.min(n.duration,Math.max(0,start-n.beat));
    }
    // The ordinary grid may itself contain an attack at the change. It is
    // redundant only if the anticipated part actually sustains over it.
    for(const n of events)if(n.part===part&&n._harmony===chord.beat&&!n._pickup&&Math.abs(n._grid-chord.beat)<EPS)n.duration=0;
   }
   // Bar-line entries already belong to the template. Arrival repair applies
   // only to an intra-bar cut, never to an ordinary new measure.
   if(Math.abs(chord.beat%4)<EPS)continue;
   const pitches=part==='bass'?[chord.notes[0]]:chord.notes.slice(1);
   const missing=pitches.filter(note=>!events.some(n=>n.note===note&&n.duration>EPS&&n.part===part&&n._harmony===chord.beat&&(Math.abs(n._grid-chord.beat)<EPS||n.beat<chord.beat&&n.beat+n.duration>chord.beat+EPS)));
   if(!missing.length)continue;
   const held=(part==='bass'?heldBass:heldUpper).has(pattern);
   // Fixed laid-back feel is part of the old template, not HUMAN randomness.
   const delay=pattern==='lofi'&&part==='upper'?Math.min(.03*bpm/60,chord.beats*.5):0;
   const duration=held?chord.beats-delay:Math.min(chord.beats-delay,.5*gate);
   for(const note of missing)events.push({beat:chord.beat+delay,note,part,duration,velocity:part==='bass'?.63:.59,articulation:held?'held':'rhythmic',_grid:chord.beat,_harmony:chord.beat});
  }
 }
 return events.filter(n=>n.duration>EPS&&n.beat<totalBeats).map(({_grid,_harmony,_pickup,...n})=>({...n,duration:Math.min(n.duration,totalBeats-n.beat)}));
}
