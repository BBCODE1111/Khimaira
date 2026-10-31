import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
// Standalone regression: build the legacy fixture from this checkout rather
// than silently depending on an old, untracked build-plugin directory.
const fixture=process.argv[2]?null:fs.mkdtempSync(path.join(os.tmpdir(),'khimaira-session-'));
const stage=process.argv[2]?path.resolve(process.argv[2]):path.join(fixture,'stage');
if(fixture){execFileSync('python3',[decodeURIComponent(new URL('../scripts/pack.py',import.meta.url).pathname),stage,path.join(fixture,'ui.zip')]);process.on('exit',()=>fs.rmSync(fixture,{recursive:true,force:true}));}
const load=name=>import(pathToFileURL(path.join(stage,name)));

const {performance}=await load('engine/performance.js');
import assert from 'node:assert/strict';
const {restoreSession,selectExample,loadExample,exampleBars,generateSession,loadBackbone,keepResult}=await load('session.js');
const {parseChart,serialize}=await load('engine/solutions.js');
const {styles}=await load('engine/style-engine.js');
const {examplePool}=await load('engine/example-pool.js');
const {parse}=await load('engine/music.js');
const defaults={source:parseChart('| C | Am | F | G |'),bars:parseChart('| C | Am | F | G |'),style:'Jazz',key:0,mode:'major',length:4,randomness:'medium',variation:0,exampleId:null};
let state=restoreSession(defaults);state.sourceText='| C | Am | F | G |';
const original=state.sourceText;const fixtures=[];
state=generateSession(state);const first=structuredClone(state);
state.bars=parseChart('| Db7 | Ebm | B | A5 |');
state=generateSession(state);
assert.deepEqual(state.bars,generateSession(first).bars,'second generation must ignore previous result edits');
assert.equal(state.sourceText,original);
for(const style of Object.keys(styles)){
 state={...state,style,exampleId:null};
 for(const level of ['low','medium','high']){
  state=generateSession({...state,randomness:level});assert.equal(state.sourceText,original);
  assert.ok(state.bars.flatMap(b=>b.chords).every(c=>parse(c.symbol)));fixtures.push({schema:1,length:state.bars.length*4,notes:performance(state.bars,styles[style].pattern,{voicing:styles[style].voicing,gate:.82,human:.2}),ui:structuredClone(state)});
 }
 const pool=examplePool(style);for(const p of pool){
  const chosen=selectExample(state,p.id);assert.equal(chosen.sourceText,original);assert.equal(chosen.exampleId,p.id);
  assert.deepEqual(chosen,{...state,exampleId:p.id},'browsing must change only selection');
  assert.deepEqual(generateSession(chosen).bars,generateSession(state).bars,'filled backbone must ignore example selection');
  const loaded=loadExample(chosen);assert.deepEqual(loaded.bars,exampleBars(state,p));assert.equal(loaded.sourceText,original);
  const empty={...chosen,sourceText:''};assert.deepEqual(generateSession(empty).bars,loaded.bars,'blank GENERATE must load actual selected example');
 }
 assert.deepEqual(selectExample(state).bars,state.bars,'INSPIRE only browses');
 assert.deepEqual(generateSession({...state,sourceText:'',exampleId:null}).bars,exampleBars(state,pool[0]));
}
let blank={...state,style:'Jazz',sourceText:'',exampleId:null};
blank=selectExample(blank);assert.equal(blank.sourceText,'');
const chosen=blank.exampleId;blank=generateSession(blank);assert.equal(blank.sourceText,'');assert.equal(blank.exampleId,chosen);
assert.throws(()=>loadBackbone(blank),/空白/);
const kept=keepResult(blank);assert.equal(kept.sourceText,serialize(blank.bars));assert.equal(serialize(loadBackbone(kept).bars),serialize(kept.source));
const legacy=restoreSession(defaults,{...defaults,bars:parseChart('| Db | Eb | Fm | B |')});assert.equal(legacy.sourceText,serialize(defaults.source));
const draft={...state,sourceText:'| C | unfinished'};assert.equal(restoreSession(defaults,JSON.parse(JSON.stringify(draft))).sourceText,draft.sourceText);assert.throws(()=>generateSession(draft));
assert.equal(restoreSession(defaults,{...defaults,sourceText:''}).sourceText,'');
assert.notDeepEqual(generateSession({...restoreSession(defaults),style:'Jazz'}).bars,generateSession({...restoreSession(defaults),style:'Rock'}).bars,'style must affect the same backbone');
console.log('PASS: fixed backbone, result isolation, all 48 styles / 382 examples with explicit LOAD, browsing isolation, filled GENERATE ignores examples, blank GENERATE loads examples, explicit KEEP, legacy recall, invalid draft preservation');


