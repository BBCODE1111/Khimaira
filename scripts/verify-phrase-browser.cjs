// Run from any directory. NODE_PATH may point to an installed Playwright package.
// Defaults to isolated local sites. VERIFY_LIVE=1 checks the deployed sites in a fresh browser context; downloads and edits stay local.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const khimaira=path.resolve(__dirname,'../dist');
const seiren=path.resolve(process.argv[2]||path.join(__dirname,'../../Seiren'));
const output=path.resolve(process.argv[3]||'/tmp/piano-phrase-browser');
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
  const sites=process.env.VERIFY_LIVE==='1'?[{url:'https://bbcode1111.github.io/Khimaira/'},{url:'https://bbcode1111.github.io/Seiren/'}]:await Promise.all([serve(khimaira),serve(seiren)]);
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
      const patterns=await page.locator('#pattern option').evaluateAll(es=>es.map(e=>e.value).filter(v=>/^(piano|pop)[A-Z]|^texture/.test(v)));
      assert.equal(patterns.length,18);
      assert.equal(await page.locator('#pattern optgroup[label^="POP"] option').count(),12);
      assert.equal(await page.locator('#pattern optgroup[label^="TEXTURE"] option').count(),6);
      const reference=await page.evaluate(async()=>{
        const {midiBytes}=await import('./music.js');
        return Array.from(midiBytes([0,4,7,12,14,15].map((beat,i)=>({beat,duration:.5,note:[72,76,79,72,74,72][i],velocity:.6})),16));
      });
      const upload={name:'original-course-reference.mid',mimeType:'audio/midi',buffer:Buffer.from(reference)};
      if(name==='khimaira'){
        await page.locator('#chartInput').fill('| C | Am | F | G |');await page.locator('#applyChart').click();
        await page.locator('#pianoDetails summary').click();
        await page.setInputFiles('[data-piano="file"]',upload);
        await page.waitForFunction(()=>document.querySelector('[data-piano="melodyText"]').value.includes('C5'));
        await page.locator('[data-piano="apply"]').click();
      }else{
        await page.setInputFiles('#ml-file',upload);
        await page.waitForFunction(()=>document.getElementById('ml-remove').hidden===false);
        await page.locator('[data-compare-style="Mandopop"]').click();
      }
      if(name==='khimaira'){
        const text=page.locator('[data-piano="melodyText"]'),committed=await text.inputValue();
        await text.fill('R:1 E5:1 R:14');await page.locator('[data-piano="pattern"]').selectOption('pianoHalf');
        await page.locator('[data-piano="pianoPhrase"]').selectOption('four');assert.equal(await text.inputValue(),'R:1 E5:1 R:14');
        await text.fill(committed);await page.locator('[data-piano="apply"]').click();await page.locator('[data-piano="pianoPhrase"]').selectOption('two');
      }
      const originalChart=await page.locator('#grid').innerText(),downloads=[];
      const phraseSelector=name==='khimaira'?'[data-piano="pianoPhrase"]':'#pianoPhrase';
      assert.equal(await page.locator(phraseSelector).inputValue(),name==='khimaira'?'two':'auto');
      for(const pattern of patterns)for(const pianoPhrase of ['space','two','four']){
        if(name==='khimaira')await page.locator('[data-piano="pattern"]').selectOption(pattern);
        else await page.locator('#pattern').selectOption(pattern);
        await page.locator(phraseSelector).selectOption(pianoPhrase);
        assert.equal(await page.locator('#pattern').inputValue(),pattern);
        assert.equal(await page.locator('#grid').innerText(),originalChart);
        const energy=await page.evaluate(()=>window.__musicTestEnergy);
        await page.locator('#play').click();
        await page.waitForFunction(before=>window.__musicTestEnergy>before+.01,energy,{timeout:30000});
        await page.locator('#stop').click();
        if(name==='seiren'){await page.locator('#dockMidi').click();await page.locator('#includeMelody').check();}
        const filename=name+'-'+pattern+'-'+pianoPhrase+'.mid';
        const bytes=await download(page,name==='khimaira'?'#dockMidi':'#midi',filename);
        const count=await page.evaluate(async({bytes,name})=>{
          const array=Uint8Array.from(bytes);
          if(name==='seiren'){const {parseMidi}=await import('./midi.js');return parseMidi(array).tracks.flatMap(t=>t.notes).length;}
          const {readMelodyMidi}=await import('./melody-reference.js');return readMelodyMidi(array.buffer).flatMap(t=>t.notes).length;
        },{bytes:Array.from(fs.readFileSync(path.join(output,filename))),name});
        assert.ok(count>8);downloads.push({pattern,pianoPhrase,bytes,notes:count});
        if(name==='seiren')await page.keyboard.press('Escape');
      }
      let restored;
      if(name==='seiren'){
        await page.locator('#popFill').selectOption('off');
        const pending=page.waitForEvent('download');await page.locator('#saveProject').click();const item=await pending,file=await item.path();
        const saved=JSON.parse(fs.readFileSync(file));assert.equal(saved.settings.pattern,'texturePentatonic');assert.equal(saved.settings.popFill,'off');assert.equal(saved.settings.pianoPhrase,'four');
        await page.locator('#pattern').selectOption('popWhole');await page.locator('#popFill').selectOption('more');await page.locator('#pianoPhrase').selectOption('space');
        await page.setInputFiles('#loadProject',file);await page.waitForFunction(()=>document.getElementById('pattern').value==='texturePentatonic');
        assert.equal(await page.locator('#popFill').inputValue(),'off');assert.equal(await page.locator('#pianoPhrase').inputValue(),'four');
        delete saved.settings.pianoPhrase;
        await page.setInputFiles('#loadProject',{name:'legacy-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
        await page.waitForFunction(()=>document.getElementById('pianoPhrase').value==='original');
        await page.locator('#pianoPhrase').selectOption('auto');restored=true;
      }else{
        await page.reload();await page.locator('.chord-event').first().waitFor();
        assert.equal(await page.locator('#pattern').inputValue(),'texturePentatonic');
        await page.locator('#pianoDetails summary').click();
        assert.ok((await page.locator('[data-piano="melodyText"]').inputValue()).includes('C5'));
        assert.equal(await page.locator(phraseSelector).inputValue(),'four');
        await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('khimaira-v4'));delete s.pianoSettings.pianoPhrase;localStorage.setItem('khimaira-v4',JSON.stringify(s));});
        await page.reload();await page.locator('.chord-event').first().waitFor();await page.locator('#pianoDetails summary').click();
        assert.equal(await page.locator(phraseSelector).inputValue(),'original');await page.locator(phraseSelector).selectOption('four');restored=true;
      }
      await page.locator('#pattern').selectOption('jazz');assert.equal(await page.locator(phraseSelector).isDisabled(),true);
      await page.locator('#pattern').selectOption('texturePentatonic');assert.equal(await page.locator(phraseSelector).isDisabled(),false);
      await page.screenshot({path:path.join(output,name+'-desktop.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,name+'-mobile.png'),fullPage:true});
      assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
      report.push({app:name,independentSite:true,patterns:patterns.length,variationsPerPattern:3,legacyMigration:true,downloads,midiImport:true,audioOutput:true,restored,desktopAndMobile:true,errors,missing});
      await page.close();
    }
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{await browser?.close();await Promise.all(sites.filter(s=>s.server).map(({server})=>new Promise(resolve=>server.close(resolve))));}
})().catch(error=>{console.error(error);process.exitCode=1;});
