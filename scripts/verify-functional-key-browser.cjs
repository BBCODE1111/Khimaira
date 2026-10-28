// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/key-functional-analysis/browser'));
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
(async()=>{
 const site=process.env.VERIFY_LIVE==='1'?{url:'https://bbcode1111.github.io/Khimaira/',server:null}:await serve(khimaira);let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],report=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  const click=id=>page.locator('#'+id).click(),read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5'))),chords=()=>page.locator('.chord-event strong').allTextContents();
  const load=async text=>{if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill(text);await click('applyChart');};
  const shot=async name=>{await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,name+'.png')});};
  await page.goto(site.url);await page.locator('.chord-event').first().waitFor();
  for(const [text,key,labels] of [
   ['Dm | G | C | A7','C major',['ii','V','I','V7/ii']],
   ['Dm7 | G7 | Cmaj7 | A7','C major',['ii7','V7','Imaj7','V7/ii']],
   ['C | E7 | Am | D7 | G7 | C','C major',['I','V7/vi','vi','V7/V','V7','I']],
   ['Cmaj7 | Am7 | D7 | G7','C major',['Imaj7','vi7','V7/V','V7']],
   ['F#m7 | B7 | Emaj7 | C#7','E major',['ii7','V7','Imaj7','V7/ii']]]){
    await load(text);assert.equal(await page.locator('#keyLabel').textContent(),key);assert.deepEqual(await page.locator('.degree').allTextContents(),labels);
    if(text==='Dm | G | C | A7')await shot('c-major-secondary-loop');
    const before=(await read()).harmony;for(let i=0;i<3;i++){await click('generate');assert.deepEqual((await read()).harmony.key,before.key);assert.deepEqual((await read()).harmony.backbone,before.backbone);}
    await click('restore');assert.deepEqual(await page.locator('.degree').allTextContents(),labels);await page.reload();await page.locator('.chord-event').first().waitFor();assert.equal(await page.locator('#keyLabel').textContent(),key);
    report.push({text,key,labels,generateRestoreReload:true});
  }
  await load('Gmaj7/D | Am11/G | D7 | Gmaj7');assert.equal(await page.locator('#keyLabel').textContent(),'G major');
  assert.deepEqual(await page.locator('.degree').allTextContents(),['Imaj7/D','ii11/G','V7','Imaj7']);await shot('readable-inversion-bass');
  await load('Imaj7/D | ii11/G | V7 | Imaj7');assert.deepEqual(await chords(),['Gmaj7/D','Am11/G','D7','Gmaj7']);
  report.push({case:'Named inversion bass display and Roman input roundtrip',pass:true});
  await page.locator('#randomness').selectOption('high');
  for(const [text,key,wanted,bad,file] of [['F | Dm | Bb | C','F major','Eb7#11','D#7','f-major-eb-substitute'],['Dm | Gm | A7 | Dm','D minor','Ab7#11','G#7','d-minor-ab-substitute']]){
   await load(text);let found=false;
   for(let i=0;i<9;i++){await click('generate');const names=await chords();assert.equal(await page.locator('#keyLabel').textContent(),key);assert.ok(!names.some(n=>n.startsWith(bad)));if(names.includes(wanted)){found=true;await shot(file);break;}}
   assert.ok(found,'missing generated '+wanted);report.push({case:text,generatedSubstitute:wanted,extensionPreserved:true});
  }
  await load('F | G | Em | Am');assert.ok(await page.locator('#keyCandidate').isVisible());assert.match(await page.locator('#keyCandidate').textContent(),/C major/);
  const pitches=await chords();await click('keyCandidate');assert.deepEqual(await chords(),pitches);assert.equal(await page.locator('#keyLabel').textContent(),'C major');
  report.push({case:'Relative candidate reinterpretation keeps pitches',pass:true});
  for(const width of [900,760,390]){await page.setViewportSize({width,height:width>600?900:844});await shot('functional-key-'+width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();if(site.server){site.server.closeAllConnections();await new Promise(resolve=>site.server.close(resolve));}}
})().catch(e=>{console.error(e);process.exitCode=1;});
