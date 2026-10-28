// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const seiren=path.resolve(process.argv[2]||path.join(__dirname,'../../Seiren'));
const output=path.resolve(process.argv[2]||path.join(__dirname,'../docs/key-redesign/legacy-browser'));
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
 const oldRoot=path.resolve(__dirname,'../../backups/key-redesign-2026-10-28/dist'),sites=await Promise.all([serve(oldRoot),serve(khimaira)]);let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});const report=[];
  for(const [pattern,pianoRevision] of [['pianoQuarter',1],['pianoQuarter',2],['texturePentatonic',2],['arp',2]]){
   const original={bars:['Fmaj7','Dm7','Bb','C7'].map(symbol=>({chords:[{symbol,beats:4}]})),source:['F','Dm','Bb','C'].map(symbol=>({chords:[{symbol,beats:4}]})),key:'0',mode:'major',style:'Jazz',pattern,tempo:'103',freedom:'free',density:'2',voicing:'close',rate:'.5',gate:'82',swing:'8',human:'45',randomness:'medium',arpMode:'walk',arpRate:'16',arpOctaves:'2',arpPhase:'continuous',arpAccent:'pulse',arpSeed:'7',midiSplit:'merged',midiPedal:'off',bassMode:'root',balladEntry:'together',arpFoundation:'chords',pianoSettings:{pianoRevision,pianoPhrase:'original',pianoFills:'phrase',melodyFollow:'gentle',melodyText:'',ideaFamily:'auto'}};
   const tracks=[];
   for(const [i,site] of sites.entries()){
    const page=await browser.newPage();await page.addInitScript(old=>localStorage.setItem('khimaira-v4',JSON.stringify(old)),original);await page.goto(site.url);await page.locator('.chord-event').first().waitFor();
    assert.deepEqual(await page.locator('.chord-event strong').allTextContents(),['Fmaj7','Dm7','Bb','C7']);
    assert.equal(await page.locator('#tempo').inputValue(),'103');assert.equal(await page.locator('#pattern').inputValue(),pattern);
    const name=`${i?'new':'old'}-${pattern}-${pianoRevision}.mid`;await download(page,'#dockMidi',name);const midi=fs.readFileSync(path.join(output,name));
    tracks.push(midi.subarray(i?29:22)); // New website adds exactly one seven-byte tempo meta-event at tick zero.
    if(i){assert.deepEqual([...midi.subarray(22,26)],[0,255,81,3]);const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('khimaira-v5')));assert.equal(state.harmony.key.root,5);assert.deepEqual(state.legacyRenderKey,{root:0,mode:'major'});assert.equal(state.pianoSettings.pianoRevision,pianoRevision);
     await page.reload();await page.locator('.chord-event').first().waitFor();await download(page,'#dockMidi','recall-'+name);assert.deepEqual(fs.readFileSync(path.join(output,'recall-'+name)),midi);
     // Typing a draft and then selecting a key must not discard unsubmitted work.
     if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('Bb | Gm | Eb | F');await page.locator('#transposeUp').click();assert.equal(await page.locator('#chartInput').inputValue(),'Bb | Gm | Eb | F');
    }
    await page.close();
   }
   assert.deepEqual(tracks[1],tracks[0]);report.push({pattern,pianoRevision,originalNotesAndTimingExact:true,recallExact:true});
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();for(const site of sites){site.server.closeAllConnections();await new Promise(resolve=>site.server.close(resolve));}}
})().catch(e=>{console.error(e);process.exitCode=1;});
