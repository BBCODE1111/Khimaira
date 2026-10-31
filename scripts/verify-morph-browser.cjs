// Current-contract regression, usable from any working directory.
// Optional cross-product smoke: --seiren PATH. Output defaults to system temp.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
function argumentsFor(args){
 const options={};
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(!['--seiren','--output'].includes(key)||!args[i+1]||args[i+1].startsWith('--')||options[key.slice(2)])throw Error('Usage: node scripts/verify-morph-browser.cjs [--seiren PATH] [--output PATH]');
  options[key.slice(2)]=path.resolve(args[++i]);
 }
 return options;
}
if(require.main===module){
 const options=argumentsFor(process.argv.slice(2));
 const output=options.output||fs.mkdtempSync(path.join(os.tmpdir(),'khimaira-morph-'));
 const repo=path.resolve(__dirname,'..');
 if(output===repo||output.startsWith(repo+path.sep))throw Error('Browser artifacts must be outside the checkout');
 if(options.seiren&&!fs.existsSync(path.join(options.seiren,'music.js')))throw Error('Expected a Seiren checkout');
 fs.mkdirSync(output,{recursive:true});
 const runs=[['tests/browser-review-session.cjs'],['tests/browser-web-ci.cjs']];
 if(options.seiren)runs.push(['scripts/verify-shared-music-browser.cjs',options.seiren,path.join(output,'shared')]);
 for(const [file,...args] of runs){
  const result=spawnSync(process.execPath,[path.join(repo,file),...args],{stdio:'inherit',env:{...process.env,KHIMAIRA_BROWSER_OUTPUT:output},timeout:180000});
  if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
 }
 console.log('PASS MORPH v2; artifacts: '+output);
}
module.exports={argumentsFor};
