// MIDI channel 1 cannot hold two independent voices on the same key. Preserve
// every distinct attack; release the older same-key voice before its retrigger.
// Different pitches (including held piano chords under answers) are untouched.
export function midiSafeNotes(source) {
 const notes=[],last=new Map();
 for(const input of [...source].sort((a,b)=>a.beat-b.beat||a.note-b.note)){
  const n={...input},prior=last.get(n.note);
  if(prior&&Math.round(prior.beat*480)===Math.round(n.beat*480)){
   prior.duration=Math.max(prior.beat+prior.duration,n.beat+n.duration)-prior.beat;
   prior.velocity=Math.max(prior.velocity,n.velocity);continue;
  }
  if(prior&&prior.beat+prior.duration>n.beat)prior.duration=n.beat-prior.beat;
  notes.push(n);last.set(n.note,n);
 }
 return notes;
}
