import {test} from 'node:test';import assert from 'node:assert/strict';
import {songs} from '../dist/song-pool.js';import {styles} from '../dist/style-engine.js';import {studyMoods,studyMood,exampleTitle} from '../dist/example-titles.js';
test('every reference and every style study has a distinct mood description',()=>{
 for(const [i,song] of songs.entries()){assert.ok(song.mood?.length>=5 && song.mood.length<=9,song.id);assert.equal(exampleTitle(song,i),`Ex${i+1} · ${song.mood}`);}
 assert.equal(new Set(songs.map(s=>s.mood)).size,songs.length);
 for(const [style,cfg] of Object.entries(styles)){assert.ok(studyMoods[style],style);assert.ok(studyMoods[style].length>=cfg.phrases.length,style);assert.equal(new Set(cfg.phrases.map((_,i)=>studyMood(style,i))).size,cfg.phrases.length);}
});
