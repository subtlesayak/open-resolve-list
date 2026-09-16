import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const port=18766;
const base=`http://127.0.0.1:${port}`;
const executable=process.env.RESOLVE_BROWSER||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'');
let server;
let browser;
let page;

const waitForServer=()=>new Promise((resolve,reject)=>{
 let output='';
 const timer=setTimeout(()=>reject(new Error(`Timed out waiting for local server: ${output}`)),10000);
 server.stdout.on('data',chunk=>{
  output+=chunk.toString();
  if(output.includes(`127.0.0.1:${port}`)){clearTimeout(timer);resolve();}
 });
 server.on('error',error=>{clearTimeout(timer);reject(error);});
});

try{
 server=spawn(process.execPath,['scripts/serve-site.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,RESOLVE_SITE_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await waitForServer();
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--no-sandbox']});
 page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error));

 await page.goto(base+'/',{waitUntil:'networkidle'});
 assert.match(await page.title(),/Open Resolve List/);
 assert.equal(await page.locator('main').count(),1);
 assert.equal(await page.getByRole('searchbox',{name:'Search tools'}).count(),1);
 await page.locator('#results article.resource').first().waitFor();
 assert.ok(await page.locator('#results article.resource').count()>0);
 assert.match(await page.locator('#results article.resource .resource-page-link').first().getAttribute('href'),/^resource\//);

 await page.getByRole('searchbox',{name:'Search tools'}).fill('DCTL');
 await page.waitForTimeout(100);
 assert.ok(await page.locator('#results article.resource').count()>0);
 const compareChecks=page.locator('#results input[type="checkbox"]');
 assert.ok(await compareChecks.count()>=2);
 await compareChecks.nth(0).check();
 await compareChecks.nth(1).check();
 assert.match(page.url(),/compare=/);
 await page.getByRole('button',{name:'Compare selected'}).click();
 await page.locator('#compare-dialog').waitFor({state:'visible'});
 assert.equal(await page.locator('.compare-table').count(),1);
 assert.match(await page.locator('#compare-body').textContent(),/Side-by-side comparison/);
 assert.equal(await page.getByRole('button',{name:'Export CSV'}).count(),1);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export CSV'}).click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'resolve-resource-comparison.csv');
 assert.equal(await download.failure(),null);
 const stream=await download.createReadStream();
 let csv='';for await(const chunk of stream)csv+=chunk.toString();
 assert.match(csv,/^"Field",/);
 assert.match(csv,/"Resolve version"/);
 assert.match(await page.locator('#compare-body').textContent(),/Related resources/);
 await page.getByRole('button',{name:'Close comparison'}).click();

 await page.goto(base+'/resource/36-cinematic-film-titles/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('h1').textContent(),'36 Cinematic Film Titles');
 assert.equal(await page.locator('script[type="application/ld+json"]').count(),1);

 await page.goto(base+'/resource.html?id=36-cinematic-film-titles',{waitUntil:'networkidle'});
 assert.equal(await page.locator('#resource h1').textContent(),'36 Cinematic Film Titles');
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.locator('a.skip').focus();
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'#results');
 assert.equal(errors.length,0,errors.map(error=>error.message).join('\n'));
 console.log('Browser smoke passed: rendered catalogue, search, static page, dynamic API page, and keyboard skip link.');
}finally{
 if(browser)await browser.close();
 if(server&&!server.killed)server.kill();
}
