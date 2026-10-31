// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/key-functional-analysis/cache-browser'));
fs.mkdirSync(output,{recursive:true});
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'};
async function serve(root){
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.js')?'public, max-age=3600':'no-store'});res.end(data);});
  });
  await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});
  return {server,url:`http://127.0.0.1:${server.address().port}/`,setRoot:next=>root=next};
}
async function download(page,selector,name){
  const pending=page.waitForEvent('download');await page.locator(selector).click();
  const item=await pending;assert.equal(await item.failure(),null);
  const destination=path.join(output,name);await item.saveAs(destination);
  const bytes=fs.readFileSync(destination);assert.equal(bytes.subarray(0,4).toString(),'MThd');assert.ok(bytes.length>40);
  return bytes.length;
}
(async()=>{
 const old=path.resolve(process.env.KEY_BASELINE_DIST||path.join(__dirname,'../../backups/key-functional-analysis-2026-10-28-141028/Khimaira/dist'));
 const site=await serve(old);let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const load=async text=>{if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill(text);await page.locator('#applyChart').click();return page.locator('#keyLabel').textContent();};
  await page.goto(site.url);await page.locator('.chord-event').first().waitFor();assert.equal(await load('Dm | G | C | A7'),'D minor');
  const originalChords=await page.locator('.chord-event strong').allTextContents();site.setRoot(khimaira);await page.reload();await page.locator('.chord-event').first().waitFor();
  assert.equal(await page.locator('#keyLabel').textContent(),'D minor');assert.deepEqual(await page.locator('.chord-event strong').allTextContents(),originalChords);
  for(const [text,key] of [['Dm | G | C | A7','C major'],['C | E7 | Am | D7 | G7 | C','C major'],['F#m7 | B7 | Emaj7 | C#7','E major']])assert.equal(await load(text),key);
  assert.deepEqual(errors,[]);const result={oldErrorReproduced:true,upgradedSameOriginWithOneHourJSCaching:true,savedKeyAndPitchesPreservedUntilExplicitLoad:true,newKeysCorrect:true,errors};fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await browser?.close();site.server.closeAllConnections();await new Promise(resolve=>{site.server.close(resolve);});}
})().catch(e=>{console.error(e);process.exitCode=1;});
