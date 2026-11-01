// Isolated copies: never mutate the working dist or the Git/tag state.
const {cpSync,readFileSync,writeFileSync,mkdtempSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),output=mkdtempSync(path.join(tmpdir(),'khimaira-r8-mutations-'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const mutations=[
 ['M02','chord-input.js','result.splice(bar,1)','result.splice(0,1)'],
 ['M06','arpeggiator.js','step:1/6','step:1/5'],
 ['M17','chord-picker.js','activeBar++;',''],
 ['M19','index.html','id="status" role="status"','id="status"'],
 ['M20','genre-rhythm.js','bassFifths:true,','']
];
const results=[];
for(const [id,file,from,to] of mutations){
 const copy=path.join(output,id);
 for(const dir of ['dist','tests'])cpSync(path.join(root,dir),path.join(copy,dir),{recursive:true});
 cpSync(path.join(root,'package.json'),path.join(copy,'package.json'));
 const location=path.join(copy,'dist',file),before=readFileSync(location,'utf8');
 const run=phase=>{
  const result=spawnSync(process.execPath,['--test',`--test-name-pattern=R08 ${id} `,'tests/round8.test.js'],{cwd:copy,encoding:'utf8',timeout:30000});
  const log=(result.stdout||'')+(result.stderr||'')+(result.error?.message||'');
  writeFileSync(path.join(output,`${id}-${phase}.log`),log);return {exit:result.status,log};
 };
 const baseline=run('baseline'),mutant=before.replace(from,to);
 if(mutant===before)throw Error('Missing mutation anchor '+id);
 writeFileSync(location,mutant);const injected=run('injected');
 const detected=baseline.exit===0&&injected.exit!==0&&injected.log.includes('AssertionError')&&injected.log.includes(id);
 const unchanged=readFileSync(path.join(root,'dist',file),'utf8')===before;
 results.push({id,baselineExit:baseline.exit,injectedExit:injected.exit,detected,workingTreeUnchanged:unchanged,beforeSha256:hash(before),mutantSha256:hash(mutant)});
}
const report={output,results};writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(results.some(r=>!r.detected||!r.workingTreeUnchanged))process.exitCode=1;
