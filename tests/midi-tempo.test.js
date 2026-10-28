import test from 'node:test';import assert from 'node:assert/strict';
import {midiBytes} from '../dist/music.js';
const notes=[{note:60,beat:0,duration:4,velocity:.7,part:'upper'},{note:36,beat:0,duration:4,velocity:.6,part:'bass'}];
test('website MIDI embeds requested tempo once in merged and split exports; default contract unchanged',()=>{
 for(const split of [false,true])for(const bpm of [30,73,92,137,260]){
  const data=Buffer.from(midiBytes(notes,4,{split,bpm})),i=data.indexOf(Buffer.from([255,81,3]));
  assert.ok(i>0);assert.equal(data.readUIntBE(i+3,3),Math.round(60000000/bpm));assert.equal(data.indexOf(Buffer.from([255,81,3]),i+3),-1);
 }
 assert.equal(Buffer.from(midiBytes(notes,4)).indexOf(Buffer.from([255,81,3])),-1);
 assert.throws(()=>midiBytes(notes,4,{bpm:0}),/tempo/);
});
