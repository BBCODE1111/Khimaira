import {build} from 'esbuild';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),product=process.argv[2]||'Khimaira',out=path.resolve(process.argv[3]||'build-native/engine.js'),site=product==='Seiren'?path.resolve(root,'../../Seiren'):path.resolve(root,'../dist');
fs.mkdirSync(path.dirname(out),{recursive:true});
const result=await build({entryPoints:[path.join(root,'native/entry.js')],bundle:true,format:'iife',platform:'neutral',target:'es2020',outfile:out,metafile:true,banner:{js:`
// QuickJS in JUCE 8.0.15 predates these standard built-ins. No browser polyfills.
if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(i){i=Math.trunc(i)||0;return this[i<0?this.length+i:i];}});
if(!Array.prototype.findLast)Object.defineProperty(Array.prototype,'findLast',{value:function(test,that){for(let i=this.length-1;i>=0;i--)if(test.call(that,this[i],i,this))return this[i];}});
if(!Object.hasOwn)Object.hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
if(!String.prototype.replaceAll)Object.defineProperty(String.prototype,'replaceAll',{value:function(a,b){return typeof a==='string'?this.split(a).join(b):this.replace(a,b);}});
`},define:{PRODUCT:JSON.stringify(product)},plugins:[{name:'music-source',setup(b){b.onResolve({filter:/^@product$/},()=>({path:path.join(root,'native',product.toLowerCase()+'.js')}));b.onResolve({filter:/^@site\//},a=>({path:path.join(site,a.path.slice(6))}));b.onResolve({filter:/\?v=/},a=>({path:path.resolve(a.resolveDir,a.path.split('?')[0])}));}}]});
const sources=Object.keys(result.metafile.inputs).map(p=>({path:path.relative(path.resolve(root,'..'),path.resolve(p)),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
fs.writeFileSync(out+'.manifest.json',JSON.stringify({product,sources},null,2));console.log(`${product}: ${sources.length} source modules, headless engine only`);
