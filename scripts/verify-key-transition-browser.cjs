// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const seiren=path.resolve(process.argv[2]||path.join(__dirname,'../../Seiren'));
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/key-redesign/transition-browser'));
fs.mkdirSync(output,{recursive:true});
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'};
async function serve(root){
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:`http://127.0.0.1:${server.address().port}/`};
}
async function download(page,selector,name){
  const pending=page.waitForEvent('download');await page.locator(selector).click();
  const item=await pending;assert.equal(await item.failure(),null);
  const destination=path.join(output,name);await item.saveAs(destination);
  const bytes=fs.readFileSync(destination);assert.equal(bytes.subarray(0,4).toString(),'MThd');assert.ok(bytes.length>40);
  return bytes.length;
}
(async()=>{const site=await serve(khimaira);let browser;try{
 browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(site.url);await page.locator('.chord-event').first().waitFor();
 const click=id=>page.locator('#'+id).click(),read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')).harmony);let transitions=0;
 for(let round=0;round<2;round++)for(const mode of ['major','minor']){
  if((await read()).key.mode!==mode){await click('keyButton');await page.locator('#keyMode').selectOption(mode);await click('convertMode');await click('confirmApply');console.log('convert',round,mode,(await read()).key,await page.locator('#status').textContent());}
  for(let root=0;root<12;root++){
   await click('keyButton');await page.locator('#keyTonic').selectOption(String(root));await click('applyKey');
   if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill(mode==='major'?'I/3 | vi | IV | V7':'i/b3 | bVI | iv | V7');await click('applyChart');const original=(await read()).backbone;
   for(const level of ['low','medium','high']){await page.locator('#randomness').selectOption(level);await click('generate');const s=await read();assert.equal(s.key.root,root);assert.equal(s.key.mode,mode,JSON.stringify({round,root,mode,level,status:await page.locator('#status').textContent()}));assert.deepEqual(s.backbone,original);}
   await click('nextSong');const before=await read();await click('restore');assert.deepEqual((await read()).score,original.degrees);await click('undo');assert.deepEqual((await read()).score,before.score);
   await page.reload();await page.locator('.chord-event').first().waitFor();assert.equal((await read()).key.root,root);assert.equal((await read()).key.mode,mode);assert.deepEqual((await read()).backbone,original);transitions++;
  }
 }
 assert.deepEqual(errors,[]);const report={transitions,generateClicks:transitions*3,inspireRestoreUndoReload:transitions,errors};fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();site.server.closeAllConnections();await new Promise(resolve=>site.server.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
