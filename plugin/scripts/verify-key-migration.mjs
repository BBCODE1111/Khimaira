// Compare the immutable pre-redesign backup with the current native bundle.
// Usage: node plugin/scripts/verify-key-migration.mjs <backup-root> <report.json>
import {build} from 'esbuild';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const current=fileURLToPath(new URL('../../',import.meta.url)),baseline=path.resolve(process.argv[2]);
async function load(root){
 const native=path.join(root,'plugin/native'),site=path.join(root,'dist');
 const result=await build({entryPoints:[path.join(native,'entry.js')],write:false,bundle:true,format:'iife',platform:'neutral',target:'es2020',define:{PRODUCT:'"Khimaira"'},plugins:[{name:'source',setup(b){
  b.onResolve({filter:/^@product$/},()=>({path:path.join(native,'khimaira.js')}));
  b.onResolve({filter:/^@site\//},a=>({path:path.join(site,a.path.slice(6))}));
  b.onResolve({filter:/\?v=/},a=>({path:path.resolve(a.resolveDir,a.path.split('?')[0])}));
 }}]});
 const context=vm.createContext({});vm.runInContext(result.outputFiles[0].text,context);
 return (action,state={},value,key)=>{context.request=JSON.stringify({action,state,value,key});const response=JSON.parse(vm.runInContext('nativeCall(request)',context));assert.ok(response.ok,response.message);return response.result;};
}
const old=await load(baseline),next=await load(current),patterns=old('metadata').patterns.filter(p=>p.id.startsWith('piano')||p.id.startsWith('texture'));
const results=[];
for(const text of ['F | Dm | Bb | C','Cm | Bdim7 | Fm/Ab | G7b9','Gmaj7/B | Em7 | Am7 | D7'])for(const {id:pattern} of patterns)for(const pianoRevision of [1,2]){
 let ui=old('init').ui;ui=old('set',ui,text,'sourceText').ui;ui=old('load',ui).ui;
 ui=old('set',ui,pattern,'pattern').ui;ui.pianoRevision=pianoRevision;ui.arpSwing=16;ui.gate=73;ui.human=28;ui.swing=12;
 const before=old('restore',ui),after=next('restore',ui);
 assert.deepEqual(after.notes,before.notes,text+' '+pattern);assert.deepEqual(after.plan,before.plan,text+' plan '+pattern);
 for(const field of ['pattern','pianoRevision','gate','human','swing','arpSwing'])assert.deepEqual(after.ui[field],before.ui[field]);
 const recalled=next('restore',JSON.parse(JSON.stringify(after.ui)));assert.deepEqual(recalled.notes,before.notes);
 results.push({text,pattern,pianoRevision,notes:before.notes.length,sha256:crypto.createHash('sha256').update(JSON.stringify(before.notes)).digest('hex'),identical:true});
}
fs.writeFileSync(process.argv[3],JSON.stringify({baseline,cases:results.length,allIdentical:true,results},null,2)+'\n');
console.log(`${results.length} legacy native renders: exact notes, voicing plan, performance settings and repeated recall preserved.`);
