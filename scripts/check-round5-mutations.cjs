// Run from this checkout, with a working Chrome/Chromium. Always restores exact bytes.
const {readFileSync,writeFileSync,mkdtempSync,mkdirSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=path.resolve(__dirname,'..');
const output=process.env.KHIMAIRA_MUTATION_OUTPUT||mkdtempSync(path.join(tmpdir(),'khimaira-r5-mutations-'));
mkdirSync(output,{recursive:true});
const app='dist/app.js',presentation='dist/morph-presentation.js';
const mutations=[
 ['M02',app,s=>s.replace("inversion:$('morphInversion').checked,parallel:$('morphParallel').checked,iiV:$('morphIIV').checked",'inversion:true,parallel:true,iiV:true')],
 ['M03',app,s=>s.replace("preserveBass:$('preserveBass').checked",'preserveBass:false')],
 ['M07',app,s=>s.replace("$('midiSustain').onclick=()=>exportMidi(true)","$('midiSustain').onclick=()=>exportMidi(false)")],
 ['M08',presentation,s=>s.replace('(mapping.target.bar+1)','(1)')],
 ['M11',app,s=>s+"\n{const broken=document.createElement('style');broken.textContent='@media(max-width:600px){.morph-history{display:none!important}}';document.head.append(broken);}\n"]
];
const run=id=>{
 const r=spawnSync(process.execPath,['scripts/run-browser-ci.cjs'],{cwd:root,encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024});
 const log=(r.stdout||'')+(r.stderr||'')+(r.error?'\n'+r.error.message:'');
 writeFileSync(path.join(output,id+'.log'),log);
 return {exit:r.status,signal:r.signal,log};
};
const baseline=run('baseline'),results=[];
for(const [id,file,mutate] of mutations){
 const location=path.join(root,file),before=readFileSync(location),after=mutate(before.toString());
 if(after===before.toString())throw Error('Mutation anchor missing: '+id);
 let result;
 try{writeFileSync(location,after);result=run(id);}finally{writeFileSync(location,before);}
 const restored=readFileSync(location).equals(before);
 const detected=baseline.exit===0&&result.exit!==0&&new RegExp('AssertionError[^\\n]*'+id+'\\b').test(result.log);
 results.push({id,exit:result.exit,restored,beforeSha256:hash(before),mutantSha256:hash(after),afterSha256:hash(readFileSync(location)),status:detected?'detected':baseline.exit!==0?'baseline-blocked':'NOT-DETECTED',expectedAssertion:id});
}
const report={baseline:{exit:baseline.exit,signal:baseline.signal},results,output};
writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(baseline.exit!==0||results.some(r=>r.status!=='detected'||!r.restored))process.exitCode=1;
