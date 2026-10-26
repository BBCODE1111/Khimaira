const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.nativeCalls=[];window.transportListeners={};window.__JUCE__={backend:{addEventListener:(name,fn)=>window.transportListeners[name]=fn,emitEvent:(channel,event)=>{window.nativeCalls.push(event);let result=event.name==='snapshot'?null:event.name==='status'||event.name==='transport'?{host:true,standalone:false,bpm:120,playing:false}:{ok:true};window.transportListeners.__juce__complete?.({promiseId:event.resultId,result});}}};});
 const sizes=[['default',900,608],['minimum',760,518]];
 for(const [name,width,height]of sizes){await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5176');await page.locator('.chord').first().waitFor();
 const layout=await page.evaluate(()=>{const ids=['chart','input','style','bars','key','mode','randomness','generate','example','inspire','loadExample','pattern','voicing','gate','human','advancedToggle'];return {scroll:[document.documentElement.scrollHeight,document.body.scrollHeight,document.querySelector('main').scrollHeight,document.querySelector('main').clientHeight],boxes:ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}})}});
 console.log(name,JSON.stringify(layout));assert.ok(layout.scroll[0]<=height && layout.scroll[1]<=height,'document overflow');assert.ok(layout.scroll[2]<=layout.scroll[3],'main overflow');
 for(const box of layout.boxes){assert.ok(box.x>=0&&box.y>=0&&box.right<=width&&box.bottom<=height,`${name} clipped ${box.id}`)}
 for(let i=0;i<layout.boxes.length;i++)for(let j=i+1;j<layout.boxes.length;j++){const a=layout.boxes[i],b=layout.boxes[j];assert.ok(!(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1),`overlap ${a.id}/${b.id}`)}
 await page.screenshot({path:`docs/plugin-1.2/${name}.png`});
 await page.locator('#advancedToggle').click();assert.ok(await page.locator('#advanced').isVisible());const advanced=await page.locator('#advanced').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));assert.ok(advanced.scroll<=advanced.client,'advanced overflow');await page.locator('#swing').fill('22');await page.locator('#swing').press('Tab');await page.locator('#arpFoundation').selectOption('pad');await page.locator('#advancedClose').click();
 await page.locator('#input').fill('| F#m7:2 B7:2 | Emaj7 | C#m7 | F#7 | Bm7 | E7 | Amaj7 | B7 |');await page.locator('#load').click();
 assert.equal(await page.locator('.bar').count(),4);await page.locator('#nextPage').click();assert.equal(await page.locator('.bar').first().getAttribute('data-bar'),'4');
 await page.evaluate(()=>window.transportListeners.transportState({host:true,playing:true,preview:false,bpm:137,beat:4}));assert.equal(await page.locator('#bpm').inputValue(),'137');assert.equal(await page.locator('.bar.active').getAttribute('data-bar'),'1');
 await page.locator('#play').click();const calls=await page.evaluate(()=>window.nativeCalls);assert.ok(calls.some(c=>c.name==='update'&&c.params[0].notes?.length));assert.ok(calls.some(c=>c.name==='transport'&&c.params[0].play===true));assert.ok(!calls.some(c=>c.params.some(p=>p?.type==='note')));
 }
 assert.deepEqual(errors,[]);console.log('PASS: fixed default/minimum layout, no document/main/advanced scrolling or overlap, advanced controls, 8-bar paging, native host clock, whole-pattern updates.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
