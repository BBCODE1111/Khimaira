const {spawnSync}=require('node:child_process');
const path=require('node:path');
// Browser binaries are installed by CI (or once with npx playwright install chromium).
for(const script of ['tests/browser-review-session.cjs','tests/browser-web-ci.cjs']){
 const run=spawnSync(process.execPath,[path.resolve(__dirname,'..',script)],{stdio:'inherit',timeout:180000});
 if(run.error)throw run.error;
 if(run.status!==0)process.exit(run.status||1);
}
