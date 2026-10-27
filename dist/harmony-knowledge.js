// Original studies applying the concepts indexed in Khimairachord.md.
// Symbols are relative to C; durations and resolution targets are authored together.
export const harmonyStudies = [
 {id:'pop-1645',family:'1645',title:'留白的 1645',styles:['Mandopop','American pop','K-pop'],
  low:['Cadd9','Am7','Fsus2','Gsus4 G'],
  medium:['Cadd9 G/B','Am7','Fmaj7 Dm7','Gsus4 G'],
  high:['Cmaj9 E7/G#','Am9','Fmaj7 Fm6','Gsus4 G7']},
 {id:'pop-canon',family:'canon',title:'下降低音的敘事',styles:['Mandopop','Japanese rock','American pop'],
  low:['Cadd9','G/B','Am7','Em/G','Fadd9','C/E','Dm7','Gsus4 G'],
  medium:['Cmaj7','G/B','Am7','C/G','Fmaj7','C/E','Dm7','Gsus4 G7'],
  high:['Cmaj9','Bm7b5 E7/G#','Am9','Gm7 C7','Fmaj7','C/E A7','Dm9','Gsus4 G7']},
 {id:'pop-4536251',family:'4536251',title:'副歌推進與回家',styles:['Mandopop','Japanese rock','K-pop','Soul'],
  low:['Fadd9','Gsus4 G','Em7','Am7','Dm7','Gsus4 G','Cadd9','Cadd9'],
  medium:['Fmaj7','G/F','Em7 E7','Am7','Dm7','Gsus4 G7','Cadd9','Cadd9'],
  high:['Fmaj9','G/F','Em7','A7','Dm9','Gsus4 G7','Cmaj9','Cmaj9']},
 {id:'pop-borrow',family:'4536251',title:'借用小下屬的回答',styles:['Mandopop','Japanese rock','K-pop','Soul','R&B'],
  low:['Fadd9','G','Em7','Am7','Dm7','G','Cadd9','Cadd9'],
  medium:['Fmaj7','Fm6','C/E','Am7','Dm7','G7sus4 G7','Cadd9','Cadd9'],
  high:['Fmaj9','Fm6','Em7','A7','Dm9','G7sus4 G7','Cmaj9','Cmaj9']},
 {id:'pop-rnb',family:'1645',title:'柔和九和弦與短暫屬化',styles:['K-pop','Mandopop','R&B','Soul'],
  low:['Cmaj7','Am7','Dm7','G7sus4 G'],
  medium:['Cmaj9','Am9','Dm9','G9sus4 G9'],
  high:['Cmaj9 A7','Dm9','Fm9 Bb9','Cmaj9']},
 {id:'pop-leading',family:'canon',title:'一次導音、一次解決',styles:['Mandopop','Japanese rock','K-pop'],
  low:['Cadd9','G/B','Am7','C/G','Fadd9','C/E','Dm7','G'],
  medium:['Cadd9','E7/G#','Am7','C/G','Fmaj7','C/E','Dm7','Gsus4 G'],
  high:['Cmaj9','G#dim7','Am9','C/G','Fmaj7','C/E C#dim7','Dm9','Gsus4 G7']}
];

// Minor-key ideas are authored separately; a major-key V/vi must not resolve
// accidentally to a major-third destination after a blanket mode conversion.
const minorStudies = [
 {id:'minor-step',family:'canon',title:'小調下降與導音回歸',
  low:['Cm','G/B','Cm/Bb','Ab','Fm','Cm/G','Ab','G7'],
  medium:['Cmadd9','G/B','Cm7/Bb','Abmaj7','Fm7','Cm/G','Dm7b5','G7'],
  high:['Cm9','G7/B','Cm7/Bb','Abmaj9','Fm9','Cm/G','Dm7b5','G7b9']},
 {id:'minor-song',family:'1645',title:'小調留白與副歌抬升',
  low:['Cm','Ab','Fm','G7'],medium:['Cm7','Abmaj7','Fm7','Gsus4 G7'],high:['Cm9','Abmaj9','Dm7b5','G7b9']},
 {id:'minor-answer',family:'4536251',title:'小調下屬回答',
  low:['Fm','G7','Cm','Ab','Fm','G7','Cm','Cm'],
  medium:['Fm7','G7','Cm7','Abmaj7','Dm7b5','G7','Cmadd9','Cmadd9'],
  high:['Fm9','G7b9','Cm9','Abmaj9','Dm7b5','G7b9','Cm9','Cm9']}
];

export function learnedIdea({style,mode='major',randomness='medium',seed=0,count=4,loop=true,family='auto'}={}) {
 if(style==='Ballad')style='Mandopop';
 if(!harmonyStudies.some(s=>s.styles.includes(style)))return null;
 const available=(mode==='minor'?minorStudies:harmonyStudies.filter(s=>s.styles.includes(style)));
 // Start Japanese rock with its established IV–V–iii–vi direction.
 if(mode!=='minor'&&style==='Japanese rock')available.sort((a,b)=>(b.id==='pop-4536251')-(a.id==='pop-4536251'));
 const filtered=available.filter(s=>family==='auto'||s.family===family),pool=filtered.length?filtered:available;
 const study=pool[((Math.trunc(seed)%pool.length)+pool.length)%pool.length];
 let phrase=study[randomness]||study.medium;
 // Compress an eight-bar idea as four two-chord bars, keeping every resolution.
 if(count===4&&phrase.length===8)phrase=Array.from({length:4},(_,i)=>phrase[i*2]+' '+phrase[i*2+1]);
 const result=Array.from({length:count},(_,i)=>phrase[i%phrase.length]);
 if(phrase.length===4&&count>=8)for(let i=4;i<count;i+=8){
  // An A′ response changes the opening inversion while retaining local targets.
  if(mode==='major')result[i]=result[i].replace(/^C(maj9|add9|maj7)?(?= |$)/,'C$1/E');
  else result[i]=result[i].replace(/^Cm(7|9|add9)?(?= |$)/,'Cm$1/Eb');
 }
 const tonic=mode==='minor'?'Cmadd9':'Cadd9',dominant=mode==='minor'?'G7':'Gsus4 G';
 // Keep long forms intact, and make the actual endpoint explicit after resizing.
 if(!loop)result[count-1]=tonic;
 else if(phrase.length===8){
  const first=result[0].split(' ')[0];
  result[count-1]=first.startsWith('F')?(mode==='minor'?'C7':'Gm7 C7'):dominant;
 }
 return {id:study.id,title:study.title,family:study.family,phrase:result};
}
