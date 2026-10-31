// Product weights, not claims about universal genre rules. Order: inversion,
// parallel borrowing, ii–V replacement, tail approach probability, subV share.
// Regional styles retain the separate per-source pitch-collection guard.
export const morphProfiles={
 Jazz:[2,2,6,.85,.45],Gospel:[5,2,4,.65,.15],Fusion:[3,5,3,.6,.65],
 'Bossa nova':[4,1,5,.8,.25],Rock:[3,7,0,0,0],'Japanese rock':[5,3,2,.4,.1],
 House:[5,4,1,.1,0],Classical:[8,1,3,.3,0],'Phrygian dominant':[1,0,0,0,0],
 'Dorian folk':[1,0,0,0,0],Soul:[5,2,3,.55,.1],'R&B':[4,3,4,.65,.3],
 Funk:[5,4,1,.15,.1],EDM:[5,5,0,0,0],'Lo-fi hip-hop':[4,2,5,.6,.35],
 Chill:[7,2,1,.2,.05],'Neo-soul':[4,4,5,.75,.6],'American pop':[7,3,1,.2,.05],
 Mandopop:[6,3,2,.45,.1],'K-pop':[5,4,3,.5,.25],'Major blues':[1,0,0,0,0],
 'Minor blues':[1,0,0,0,0],'Neoclassical rock':[7,3,1,.2,0],'Nu-disco':[5,3,2,.35,.1],
 Ambient:[8,3,0,0,0],'Heavy Metal':[1,5,0,0,0],'Doom Metal':[1,6,0,0,0],
 Grunge:[3,6,0,0,0],Alternative:[4,5,1,.15,0],Gothic:[6,4,1,.2,.1],
 Requiem:[7,2,2,.3,.05],'Greek Hijaz':[1,0,0,0,0],'Japanese Hirajoshi':[1,0,0,0,0],
 'Japanese In-sen':[1,0,0,0,0],'Ghana Highlife':[1,0,0,0,0],'Ethiopian Tizita':[1,0,0,0,0],
 'Hawaiian Slack-key':[1,0,0,0,0],'Native Flute':[1,0,0,0,0],'Indian Bhupali':[1,0,0,0,0],
 'Indian Yaman':[1,0,0,0,0],Afrobeats:[1,0,0,0,0],Amapiano:[1,0,0,0,0],
 Reggaeton:[1,0,0,0,0],Dancehall:[1,0,0,0,0],'Latin Pop':[1,0,0,0,0],
 Flamenco:[1,0,0,0,0],'Arabic Hijaz':[1,0,0,0,0],'Celtic Dorian':[1,0,0,0,0],
 Ballad:[8,2,3,.35,.05]
};
export function morphRandom(seed,index,style,salt=0){
 let h=(seed+1)>>>0;
 for(const c of style)h=Math.imul(h^c.charCodeAt(0),16777619);
 h=Math.imul(h^(index+salt*65537),2246822507);h=Math.imul(h^(h>>>13),3266489909);
 return ((h^(h>>>16))>>>0)/4294967296;
}
export function techniqueChoice(style,seed,index){
 const weights=morphProfiles[style]||morphProfiles.Jazz,total=weights[0]+weights[1]+weights[2];
 const n=morphRandom(seed,index,style)*total;
 return n<weights[0]?0:n<weights[0]+weights[1]?1:2;
}
