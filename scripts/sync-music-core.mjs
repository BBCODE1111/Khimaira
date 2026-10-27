import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MUSIC_CORE_VERSION} from '../packages/music-core/core.js';
import {PIANO_MOTION_VERSION} from '../packages/piano-motion/motion.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const check = args.includes('--check');
const seirenIndex = args.indexOf('--seiren');
if (args.some((arg,i) => arg !== '--check' && arg !== '--seiren' && !(seirenIndex>=0 && i===seirenIndex+1)) || (seirenIndex >= 0 && (!args[seirenIndex+1] || args[seirenIndex+1].startsWith('--')))) {
  throw Error('Usage: node scripts/sync-music-core.mjs [--check] [--seiren /path/to/Seiren]');
}
const core = readFileSync(resolve(root,'packages/music-core/core.js'),'utf8');
const generated = '// Generated from Khimaira/packages/music-core/core.js; edit the canonical source and sync.\n'+core;
const digest = value => createHash('sha256').update(value).digest('hex');
const manifest = JSON.stringify({version:MUSIC_CORE_VERSION, source:'Khimaira/packages/music-core/core.js', sha256:digest(generated)},null,2)+'\n';
const outputs = new Map([
  [resolve(root,'dist/music-core.js'),generated],
  [resolve(root,'packages/music-core/manifest.json'),manifest],
]);
const motion='// Generated from Khimaira/packages/piano-motion/motion.js; edit the canonical source and sync.\n'+readFileSync(resolve(root,'packages/piano-motion/motion.js'),'utf8');
const motionManifest=JSON.stringify({version:PIANO_MOTION_VERSION,source:'Khimaira/packages/piano-motion/motion.js',sha256:digest(motion)},null,2)+'\n';
outputs.set(resolve(root,'dist/piano-motion.js'),motion);
outputs.set(resolve(root,'packages/piano-motion/manifest.json'),motionManifest);
if (seirenIndex >= 0) {
  const seiren=resolve(args[seirenIndex+1]);
  // Require the intended product root; never silently create another app folder.
  if (!readFileSync(resolve(seiren,'music.js'),'utf8').includes("createTheory('seiren-v1')")) throw Error('Expected the Seiren music adapter');
  outputs.set(resolve(seiren,'music-core.js'),generated);
  outputs.set(resolve(seiren,'tests/music-core/manifest.json'),manifest);
  outputs.set(resolve(seiren,'piano-motion.js'),motion);
  outputs.set(resolve(seiren,'tests/music-core/motion-manifest.json'),motionManifest);
  for (const [source,target] of [
    ['compatibility-corpus.mjs','compatibility-corpus.mjs'],
    ['fixtures/seiren-before.json','seiren-before.json'],
  ]) outputs.set(resolve(seiren,'tests/music-core',target),readFileSync(resolve(root,'packages/music-core',source),'utf8'));
  outputs.set(resolve(seiren,'docs/SHARED-MUSIC-CORE.md'),readFileSync(resolve(root,'packages/music-core/README.md'),'utf8'));
  outputs.set(resolve(seiren,'docs/SHARED-PIANO-MOTION.md'),readFileSync(resolve(root,'packages/piano-motion/README.md'),'utf8'));
  for(const file of ['course-study-20261027.md','course-study-20261027/source-inventory.json']) {
    outputs.set(resolve(seiren,'docs',file),readFileSync(resolve(root,'docs',file),'utf8'));
  }
}
let failures=0;
for (const [path,content] of outputs) {
  if (check) {
    let actual;try {actual=readFileSync(path,'utf8');} catch {}
    if (actual !== content) {console.error('OUT OF SYNC: '+path);failures++;}
  } else {mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content);}
}
if(failures)process.exitCode=1;
else console.log(`${check?'Verified':'Synced'} music core ${MUSIC_CORE_VERSION} + piano motion ${PIANO_MOTION_VERSION}: ${outputs.size} files`);
