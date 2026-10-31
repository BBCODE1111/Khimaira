import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {MUSIC_CORE_VERSION} from '../packages/music-core/core.js';
import {PIANO_MOTION_VERSION} from '../packages/piano-motion/motion.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const {version,tag}=JSON.parse(readFileSync(resolve(root,'version.json'),'utf8'));
if(tag!==`web-v${version}`)throw Error('Web tag must match version.json');
const args=process.argv.slice(2);
if(args.some(a=>a!=='--check'))throw Error('Usage: node scripts/sync-web-assets.mjs [--check]');
const shared={'music-core.js':MUSIC_CORE_VERSION,'piano-motion.js':PIANO_MOTION_VERSION,'piano-motion-v1.js':PIANO_MOTION_VERSION,'piano-pedal.js':PIANO_MOTION_VERSION};
const generated=new Set(Object.keys(shared));
let failures=0;
for(const name of readdirSync(root).filter(n=>/\.(js|css|html)$/.test(n)&&!generated.has(n))){
 const file=resolve(root,name),before=readFileSync(file,'utf8');
 const after=before.replace(/([\w.-]+\.(?:js|css))(?:\?v=[\w.-]+)?(?=['"])/g,(_,asset)=>`${asset}?v=${shared[asset]||version}`);
 if(before!==after){if(args.includes('--check')){console.error('Stale asset version: '+name);failures++;}else writeFileSync(file,after);}
}
if(failures)process.exitCode=1;else console.log('Verified web asset versions: '+version+'; shared package versions from canonical sources');
