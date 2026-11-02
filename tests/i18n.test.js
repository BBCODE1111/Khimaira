import test from 'node:test';
import assert from 'node:assert/strict';
import {translateText,normalizeLanguage,LANGUAGE_KEY} from '../dist/i18n.js';

test('language preference is independent from musical session storage',()=>{
 assert.equal(LANGUAGE_KEY,'khimaira-language');
 assert.equal(normalizeLanguage('en'),'en');
 for(const value of [null,'','zh','zh-Hant','bogus'])assert.equal(normalizeLanguage(value),'zh-Hant');
});
test('chord spellings, durations and user-like music input remain exact in both languages',()=>{
 for(const language of ['zh-Hant','en'])for(const text of ['Cmaj7#11/G','F#dim7','C:2 Dm7:1 G7:1 | Am','I | vi | IV | V','E4:1 R:2','Bb7b9','137 BPM','N.C.'])assert.equal(translateText(text,language),text);
});
test('parameterized accessible labels and tempo descriptions translate before phrase fragments',()=>{
 assert.equal(translateText('BAR 02 · 從第 2 小節開始','en'),'BAR 02 · Start from bar 2');
 assert.equal(translateText('Am · 第 2.5 拍','en'),'Am · Beat 2.5');
 assert.equal(translateText('每拍 0.44 秒 · 4/4 每小節 1.75 秒。播放中可直接變速。','en'),'0.44 seconds per beat · 1.75 seconds per 4/4 bar. Tempo can change during playback.');
 assert.equal(translateText('第 2 組 · 四音和弦、至多跨四格 · 圖示由低 E 到高 e；× 弦需悶音，請依手掌調整指法。','en'),'Variation 2 · Four-note chords spanning up to four frets. Diagrams run from low E to high e. Mute × strings and adjust fingering for your hand.');
});
test('dynamic harmony feedback keeps the actual technique, target, and recovery message',()=>{
 assert.equal(translateText('已插入 V，解決到 C；骨幹保留。','en'),'Inserted V, resolving to C; backbone retained.');
 assert.equal(translateText('已保留原屬和弦，解決到 Dm；未插入新和弦。','en'),'Kept the original dominant, resolving to Dm; no new chord inserted.');
 assert.equal(translateText('存檔無法讀取且無法備份；原始資料保留在 khimaira-v5，本次不會覆寫。','en'),'Could not read or back up the session. Original data remains in khimaira-v5 and will not be overwritten.');
});
test('Chinese includes operation controls and updated transport counters',()=>{
 assert.equal(translateText('PLAY','zh-Hant'),'播放');
 assert.equal(translateText('RESUME FOLLOW','zh-Hant'),'繼續跟隨');
 assert.equal(translateText('BAR 12 / 16 · BEAT 3 · 137 BPM','zh-Hant'),'第 12 小節 / 16 · 第 3 拍 · 137 BPM');
});
