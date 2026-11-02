import test from 'node:test';
import assert from 'node:assert/strict';
import {melodyImageModel} from '../dist/chord-melody-image.js';
import {parseChart} from '../dist/solutions.js';
import {guitarMelody} from '../dist/guitar-melody.js';

test('image uses the exact displayed voicings and separates full chord tones from played tones',()=>{
 const bars=parseChart('Cmaj13 | D7/F# | Bbmaj7 | Bdim7'),arrangement=guitarMelody(bars),before=structuredClone(arrangement);
 const model=melodyImageModel(bars,arrangement);
 assert.equal(model.cards.length,4);assert.deepEqual(model.cards[0].tones,['C','E','G','B','D','A']);
 assert.equal(model.cards[1].bass,'F#');assert.deepEqual(model.cards[3].tones,['B','D','F','Ab']);
 model.cards.forEach((c,i)=>assert.deepEqual(c.shape,arrangement[i].shape));assert.deepEqual(arrangement,before);
 assert.ok(model.cards[0].played.length<model.cards[0].tones.length);
});
test('image preserves repeated chords, partial-bar durations and rest bars in order',()=>{
 const bars=parseChart('C:2 Dm7:1 G7:1 | N.C. | C | C'),model=melodyImageModel(bars,guitarMelody(bars));
 assert.deepEqual(model.cards.map(c=>[c.symbol,c.bar,c.beat,c.beats]),[['C',1,1,2],['Dm7',1,3,1],['G7',1,4,1],['N.C.',2,1,4],['C',3,1,4],['C',4,1,4]]);
 assert.equal(model.bars[1].text,'N.C.');assert.match(model.bars[0].text,/C \(2\).*Dm7 \(1\).*G7 \(1\)/);
});
test('missing or outdated voicings are explicit, not silently substituted',()=>{
 const bars=parseChart('C | Dm'),old=guitarMelody(parseChart('F | G'));
 assert.ok(melodyImageModel(bars,old).cards.every(c=>c.shape===null));
 const slash=melodyImageModel(parseChart('C/F#'),[{symbol:'C/F#',beat:0,beats:4,shape:{frets:[2,3,2,0,-1,-1],notes:[42,48,52,55],top:55}}]);
 assert.deepEqual(slash.cards[0].tones,['C','E','G']);assert.equal(slash.cards[0].bass,'F#');assert.deepEqual(slash.cards[0].played,['F#','C','E','G']);
});
test('all 64 chord positions in a full 16-bar chart are included',()=>{
 const bars=parseChart(Array(16).fill('C Dm Em F').join('|')),model=melodyImageModel(bars,[]);
 assert.equal(model.cards.length,64);assert.deepEqual(model.cards.at(-1),{bar:16,beat:4,beats:1,symbol:'F',tones:['F','A','C'],bass:null,shape:null,played:[],melody:null});
});
