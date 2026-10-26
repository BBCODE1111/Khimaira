const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
 const page=await browser.newPage({viewport:{width:1180,height:730}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.pluginMessages=[];window.hostListeners={};window.__JUCE__={backend:{emitEvent:(channel,message)=>window.pluginMessages.push(message),addEventListener:(name,fn)=>window.hostListeners[name]=fn}}});
 await page.route('**/plugin/**',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join('plugin/web',new URL(route.request().url()).pathname.split('/').at(-1)))}));
 await page.route('**/piano.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('plugin/web/plugin-piano.js')}));
 await page.route('http://127.0.0.1:5175/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('</head>','<script src="plugin/kh-bridge.js"></script></head>')})});
 await page.goto('http://127.0.0.1:5175/');
 await page.waitForFunction(()=>window.pluginMessages.some(m=>m.type==='sequence'));
 assert.equal(await page.title(),'KHIMAIRA 1.1');
 assert.ok((await page.locator('.brand').textContent()).includes('KHIMAIRA 1.1'));
 await page.locator('#chartInput').fill('| C:2 G7:2 | | F | G |');await page.locator('#applyChart').click();
 await page.waitForFunction(()=>JSON.parse(window.pluginMessages.filter(m=>m.type==='state').at(-1).json).bars[0].chords.length===2);
 const host=async data=>page.evaluate(data=>window.hostListeners.hostTransport({playing:true,ppq:0,bpm:96,beats:16,...data}),data);
 await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#play').getAttribute('aria-pressed')==='true');
 await host({ppq:2.25});
 assert.equal(await page.locator('.sounding strong').textContent(),'G7');
 assert.equal(await page.locator('#position').textContent(),'DAW · BAR 1 / 4 · BEAT 3 · 96 BPM');
 assert.ok(await page.locator('#play').isDisabled());assert.ok(await page.locator('#stop').isDisabled());
 await page.evaluate(()=>document.activeElement.blur());
 await page.keyboard.press('Space');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await host({ppq:5});assert.equal(await page.locator('.sounding').count(),0);
 await host({ppq:24.1});assert.equal(await page.locator('.sounding strong').textContent(),'F');
 await host({ppq:-1});assert.equal(await page.locator('.sounding').count(),0);assert.equal(await page.locator('#position').textContent(),'DAW · COUNT IN');
 await host({playing:false});assert.ok(await page.locator('#play').isEnabled());assert.equal(await page.locator('.playing').count(),0);
 await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#play').getAttribute('aria-pressed')==='true');await page.locator('#stop').click();
 assert.deepEqual(errors,[]);
 console.log('Plugin 1.1 browser QA passed: version, host position, split chords, rests, loops, preroll, preview handoff and resume.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
