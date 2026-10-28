// Human-authored expectations from docs/key-detection-theory.md, plus original
// independently labelled examples. Never derive the labels from detectKey().
export const reportedCases=[
 ['Dm | G | C | A7',0,'major'],['Dm7 | G7 | Cmaj7 | A7',0,'major'],
 ['C | E7 | Am | D7 | G7 | C',0,'major'],['Cmaj7 | Am7 | D7 | G7',0,'major'],
 ['F#m7 | B7 | Emaj7 | C#7',4,'major']
];
export const theoryCases=[
 ...reportedCases.slice(0,1),['C | A7 | Dm | G7',0,'major'],reportedCases[2],reportedCases[3],
 ['Em7 | A7 | Dm7 | G7 | C',0,'major'],['Cmaj7 | C7 | Fmaj7 | Fm6 | C',0,'major'],
 ['C | Db7 | C',0,'major'],['Am7 | D7 | Gmaj7',7,'major'],['Bm7b5 | E7 | Am',9,'minor'],
 ['F | G | E7 | Am',9,'minor'],['F | Fm | C',0,'major'],['C | Bb | F | C',0,'major'],
 ['C | Ab | Bb | C',0,'major'],['D | A/C# | Bm | F#m | G | D/F# | G | A',2,'major'],
 ['F | G | Em | Am',0,'major',[[9,'minor']]],['Am | F | C | G',9,'minor',[[0,'major']]],
 ['C7 | F7 | C7 | G7',0,'major']
];
// 36 additional distinct progressions: inversions, altered/suspended dominants,
// chromatic approaches, compound bars, extended forms and major/minor cadences.
export const newCases=[
 ['Dm9 | G13 | Cmaj9 | A7b9',0,'major'],
 ['Dm7/F | G7/B | Cmaj7/E | A7/C#',0,'major'],
 ['C/E | E7/G# | Am/C | D7/F# | G7/B | C',0,'major'],
 ['Cmaj9 | Am11/G | D9/F# | G13/F',0,'major'],
 ['Cmaj7 | Dm7:2 G7sus4:2 | C69 | A7alt',0,'major'],
 ['C | Dm9 | Db7#11 | Cmaj9',0,'major'],
 ['C | A7 | Dm | Eb7#11 | Dm | G7 | C | C',0,'major'],
 ['C | E7b9 | Am | A7b9 | Dm7 | G13 | Cmaj9 | C',0,'major'],
 ['C | Fmaj7 | Fm6/Ab | C/G | Dm9 | G7sus4 | C | C',0,'major'],
 ['C | Bb | Ab | G7 | C | Fm6 | G7b9 | C',0,'major'],
 ['Gmaj7/D | Am11/G | D13/F# | Gmaj9',7,'major'],
 ['G | B7/D# | Em | A7/C# | D7 | G',7,'major'],
 ['G | Am7 | Ab7#11 | Gmaj7',7,'major'],
 ['Fmaj7/A | D7/F# | Gm9/Bb | C13/E',5,'major'],
 ['Gm11 | C9sus4 | Fmaj9 | D7alt',5,'major'],
 ['F | F7/Eb | Bbmaj7/D | Bbm6/Db | F/C',5,'major'],
 ['Bbmaj7 | G7/B | Cm9/Eb | F13/A',10,'major'],
 ['Cm9 | F7sus4 | Bbmaj9 | G7b9',10,'major'],
 ['Ebmaj9 | C7/E | Fm9/Ab | Bb13/D',3,'major'],
 ['Abmaj9 | F7/A | Bbm9/Db | Eb13/G',8,'major'],
 ['Dm | Gm/Bb | A7/C# | Dm9',2,'minor'],
 ['Em7b5 | A7b9 | Dm6 | Dm',2,'minor'],
 ['Dm | Bbmaj7 | Em7b5/G | A7alt | Dm | Gm | A7sus4 | Dm',2,'minor'],
 ['Am | Bm7b5/D | E7/G# | Am9',9,'minor'],
 ['Am | Dm9 | Bb7#11 | Am6',9,'minor'],
 ['Am | Fmaj7 | Dm/F | E7b9 | Am | G | F | E7',9,'minor'],
 ['Em | Am/C | F#m7b5/A | B7/D# | Em',4,'minor'],
 ['F#m | Dmaj7 | G#m7b5/B | C#7b9 | F#m',6,'minor'],
 ['Cm | Fm/Ab | Dm7b5/F | G7b9/B | Cm',0,'minor'],
 ['Bbm | Ebm/Gb | Cm7b5/Eb | F7/A | Bbm',10,'minor'],
 ['Cmaj7 | A7 | Dm7 | G7 | Em7 | A7 | Dm9 | G13 | Cmaj9 | Fm6 | C/G | G7',0,'major'],
 ['Am | Dm | Bm7b5 | E7 | Am | F | Dm | E7 | Am | Bm7b5 | E7b9 | Am',9,'minor'],
 ['C7 | C7 | F9 | C7 | F7 | F7 | C9 | C7 | G13 | F9 | C7 | G7',0,'major'],
 ['F:2 Fm6:2 | C/E | Dm7:2 G13:2 | C69',0,'major'],
 ['Cadd9 | Dm7 | Gsus4:2 G7:2 | Cmaj7',0,'major'],
 ['Cmaj7 | Fmaj7 | Dm7 | G7 | Cmaj7 | Am7 | D7 | G7 | C',0,'major']
];
export const sectionCases=[
 {chart:'C | Dm7 | G7 | C | E | F#m7 | B7 | E',sections:[[0,4,0,'major'],[4,8,4,'major']]},
 {chart:'Cmaj7 | Am7 | Dm7 | G7 | Am | Dm | E7 | Am',sections:[[0,4,0,'major'],[4,8,9,'minor']]},
 {chart:'Dm | Gm | A7 | Dm | F | Gm7 | C7 | F',sections:[[0,4,2,'minor'],[4,8,5,'major']]},
 {chart:'G | Em | Am7 | D7 | Ebmaj7 | Fm7 | Bb7 | Eb',sections:[[0,4,7,'major'],[4,8,3,'major']]}
];
