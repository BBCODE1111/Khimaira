import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {midiSafeNotes} from '../native/midi-notes.js';
test('single MIDI channel retriggers a shared bass / upper key without truncating other held chord tones',()=>{
 const held={beat:0,note:60,duration:4,velocity:.7},bass={beat:0,note:52,duration:2,velocity:.6},answer={beat:1,note:52,duration:1.5,velocity:.5};
 const result=midiSafeNotes([held,bass,answer]);assert.deepEqual(result.find(n=>n.note===60),held);assert.equal(result.find(n=>n.note===52).duration,1);assert.equal(result.at(-1).duration,1.5);assert.equal(bass.duration,2);
});
test('coincident key attacks coalesce at MIDI tick resolution',()=>{
 const result=midiSafeNotes([{beat:0,note:60,duration:4,velocity:.7},{beat:.0001,note:60,duration:1,velocity:.8}]);assert.equal(result.length,1);assert.equal(result[0].duration,4);assert.equal(result[0].velocity,.8);
});
test('native editor cannot load an HTML UI and embeds the original product art',()=>{
 const cmake=fs.readFileSync(new URL('../CMakeLists.txt',import.meta.url),'utf8'),editor=fs.readFileSync(new URL('../Source/PluginEditor.cpp',import.meta.url),'utf8');
 assert.match(cmake,/JUCE_WEB_BROWSER=0/);assert.doesNotMatch(editor,/WebBrowserComponent|index\.html|evaluateJavascript/);
 for(const art of ['web/temple-blue.png','web/khimaira.png','Seiren/assets/seiren-background.png','Seiren/assets/seiren-logo.png'])assert.ok(cmake.includes(art));
});
