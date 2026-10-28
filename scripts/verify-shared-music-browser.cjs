// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Serves independent site roots on ephemeral local ports; never touches a live site.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const seiren=path.resolve(process.argv[2]||path.join(__dirname,'../../Seiren'));
const output=path.resolve(process.argv[3]||'/tmp/chord-core-browser');
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
  const sites=await Promise.all([serve(khimaira),serve(seiren)]);
  let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
    const report=[];
    for(const [i,name]of ['khimaira','seiren'].entries()){
      const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.url().startsWith(sites[i].url)&&r.status()>=400)missing.push(r.status()+' '+r.url());});
      await page.addInitScript(()=>{
        window.__musicTestEnergy=0;
        const connect=AudioNode.prototype.connect;
        AudioNode.prototype.connect=function(target,...args){
          if(target instanceof AudioDestinationNode){
            const context=target.context;
            if(!context.__musicTestTap){
              const tap=context.createScriptProcessor(2048,2,2);
              tap.onaudioprocess=e=>{for(const sample of e.inputBuffer.getChannelData(0))window.__musicTestEnergy+=sample*sample;};
              connect.call(tap,target);context.__musicTestTap=tap;
            }
            connect.call(this,context.__musicTestTap);
          }
          return connect.call(this,target,...args);
        };
      });
      await page.goto(sites[i].url);await page.locator('.chord-event').first().waitFor();
      assert.equal(await page.evaluate(async()=> (await import('./music-core.js')).MUSIC_CORE_VERSION),'1.0.0');
      let midiBytes;
      if(name==='khimaira'){
        if(await page.locator('#advancedInput').count()&&!await page.locator('#chartInput').isVisible())await page.locator('#advancedInput summary').click();await page.locator('#chartInput').fill('| F#maj7/C# | Bdim7 | E7alt | Am9 |');await page.locator('#applyChart').click();
        assert.equal(await page.locator('.chord-event strong').first().textContent(),'F#maj7/C#');
        await page.locator('.chord-event').first().click();await page.locator('#editorApply').click();
        assert.equal(await page.locator('.chord-event strong').first().textContent(),'F#maj7/C#');
        const before=await page.locator('#grid').innerText();await page.locator('#transposeUp').click();await page.locator('#undo').click();
        assert.equal(await page.locator('#grid').innerText(),before);
        await page.locator('#style').selectOption('Jazz');await page.locator('#generate').click();
        await page.locator('#midiSplit').selectOption('split');
        midiBytes=await download(page,'#dockMidi','khimaira-split.mid');
      }else{
        await page.locator('.demo-menu summary').click();await page.locator('#ml-demo').click();
        await page.locator('[data-compare-style="Mandopop"]').click();await page.locator('#generate').click();
        await page.locator('#pattern').selectOption('popSplit');
        assert.ok(await page.locator('.chord-event').count()>0);
        await page.locator('#dockMidi').click();await page.locator('#includeMelody').check();
        midiBytes=await download(page,'#midi','seiren-melody-harmony.mid');await page.keyboard.press('Escape');
      }
      await page.locator('#play').click();
      await page.waitForFunction(()=>window.__musicTestEnergy>.01,null,{timeout:30000});
      assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');
      await page.locator('#stop').click();assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
      await page.screenshot({path:path.join(output,name+'-desktop.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,name+'-mobile.png'),fullPage:true});
      assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
      report.push({app:name,independentSite:true,coreVersion:'1.0.0',midiBytes,audioOutput:true,desktopAndMobile:true,errors,missing});
      await page.close();
    }
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser?.close();await Promise.all(sites.map(({server})=>new Promise(resolve=>server.close(resolve))));}
})().catch(error=>{console.error(error);process.exitCode=1;});
