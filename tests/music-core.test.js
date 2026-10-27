import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as music from '../dist/music.js';
import {createTheory} from '../packages/music-core/core.js';
import {compatibilityCorpus} from '../packages/music-core/compatibility-corpus.mjs';

test('deployed music core matches the single canonical source',()=>{
  execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/sync-music-core.mjs',import.meta.url)),'--check']);
});
test('Khimaira retains its pre-extraction theory and basic generation outputs',()=>{
  const expected=JSON.parse(readFileSync(new URL('../packages/music-core/fixtures/khimaira-before.json',import.meta.url)));
  const actual=compatibilityCorpus(music);
  for(const group of Object.keys(expected))assert.deepEqual(actual[group],expected[group],group);
});
test('compatibility profiles preserve intentional differences and previously fixed spelling',()=>{
  const k=createTheory('khimaira-v1'),s=createTheory('seiren-v1');
  assert.throws(()=>createTheory(),/Unknown/);
  assert.throws(()=>createTheory('typo'),/Unknown/);
  assert.equal(k.parse('Bdim').minor,true);
  assert.equal(s.parse('Bdim').minor,false);
  for(const symbol of ['Csus','C+','C°','Cm(maj7)','C-7','Cadd2','C2','Cmaj','C7b5','F##m']) {
    assert.ok(k.parse(symbol),symbol);
    assert.equal(s.parse(symbol),null,`preserve Seiren's supported syntax: ${symbol}`);
  }
  assert.deepEqual(k.chordTones('Bdim7'),['B','D','F','Ab']);
  assert.deepEqual(s.chordTones('Bdim7'),['B','D','F','Ab']);
  assert.equal(k.spellChord('D7/F#'),'D7/F#');
  assert.equal(s.spellChord('Gbsus2/Db',{root:4,mode:'minor'}),'F#sus2/C#');
  assert.equal(k.transposeSymbol('D7/F#',1,1),'Eb7/G');
  assert.equal(k.spellPitch(5,6),'E#');
  assert.equal(s.pitchName(65,{root:6,mode:'major'},true),'E#4');
  assert.equal(k.parse('AM').minor,false);
  assert.equal(k.parse('Am').minor,true);
  assert.equal('bassName' in s.parse('D7/F#'),false);
});
