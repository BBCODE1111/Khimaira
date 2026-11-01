import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {MUSIC_CORE_VERSION} from '../packages/music-core/core.js';
import {PIANO_MOTION_VERSION} from '../packages/piano-motion/motion.js';

export function publicationChannel(metadata,tagExists){
 if(!/^\d+\.\d+\.\d+$/.test(metadata.version)||metadata.tag!==`web-v${metadata.version}`){
  throw Error('Web tag must match version.json');
 }
 return tagExists&&metadata.channel==='stable'?'stable':'release-candidate';
}
export function validatePublication(metadata,tagExists){
 const expected=publicationChannel(metadata,tagExists);
 if(metadata.channel!==expected)throw Error(`Release channel mismatch: ${metadata.channel}; expected ${expected}`);
}
export function syncWebAssets(args=process.argv.slice(2)){
 if(args.some(a=>!['--check','--release'].includes(a))||args.includes('--check')&&args.includes('--release')){
  throw Error('Usage: node scripts/sync-web-assets.mjs [--check | --release]');
 }
 const root=fileURLToPath(new URL('../dist/',import.meta.url));
 const metadataFile=resolve(root,'version.json'),metadata=JSON.parse(readFileSync(metadataFile,'utf8'));
 publicationChannel(metadata,false);
 // Read-only Git query; missing Git/history is an error, never an assumed release.
 const tags=execFileSync('git',['tag','--list',metadata.tag],{cwd:root,encoding:'utf8'}).trim();
 if(args.includes('--release')){
  metadata.channel='stable';writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');
 }else validatePublication(metadata,Boolean(tags));
 const expected=metadata.channel;
 let failures=0;
 const readme=readFileSync(resolve(root,'../README.md'),'utf8');
 if(/\d+\.\d+\.\d+\s*待發布/.test(readme)){
  console.error('README must link to version.json instead of hard-coding pending release status');failures++;
 }
 const shared={'music-core.js':MUSIC_CORE_VERSION,'piano-motion.js':PIANO_MOTION_VERSION,'piano-motion-v1.js':PIANO_MOTION_VERSION,'piano-pedal.js':PIANO_MOTION_VERSION};
 const generated=new Set(Object.keys(shared));
 for(const name of readdirSync(root).filter(n=>/\.(js|css|html)$/.test(n)&&!generated.has(n))){
  const file=resolve(root,name),before=readFileSync(file,'utf8');
  const preloadBlock=before.match(/<!-- modulepreload:start -->[\s\S]*?<!-- modulepreload:end -->/)?.[0]||'';
  const after=before.replace(preloadBlock,'<!-- preload-placeholder -->').replace(/([\w.-]+\.(?:js|css))(?:\?v=[\w.-]+)?(?=['"])/g,(_,asset)=>`${asset}?v=${shared[asset]||metadata.version}`).replace('<!-- preload-placeholder -->',preloadBlock);
  if(before!==after){if(args.includes('--check')){console.error('Stale asset version: '+name);failures++;}else writeFileSync(file,after);}
 }
 // Flatten the static module discovery waterfall without changing module identity.
 const entry=`app.js?v=${metadata.version}`,seen=new Set(),queue=[entry];
 while(queue.length){
  const name=queue.shift();if(seen.has(name))continue;seen.add(name);
  const source=readFileSync(resolve(root,name.split('?')[0]),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*)['"]\.\/([\w.-]+\.js(?:\?v=[\w.-]+)?)['"]/g))queue.push(match[1]);
 }
 const preloads=[...seen].map(name=>`<link rel="modulepreload" href="${name}">`).join('\n');
 const block=`<!-- modulepreload:start -->\n${preloads}\n<!-- modulepreload:end -->`;
 const indexFile=resolve(root,'index.html'),index=readFileSync(indexFile,'utf8');
 const updated=index.includes('<!-- modulepreload:start -->')?
  index.replace(/<!-- modulepreload:start -->[\s\S]*?<!-- modulepreload:end -->/,block):index.replace('</head>',block+'\n</head>');
 if(index!==updated){
  if(args.includes('--check')){console.error('Stale initial module preloads');failures++;}
  else writeFileSync(indexFile,updated);
 }
 if(failures)throw Error(`${failures} web asset/release checks failed`);
 console.log(`Verified web asset versions: ${metadata.version}; channel ${expected}; shared package versions from canonical sources`);
 if(args.includes('--release'))console.log('Release metadata prepared; host must commit and create the matching tag before --check / deployment.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))syncWebAssets();
