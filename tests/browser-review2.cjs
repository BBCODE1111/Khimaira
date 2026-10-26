const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5175');await page.locator('.chord-event').first().waitFor();
 assert.equal(await page.locator('#pattern').inputValue(),'jazz');assert.equal(await page.locator('#voicing').inputValue(),'rootless');
 const loop=page.locator('#loopButton'),on=await loop.evaluate(el=>getComputedStyle(el).backgroundColor);await loop.click();await page.waitForFunction(()=>getComputedStyle(document.getElementById('loopButton')).backgroundColor==='rgb(35, 57, 74)');const off=await loop.evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(on,off);await loop.click();
 assert.deepEqual(await page.locator('.degree').allTextContents(),['I','vi','IV','V']);
 await page.locator('#transposeUp').click();assert.equal(await page.locator('#key').inputValue(),'1');assert.equal(await page.locator('.chord-event strong').first().textContent(),'Db');
 await page.locator('#undo').click();assert.equal(await page.locator('#key').inputValue(),'0');assert.equal(await page.locator('.chord-event strong').first().textContent(),'C');
 await page.locator('#copyChords').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'| C | Am | F | G |');
 await page.locator('#style').selectOption('Funk');assert.equal(await page.locator('#pattern').inputValue(),'funk');
 await page.locator('#key').selectOption('4');await page.locator('#chartInput').fill('');await page.locator('#generate').click();
 assert.ok(!(await page.locator('.chord-event strong').allTextContents()).some(s=>/^Gb|^Db/.test(s)));
 await page.locator('#midiSplit').selectOption('split');const downloadPromise=page.waitForEvent('download');await page.locator('#dockMidi').click();const download=await downloadPromise;await download.saveAs('docs/review2-20261026/split-preview.mid');
 await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true',{},{timeout:20000});
 assert.equal(await page.locator('#play').textContent(),'PLAY');
 await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)>1);
 await page.locator('#play').click();
 await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true'&&Number(document.getElementById('position').dataset.beat)<.5);
 await page.keyboard.press('Space');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await page.keyboard.press('Space');await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true');
 await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)>1);
 await page.locator('#stop').click();assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true'&&Number(document.getElementById('position').dataset.beat)<.5);
 await page.locator('#stop').click();
 // An explicitly selected BAR remains the restart point.
 await page.locator('.bar-cue').nth(1).click();await page.locator('#play').click();
 await page.waitForFunction(()=>Number(document.getElementById('position').dataset.beat)>5);
 await page.locator('#play').click();await page.waitForFunction(()=>{const beat=Number(document.getElementById('position').dataset.beat);return document.getElementById('play').getAttribute('aria-pressed')==='true'&&beat>=4&&beat<4.5});

 // Settings resume the current bar while the chosen cue remains the next PLAY origin.
 for(const [id,value] of [['style','Rock'],['key','4'],['mode','minor'],['pattern','arp']]){
  await page.locator('#'+id).selectOption(value);
  await page.waitForFunction(()=>{const b=Number(document.getElementById('position').dataset.beat);return document.getElementById('play').getAttribute('aria-pressed')==='true'&&b>=4&&b<8});
 }
 await page.locator('.arp-details summary').click();await page.locator('#arpFoundation').selectOption('pad');
 await page.waitForFunction(()=>document.getElementById('play').getAttribute('aria-pressed')==='true');
 await page.locator('#stop').click();await page.locator('#play').click();
 await page.waitForFunction(()=>{const b=Number(document.getElementById('position').dataset.beat);return document.getElementById('play').getAttribute('aria-pressed')==='true'&&b>=4&&b<4.5});
 await page.locator('#stop').click();await page.locator('.bar-cue').first().click();
 await page.locator('#pattern').selectOption('ballad');await page.reload();assert.equal(await page.locator('#pattern').inputValue(),'ballad');

 await page.locator('#chartInput').fill('| F#maj7/C# |');await page.locator('#applyChart').click();await page.locator('.chord-event').first().click();await page.locator('#editorApply').click();assert.equal(await page.locator('.chord-event strong').first().textContent(),'F#maj7/C#');
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'docs/review2-20261026/desktop.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'docs/review2-20261026/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.ok((await page.locator('.bar-cue').first().boundingBox()).height>=44);
 assert.ok(await page.locator('#position').isVisible());
 await page.locator('#chartInput').fill('| Cmaj7(9,#11)/E:1 D7/F#:1 G7b9:2 |');await page.locator('#applyChart').click();
 assert.ok(await page.locator('.chord-event strong').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1)));
 assert.ok(await page.locator('.score .chart-tools').count());
 const copy=await page.locator('#copyChords').boundingBox(),transpose=await page.locator('#transposeUp').boundingBox();assert.ok(Math.abs(copy.y-transpose.y)<1);
 await page.screenshot({path:'docs/review2-20261026/mobile.png',fullPage:true});

 assert.deepEqual(errors,[]);console.log('Browser QA passed: defaults, retained preference, loop state, Roman degrees, transpose/undo, clipboard, key spelling, split MIDI, PLAY restart, STOP, Space toggle, cue restart, desktop/mobile overflow and touch targets.');

 const fs=require('node:fs'),path=require('node:path');
 const pluginContext=await browser.newContext(),plugin=await pluginContext.newPage();
 plugin.on('pageerror',e=>errors.push(e.message));
 await plugin.addInitScript(()=>{window.pluginMessages=[];window.__JUCE__={backend:{emitEvent:(channel,message)=>window.pluginMessages.push(message)}};});
 await plugin.route('**/plugin/**',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join('plugin/web',new URL(route.request().url()).pathname.split('/').at(-1)))}));
 await plugin.route('**/piano.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('plugin/web/plugin-piano.js')}));
 await plugin.route('http://127.0.0.1:5175/',async route=>{const response=await route.fetch();const html=(await response.text()).replace('</head>','<script src="plugin/kh-bridge.js"></script></head>');await route.fulfill({response,body:html});});
 await plugin.goto('http://127.0.0.1:5175/');
 await plugin.waitForFunction(()=>window.pluginMessages.some(m=>m.type==='state')&&window.pluginMessages.some(m=>m.type==='sequence'));
 const initial=await plugin.evaluate(()=>JSON.parse(window.pluginMessages.find(m=>m.type==='state').json));
 assert.equal(initial.style,'Jazz');assert.equal(initial.pattern,'jazz');assert.equal(initial.bars.length,4);
 await plugin.locator('#chartInput').fill('| C | | F | G |');await plugin.locator('#applyChart').click();
 await plugin.waitForFunction(()=>{const seq=window.pluginMessages.filter(m=>m.type==='sequence').at(-1);return seq?.beats===16&&!seq.notes.some((n,i)=>i%4===0&&n>=4&&n<8)});
 await plugin.locator('#performanceOptions summary').click();await plugin.locator('#bassMode').selectOption('four');await plugin.locator('#balladEntry').selectOption('delayed');
 await plugin.waitForFunction(()=>JSON.parse(window.pluginMessages.filter(m=>m.type==='state').at(-1).json).bassMode==='four');
 await plugin.locator('#play').click();await plugin.waitForFunction(()=>window.pluginMessages.some(m=>m.type==='note'));await plugin.locator('#stop').click();
 await plugin.locator('#midiSplit').selectOption('split');await plugin.locator('#dockMidi').click();await plugin.waitForFunction(()=>window.pluginMessages.some(m=>m.type==='midiFile'));
 const midi=Buffer.from(await plugin.evaluate(()=>window.pluginMessages.find(m=>m.type==='midiFile').data),'base64');assert.equal(midi.readUInt16BE(8),1);assert.equal(midi.readUInt16BE(10),2);
 assert.deepEqual(errors,[]);console.log('Plugin bridge QA passed: initial state, blank bars, new settings, preview notes, split MIDI download.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
