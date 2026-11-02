const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.webp':'image/webp'};
const output=process.env.KHIMAIRA_BROWSER_OUTPUT||'/tmp/khimaira-i18n-browser';
const read=page=>page.evaluate(()=>localStorage.getItem('khimaira-v5'));
const language=(page,lang)=>page.locator(`[data-language="${lang}"]`).click();
async function englishRemainders(page){return page.evaluate(()=>{
 const out=[],skip='script,style,input,textarea,[data-language-switch],[translate="no"]';
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement.closest(skip)&&/[\u3400-\u9fff]/.test(n.data))out.push(n.data.trim());}
 for(const el of document.querySelectorAll('[title],[aria-label],[placeholder],optgroup[label]')){
  if(el.closest('[data-language-switch]'))continue;
  for(const a of ['title','aria-label','placeholder','label'])if(/[\u3400-\u9fff]/.test(el.getAttribute(a)||''))out.push(a+': '+el.getAttribute(a));
 }
 return [...new Set(out)];
});}
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{}),args:['--autoplay-policy=no-user-gesture-required','--disable-audio-output']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);await page.locator('.chord-event').first().waitFor();
  assert.equal(await page.getAttribute('html','lang'),'zh-Hant');assert.equal(await page.textContent('#play'),'播放');
  await page.locator('#advancedInput summary').click();await page.fill('#chartInput','C:2 Dm7:1 G7:1 | Am | F | G');await page.click('#applyChart');
  await page.fill('#tempo','137');await page.locator('#tempo').blur();await page.fill('#chartInput','C | draft unfinished');
  const before=await read(page),options=await page.locator('select').evaluateAll(es=>es.map(e=>[e.id,e.value,[...e.options].map(o=>o.value)]));
  await language(page,'en');assert.equal(await page.getAttribute('html','lang'),'en');assert.equal(await page.textContent('#play'),'PLAY');
  assert.equal(await read(page),before);assert.equal(await page.inputValue('#chartInput'),'C | draft unfinished');
  assert.deepEqual(await page.locator('select').evaluateAll(es=>es.map(e=>[e.id,e.value,[...e.options].map(o=>o.value)])),options);
  assert.deepEqual(await englishRemainders(page),[],'English must cover initial text and accessible labels');
  await page.reload();await page.locator('.chord-event').first().waitFor();assert.equal(await page.getAttribute('html','lang'),'en');assert.equal(await page.inputValue('#chartInput'),'C | draft unfinished');
  await page.locator('#advancedInput summary').click();await page.fill('#chartInput','C | Am | F | G');await page.click('#applyChart');
  const untranslated=new Set();
  for(const value of await page.locator('#style option').evaluateAll(es=>es.map(e=>e.value))){await page.selectOption('#style',value);await page.click('#generate');for(const s of await englishRemainders(page))untranslated.add(s);}
  await page.selectOption('#style','Jazz');await page.click('#restore');
  for(const value of await page.locator('#pattern option').evaluateAll(es=>es.map(e=>e.value))){await page.selectOption('#pattern',value);for(const s of await englishRemainders(page))untranslated.add(s);}
  for(const mode of await page.locator('#arpMode option').evaluateAll(es=>es.map(e=>e.value))){await page.selectOption('#pattern','arp');await page.selectOption('#arpMode',mode);for(const s of await englishRemainders(page))untranslated.add(s);}
  await page.selectOption('#pattern','pianoBallad');await page.locator('#pianoDetails summary').click();
  for(const phrase of ['space','two','four','original']){await page.selectOption('[data-piano="pianoPhrase"]',phrase);for(const s of await englishRemainders(page))untranslated.add(s);}
  await page.locator('#guitarTools summary').click();for(const s of await englishRemainders(page))untranslated.add(s);
  await page.locator('#melodyTools summary').click();await page.click('#melodyGenerate');for(const s of await englishRemainders(page))untranslated.add(s);
  await page.click('#keyButton');for(const s of await englishRemainders(page))untranslated.add(s);await page.keyboard.press('Escape');
  await page.click('#editChord');for(const s of await englishRemainders(page))untranslated.add(s);await page.keyboard.press('Escape');
  await page.locator('.original-draft summary').click();await page.click('#editBackbone');for(const s of await englishRemainders(page))untranslated.add(s);await page.keyboard.press('Escape');
  await fs.writeFile(path.join(output,'untranslated.json'),JSON.stringify([...untranslated],null,2));assert.deepEqual([...untranslated],[],'English must cover every style, pattern and dynamic tool');
  await page.selectOption('#pattern','sustain');await page.click('#play');await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true'&&Number(document.getElementById('position').dataset.beat)>0);
  const sounding=await read(page);await page.evaluate(()=>scrollTo(0,0));await language(page,'zh-Hant');assert.equal(await page.getAttribute('#play','aria-pressed'),'true');assert.equal(await read(page),sounding);assert.equal(await page.textContent('#play'),'播放');await page.click('#stop');
  // Switching must not change the MIDI data generated by the same session.
  const midis=[];for(const lang of ['zh-Hant','en']){await page.evaluate(()=>scrollTo(0,0));await language(page,lang);const pending=page.waitForEvent('download');await page.click('#dockMidi');const item=await pending;midis.push(await fs.readFile(await item.path()));}assert.deepEqual(midis[0],midis[1]);
  for(const [width,height] of [[1440,1000],[390,844],[375,667]]){await page.setViewportSize({width,height});for(const lang of ['zh-Hant','en']){await page.evaluate(()=>scrollTo(0,0));await language(page,lang);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang} overflow at ${width}`);await page.screenshot({path:path.join(output,`${lang}-${width}.png`)});}}
  await page.goto(url+'research.html');assert.equal(await page.getAttribute('html','lang'),'en');assert.deepEqual(await englishRemainders(page),[]);await language(page,'zh-Hant');assert.match(await page.textContent('main'),/關於這個樂器/);
  const restricted=await browser.newContext();await restricted.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});const p=await restricted.newPage();await p.goto(url+'research.html');await language(p,'en');assert.equal(await p.getAttribute('html','lang'),'en');await restricted.close();
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:true,statePreserved:true,livePlaybackPreserved:true,midiIdentical:true,allStylesAndPatternsTranslated:true,storageFallback:true,errors},null,2));
  console.log('PASS: bilingual UI, all styles/patterns/tools, state and draft preservation, live playback, identical MIDI, recall, mobile layout, About and restricted storage');
 }finally{await browser?.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
