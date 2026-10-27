import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {performance} from '../dist/performance.js';
import {mutate} from '../dist/style-engine.js';
import {parseChart} from '../dist/solutions.js';
import {pianoPatterns} from '../dist/piano-patterns.js';
import {texturePatterns} from '../dist/piano-motion.js';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kh12-engine-'));
execFileSync('python3',['plugin/scripts/pack.py',path.join(tmp,'stage'),path.join(tmp,'ui.zip')]);
const local=await import(pathToFileURL(path.join(tmp,'stage/pattern.js')));
const engine=await import(pathToFileURL(path.join(tmp,'stage/engine/style-engine.js')));
test('1.2 embeds only the compact shell and unchanged engine dependency closure',()=>{
 const dir=path.join(tmp,'stage/engine'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
 for(const [name,sha]of Object.entries(manifest))assert.equal(crypto.createHash('sha256').update(fs.readFileSync('dist/'+name)).digest('hex'),sha);
 assert.ok(!fs.existsSync(path.join(dir,'app.js')));assert.ok(!fs.existsSync(path.join(dir,'piano.js')));
 const shell=fs.readFileSync(path.join(tmp,'stage/plugin.js'),'utf8');
 assert.ok(!/setTimeout|performance\.now|previewNoteOn|BeatPlayer/.test(shell));
 assert.ok(!fs.readFileSync(path.join(tmp,'stage/index.html'),'utf8').includes('sticky'));
});
for(const pattern of ['jazz','pop','rock','ballad','house','arp',...Object.keys(pianoPatterns),...Object.keys(texturePatterns)])test(`1.2 ${pattern}: exact note-array parity for seed, voicing and advanced options`,()=>{
 const bars=parseChart('| F#m7:2 B7:2 | Emaj9 | C#m9 | F#7b9 | Bm7 | E7alt | Amaj7#11 | B7 |');
 for(const seed of [42,197])for(const voicing of ['close','open','rootless'])for(const pianoPhrase of ['original','space','two','four']){
  const state={bars,pattern,voicing,seed,pianoPhrase,key:4,mode:'major',gate:82,human:35,swing:16,rate:.5,bassMode:'four',balladEntry:'delayed',arpMode:'upDown',arpRate:'16',arpOctaves:2,arpPhase:'flow',arpAccent:'offbeat',arpSeed:seed,arpFoundation:'pad',pianoFills:'light',melodyFollow:'gentle',melodyText:'F#5:2 R:2 G#5:4 R:6 B5:1 R:3 E5:4'};
  for(const bpm of [96,120,180])assert.deepEqual(local.compilePattern(state,bpm).notes,performance(bars,pattern,local.performanceOptions(state,bpm)));
 }
});
test('1.2 harmony generation matches the web engine in sharp/minor keys',()=>{
 for(const style of ['Jazz','Rock','Funk','American pop','Metal'])for(const mode of ['major','minor']){
  const bars=parseChart('| E | C#m | A | B |');const options={style,mode,key:4,seed:73,randomness:'medium',density:1,freedom:'color',method:'style'};
  assert.deepEqual(engine.mutate(bars,options),mutate(bars,options));
 }
});
