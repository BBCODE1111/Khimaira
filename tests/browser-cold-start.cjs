const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {gzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'};
(async()=>{
 const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
   const data=await fs.readFile(file),text=/\.(html|js|css)$/.test(file);
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',...(text?{'Content-Encoding':'gzip'}:{})});
   res.end(text?gzipSync(data):data);
  }
  catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>{server.listen(0,'127.0.0.1',resolve);});
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
  for(const rate of [1,4]){
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   const page=await context.newPage(),cdp=await context.newCDPSession(page);
   await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');
   await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8,connectionType:'cellular4g'});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate});
   await page.addInitScript(()=>{
    const observer=new MutationObserver(()=>{
     if(document.querySelector('.chord-event')&&document.querySelector('#generate')?.onclick){
      window.__readyTime=performance.now();observer.disconnect();
     }
    });observer.observe(document,{childList:true,subtree:true});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__readyTime>0);
   const ms=await page.evaluate(()=>window.__readyTime);
   await page.locator('#dockMorph').click();
   assert.ok(await page.locator('.chord-event').count()>0,'MORPH remains usable');
   console.log(JSON.stringify({test:'R07-07 cold 4G',cpu:rate,latency:150,mbps:1.6,readyMs:ms}));
   assert.ok(ms<=3000,`R07-07 CPU ${rate}× cold start ${ms.toFixed(0)}ms exceeds 3000ms`);
   await context.close();
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>{server.close(resolve);});}
})().catch(error=>{console.error(error);process.exitCode=1;});
