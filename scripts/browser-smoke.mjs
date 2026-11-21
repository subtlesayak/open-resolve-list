import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import axe from 'axe-core';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {chromium,firefox,webkit,devices} from 'playwright';

const port=18766;
const base=`http://127.0.0.1:${port}`;
const engine=process.env.RESOLVE_TEST_BROWSER||'chromium';
const mobile=process.env.RESOLVE_TEST_MOBILE==='1';
const executable=process.env.RESOLVE_BROWSER||(process.platform==='win32'&&engine==='chromium'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'');
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

// Route a production-shaped URL entirely inside Playwright. The tracker fixture
// implements Umami's documented callback API and captures the actual POST bodies.
async function checkAnalytics(browser) {
 const tab=await browser.newPage();
 const production='https://subtlesayak.github.io/open-resolve-list/';
 const tracker='https://analytics.example/script.js';
 const websiteId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const payloads=[];
 let blocked=false;
 let configured=true;
 let trackerRequests=0;
 try{
  await tab.route('**/*',async route=>{
   const url=route.request().url();
   if(url===tracker){
    trackerRequests++;
    if(blocked)return route.abort();
    return route.fulfill({contentType:'text/javascript',body:`
      window.umami={track: callback => fetch('https://analytics.example/api/send', {
        method:'POST',body:JSON.stringify(callback({screen:'390x844',language:'en',url:location.href,referrer:document.referrer,title:document.title})),keepalive:true
      })};`});
   }
   if(url==='https://analytics.example/api/send'){
    payloads.push(route.request().postDataJSON());
    return route.fulfill({headers:{'access-control-allow-origin':'*'},body:'{}'});
   }
   if(url.startsWith(production)){
    const pathname=new URL(url).pathname.slice('/open-resolve-list/'.length);
    if(pathname==='analytics-config.mjs'&&configured)return route.fulfill({
     contentType:'text/javascript',body:'export const umamiConfig='+JSON.stringify({scriptUrl:tracker,websiteId}),
    });
    const response=await route.fetch({url:new URL(pathname+new URL(url).search,base+'/').href});
    return route.fulfill({response});
   }
   return route.abort();
  });
  await tab.goto(production+'?q=secret-search#secret-fragment',{referer:'https://example.com/private?email=secret'});
  await tab.waitForFunction(()=>!!window.umami);
  const search=tab.getByRole('searchbox',{name:'Search tools'});
  await search.fill('film emulation');
  const source=tab.locator('a[data-analytics-event="tool_outbound_click"]').first();
  await source.waitFor();
  await tab.evaluate(()=>document.addEventListener('click',event=>{
   if(event.target.closest?.('a[data-analytics-event]'))event.preventDefault();
  }));
  await source.press('Enter');
  const checks=tab.locator('#results input[type="checkbox"]:not(:disabled)');
  await checks.nth(0).check();
  await checks.nth(1).check();
  await tab.getByRole('button',{name:'Compare selected'}).click();
  await tab.waitForLoadState('networkidle');
  assert.deepEqual(payloads.map(payload=>payload.name||'pageview'),['pageview','tool_outbound_click','compare_opened']);
  assert.ok(payloads.every(payload=>payload.url==='/open-resolve-list/'&&payload.referrer==='https://example.com'));
  assert.deepEqual(payloads[1].data,{id:await source.getAttribute('data-analytics-id'),placement:'browse'});
  blocked=true;
  await tab.reload({waitUntil:'networkidle'});
  await source.waitFor();
  assert.equal(payloads.length,3);
  assert.equal(trackerRequests,2);
  configured=false;
  await tab.reload({waitUntil:'networkidle'});
  await source.waitFor();
  assert.equal(trackerRequests,2);
  configured=true;blocked=false;
  await tab.goto(production+'creator/mononodes/',{waitUntil:'networkidle'});
  const creatorLink=tab.locator('a[data-analytics-event="creator_outbound_click"]').first();
  await creatorLink.waitFor();
  await tab.evaluate(()=>document.addEventListener('click',event=>{if(event.target.closest?.('a[data-analytics-event]'))event.preventDefault();}));
  await creatorLink.click();await creatorLink.press('Enter');await tab.waitForLoadState('networkidle');
  const creatorEvents=payloads.filter(payload=>payload.name==='creator_outbound_click');
  assert.equal(creatorEvents.length,2);
  assert.ok(creatorEvents.every(payload=>payload.data.id==='mononodes'&&payload.data.placement==='creator_profile'));
  assert.ok(creatorEvents.every(payload=>Object.keys(payload.data).sort().join(',')==='id,placement'));
 }finally{
  await tab.close();
 }
}

try{
 server=spawn(process.execPath,['scripts/serve-site.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,RESOLVE_SITE_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await waitForServer();
 browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true,...(executable?{executablePath:executable}:{}),args:engine==='chromium'?['--no-sandbox']:[],timeout:60000});
 page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:engine!=='firefox',hasTouch:true}:{});
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 const errors=[];
 const requests=[];
 page.on('request',request=>requests.push(request.url()));
 page.on('pageerror',error=>errors.push(error));

 const audit=async()=>{await page.addScriptTag({content:axe.source});const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);};
 console.log(engine+': opening catalogue');
 await page.goto(base+'/',{waitUntil:'networkidle'});
 assert.match(await page.title(),/Open Resolve List/);
 assert.equal(await page.locator('main').count(),1);
 assert.equal(await page.getByRole('searchbox',{name:'Search tools'}).count(),1);
 await page.locator('#results article.resource').first().waitFor();
 assert.ok(await page.locator('#results article.resource').count()>0);
 assert.match(await page.locator('#results article.resource .resource-page-link').first().getAttribute('href'),/^resource\//);
 assert.equal(await page.locator('#results article.resource').first().locator('h3 a').count(),1);
 assert.match(await page.locator('#count').textContent(),/community resources · \d+ official resources hidden/);
 assert.equal(requests.filter(url=>url.includes('catalogue-index.json')).length,1);
 assert.equal(requests.filter(url=>new URL(url).pathname.endsWith('/model.mjs')).length,1,'Browse and setup share one catalogue model module');
 const browseIndex=await readFile(new URL('../site/catalogue-index.json',import.meta.url));
 const creatorDirectory=await readFile(new URL('../site/creators.html',import.meta.url));
 assert.ok(browseIndex.length<=525329,'Browse index payload budget');
 assert.ok(creatorDirectory.length<=300000,'Creator HTML payload budget');
 assert.ok(gzipSync(browseIndex,{level:6}).length<=95000,'Browse index gzip budget');
 assert.ok(gzipSync(creatorDirectory,{level:6}).length<=28000,'Creator HTML gzip budget');
 assert.ok(!requests.some(url=>/\/catalogue\.json|\/api\/v1\/resources\//.test(url)));
 if(process.env.RESOLVE_PERFORMANCE_BASELINE==='1'){
  console.log(JSON.stringify(await page.evaluate(()=>{
   const navigation=performance.getEntriesByType('navigation')[0];
   const catalogue=performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).pathname.endsWith('/catalogue-index.json'));
   return {viewport:innerWidth,catalogueRequests:catalogue.length,
    catalogueTransferBytes:catalogue.reduce((sum,entry)=>sum+entry.transferSize,0),
    catalogueBodyBytes:catalogue.reduce((sum,entry)=>sum+entry.decodedBodySize,0),
    domContentLoadedMs:Math.round(navigation.domContentLoadedEventEnd),
    firstContentfulPaintMs:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
  })));
 }
 const originalViewport=page.viewportSize();
 let lastCardWidth;
 for(const [width,height] of [[320,568],[390,844],[400,844],[401,844],[430,932],[667,375],[768,1024],[1024,768],[1050,900],[1051,900],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});
  const layout=await page.locator('#results article.resource').first().evaluate(card=>{
   const bounds=card.getBoundingClientRect();
   const text=card.querySelector('.description').getBoundingClientRect();
   const search=document.querySelector('#search').getBoundingClientRect();
   const actions=card.querySelector('.row-actions').getBoundingClientRect();
   const metadata=card.querySelector('.metadata').getBoundingClientRect();
   const sort=document.querySelector('#sort').getBoundingClientRect();
   const creator=card.querySelector('.row-actions a.source-cta');
   const details=card.querySelector('.row-actions button');
   const doc=document.documentElement;
   return {
    pageFits:doc.scrollWidth<=doc.clientWidth,
    searchFits:search.top>=0&&search.bottom<=innerHeight,
    cardWidth:bounds.width,
    textWidth:text.width,
    actionsFit:actions.left>=bounds.left&&actions.right<=bounds.right+1,
    oneToolbar:actions.top>=metadata.bottom&&actions.height<=44,
    sortHeight:sort.height,
    cardHeight:bounds.height,
    creatorEmphasized:getComputedStyle(creator).backgroundColor===getComputedStyle(document.querySelector('#compare-open')).backgroundColor,
    creatorAligned:creator.getBoundingClientRect().height===details.getBoundingClientRect().height,
   };
  });
  assert.ok(layout.pageFits&&layout.searchFits&&layout.actionsFit, 'Page, search, and actions fit at '+width+'px');
  assert.ok(layout.sortHeight>=44,'Sort control keeps its height at '+width+'px');
  assert.ok(layout.creatorEmphasized&&layout.creatorAligned,'Creator site is a prominent, aligned link at '+width+'px');
  if(layout.cardWidth<740)assert.ok(layout.textWidth>=layout.cardWidth-1,'Card description uses the full width at '+width+'px');
  else assert.ok(layout.textWidth>=320&&layout.textWidth<layout.cardWidth&&layout.oneToolbar,'Desktop card keeps readable columns and one action row at '+width+'px');
  if(width===1051)assert.ok(layout.cardWidth>=lastCardWidth,'Results must grow across the 1050px breakpoint');
  if(width>=1440)assert.ok(layout.cardHeight<260,'Desktop cards avoid an action stack');
  lastCardWidth=layout.cardWidth;
 }
 await page.setViewportSize(originalViewport);
 await page.locator('#more').press('Enter');
 const cards=page.locator('#results article.resource');
 assert.equal(await cards.count(),60);
 assert.ok(await cards.nth(30).locator('.resource-page-link').evaluate(link=>link===document.activeElement));
 await page.waitForFunction(()=>{
  const bounds=document.activeElement.getBoundingClientRect();
  return bounds.top>=document.querySelector('header').getBoundingClientRect().bottom&&bounds.bottom<=innerHeight;
 });
 assert.match(await page.locator('#pagination-status').textContent(),/30 added/);
 const searchInput=page.getByRole('searchbox',{name:'Search tools'});
 await searchInput.fill('zzq-no-catalogue-match-zzq');
 assert.equal(await page.locator('#search-result-count').textContent(),'0 matches');
 await page.locator('#search-results-link').press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'result-controls');
 assert.match(await page.locator('#results').textContent(),/No matches for “zzq-no-catalogue-match-zzq”/);
 await searchInput.fill('');
 await page.locator('#results article.resource').first().waitFor();
 await page.locator('#results article.resource button').first().click();
 await page.locator('#dialog-body h3').filter({hasText:'Documentation completeness'}).waitFor();
 assert.equal(requests.filter(url=>url.includes('/api/v1/resources/')).length,1);
 await audit();
 await page.getByRole('button',{name:'Close details'}).click();
 await page.locator('#results article.resource button').first().click();
 await page.locator('#dialog-body h3').filter({hasText:'Documentation completeness'}).waitFor();
 assert.equal(requests.filter(url=>url.includes('/api/v1/resources/')).length,1);
 await page.getByRole('button',{name:'Close details'}).click();
 if(await page.locator('#filters select[name=kind]').isHidden())await page.locator('#filter-toggle').click();
 await page.locator('#filters select[name=kind]').selectOption('dctl');
 assert.match(page.url(),/kind=dctl/);
 assert.equal(await page.locator('#filter-result-count').textContent(),await page.locator('#search-result-count').textContent());
 await page.locator('#filter-results-link').press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'result-controls');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('#filters select[name=kind]').inputValue(),'dctl');
 await page.route('**/api/v1/resources/*.json',route=>route.abort());
 await page.locator('#results article.resource button').first().click();
 await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
 await page.unroute('**/api/v1/resources/*.json');
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.locator('#dialog-body h3').filter({hasText:'Documentation completeness'}).waitFor();
 await page.getByRole('button',{name:'Close details'}).click();
 assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')||''),/^Details for/);

 if(await page.locator('#filters select[name=kind]').isHidden())await page.locator('#filter-toggle').click();
 await page.locator('#filters select[name=kind]').selectOption('');
 await page.getByRole('searchbox',{name:'Search tools'}).fill('autoresolvedeb');
 const revisionCard=page.locator('#results article[data-resource-id="autoresolvedeb"]');
 await revisionCard.getByRole('button',{name:/^Details for/}).press('Enter');
 const versionHistory=page.getByRole('region',{name:'Version history',exact:true});
 const newestRevision=versionHistory.locator('ol > li').first();
 await newestRevision.getByRole('heading',{name:'Source update',exact:true}).waitFor();
 const revisionRecord=JSON.parse(await readFile(new URL('../site/api/v1/resources/autoresolvedeb.json',import.meta.url),'utf8')).resource;
 const revision=revisionRecord.history.find(item=>item.release==='v1.31');
 assert.deepEqual(await newestRevision.locator('ul li').allTextContents(),revision.changes);
 assert.doesNotMatch(await versionHistory.textContent(),/\b[a-f\d]{40}\b/i);
 await newestRevision.getByText('Provider notes and links',{exact:true}).press('Enter');
 const providerNote=newestRevision.getByRole('link').first();
 assert.ok(await providerNote.isVisible());
 assert.equal(await providerNote.getAttribute('href'),revision.changelogs?.[0]?.url||revision.source);
 await page.getByRole('button',{name:'Close details'}).press('Escape');
 assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')||''),/^Details for/);
 await page.getByRole('searchbox',{name:'Search tools'}).fill('multicam');
 await page.waitForTimeout(100);
 assert.ok(await page.locator('#results article.resource').count()>0);
 const compareChecks=page.locator('#results input[type="checkbox"]:not(:disabled)');
 assert.ok(await compareChecks.count()>=2);
 await compareChecks.nth(0).press('Space');
 assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')||''),/^Compare /);
 await page.getByRole('checkbox',{name:'Compare CrossFlow',exact:true}).check();
 assert.match(page.url(),/compare=/);
 assert.match(await page.locator('#compare-status').textContent(),/2 of 3 selected/);
 assert.ok(await page.locator('#compare-tray').evaluate(tray=>{
  const bounds=tray.getBoundingClientRect();
  return bounds.top>=document.querySelector('header').getBoundingClientRect().bottom&&bounds.bottom<=innerHeight;
 }));
 const selectedCard=page.locator('#results article[data-resource-id="crossflow"]');
 assert.equal(await selectedCard.locator('.compare-control').textContent(),'Compare');
 await page.setViewportSize({width:320,height:568});
 const compareSave=selectedCard.locator('.collection-save summary');
 await compareSave.evaluate(summary=>{
  const tray=document.querySelector('#compare-tray').getBoundingClientRect();
  window.scrollBy(0,summary.getBoundingClientRect().bottom-tray.top+8);
 });
 await compareSave.press('Enter');
 assert.ok(await selectedCard.locator('.collection-save-options').evaluate(menu=>{
  const bounds=menu.getBoundingClientRect();
  const bookmark=menu.querySelector('button');
  const target=bookmark.getBoundingClientRect();
  const hit=document.elementFromPoint(target.x+target.width/2,target.y+target.height/2);
  return bounds.top>=document.querySelector('header').getBoundingClientRect().bottom
   && bounds.bottom<=document.querySelector('#compare-tray').getBoundingClientRect().top
   && bookmark.contains(hit);
 }), 'Save options stay above the comparison tray at 320px');
 await compareSave.press('Escape');
 await page.setViewportSize(originalViewport);
 await selectedCard.getByRole('link',{name:'Go to comparison'}).press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'compare-open');
 const comparedIds=new URL(page.url()).searchParams.get('compare').split(',');
 await page.route('**/api/v1/resources/*.json',route=>route.abort());
 await page.getByRole('button',{name:'Compare selected'}).click();
 await page.locator('#compare-dialog').waitFor({state:'visible'});
 const installationTable=page.getByRole('table',{name:'Installation requirements',exact:true});
 const retryInstallation=page.getByRole('button',{name:'Retry installation details',exact:true});
 await retryInstallation.waitFor();
 assert.match(await installationTable.textContent(),/Details unavailable/);
 await page.getByLabel('Differences only',{exact:true}).check();
 assert.ok(await installationTable.locator('tbody tr').evaluateAll(rows=>rows.every(row=>!row.hidden)));
 await page.unroute('**/api/v1/resources/*.json');
 await retryInstallation.press('Enter');
 await page.getByText('Installation details loaded.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'compare-dialog-close');
 assert.deepEqual(new URL(page.url()).searchParams.get('compare').split(','),comparedIds);
 assert.ok(await installationTable.locator('tbody tr[data-same=true]').evaluateAll(rows=>rows.every(row=>row.hidden)));
 await page.getByLabel('Differences only',{exact:true}).uncheck();
 const comparedDetails=await Promise.all(comparedIds.map(async id=>JSON.parse(await readFile(new URL('../site/api/v1/resources/'+id+'.json',import.meta.url),'utf8')).resource));
 assert.ok(comparedDetails.some(entry=>entry.requirements.installation));
 const installationRow=installationTable.locator('tbody tr').filter({has:page.getByRole('rowheader',{name:'Installation',exact:true})});
 assert.deepEqual(await installationRow.locator('td').allTextContents(),comparedDetails.map(entry=>(entry.requirements.installation||'Not established')+' '+entry.name+' sources'));
 assert.match(await page.locator('#compare-body').textContent(),/Side-by-side comparison/);
 assert.equal(await page.getByRole('heading',{name:'Material differences',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Export CSV'}).count(),1);
 for(const [width,height] of [[320,568],[430,932],[768,1024],[1440,900]]){
  await page.setViewportSize({width,height});
  const comparisonLayout=await page.locator('#compare-dialog').evaluate(dialog=>{
   const top=dialog.querySelector('.dialog-top');
   const body=dialog.querySelector('#compare-body');
   const compareTables=[...body.querySelectorAll('.compare-table-scroll')];
   const before=top.getBoundingClientRect().left;
   const tables=compareTables.map(scroller=>{
    const hint=scroller.previousElementSibling;
    scroller.scrollLeft=scroller.scrollWidth;
    return {scrollable:scroller.scrollLeft>0,cue:hint.getClientRects().length>0,focusable:scroller.tabIndex===0};
   });
   return {contained:dialog.scrollWidth<=dialog.clientWidth&&body.scrollWidth<=body.clientWidth,
    headingFixed:top.getBoundingClientRect().left===before,tables};
  });
  assert.ok(comparisonLayout.contained&&comparisonLayout.headingFixed,'Comparison chrome stays in view at '+width+'px');
  assert.equal(comparisonLayout.tables.length,2);
  for(const table of comparisonLayout.tables){
   assert.ok(table.focusable);
   assert.equal(table.cue,table.scrollable,'Scroll cue matches the table at '+width+'px');
   if(width<=430)assert.ok(table.scrollable,'Comparison columns are reachable at '+width+'px');
  }
  if(width===320){
   const scroller=page.getByRole('region',{name:'Side-by-side comparison table',exact:true});
   await scroller.evaluate(region=>{region.scrollLeft=0;});
   await scroller.press('ArrowRight');
   await page.waitForFunction(()=>document.querySelector('.compare-table-scroll').scrollLeft>0);
  }
 }
 await page.setViewportSize(originalViewport);
 await audit();
 await page.getByLabel('Differences only',{exact:true}).check();
 assert.ok(await page.locator('.compare-table tbody tr[data-same=true]').evaluateAll(rows=>rows.every(row=>row.hidden)));
 await page.getByLabel('Differences only',{exact:true}).uncheck();
 console.log(engine+': checking CSV download');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export CSV'}).click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'resolve-resource-comparison.csv');
 assert.equal(await download.failure(),null);
 const stream=await download.createReadStream();
 let csv='';for await(const chunk of stream)csv+=chunk.toString();
 assert.match(csv,/^"Field",/);
 assert.match(csv,/"Resolve version"/);
 for(const field of ['Installation','Dependencies','Account','Platform caveats'])assert.ok(csv.includes('"'+field+'",'));
 assert.ok(!csv.includes('Details unavailable'));
 assert.match(await page.locator('#compare-body').textContent(),/Related resources/);
 await page.getByRole('button',{name:'Close comparison'}).click();

 console.log(engine+': checking resource pages');
 await page.goto(base+'/resource/36-cinematic-film-titles/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('h1').textContent(),'36 Cinematic Film Titles');
 assert.ok(await page.getByRole('link',{name:'Open original resource ↗',exact:true}).isVisible());
 assert.equal(await page.getByText('View examples at the original source ↗',{exact:true}).count(),0);
 assert.equal(await page.locator('script[type="application/ld+json"]').count(),1);
 assert.ok(await page.locator('h2').filter({hasText:'Sources and limitations'}).count());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await audit();
 await page.setViewportSize({width:320,height:568});
 const alternatives=page.getByRole('region',{name:'Similar alternatives',exact:true});
 assert.ok(await page.locator('.alternatives-scroll-hint').isVisible());
 assert.ok(await alternatives.evaluate(region=>region.scrollWidth>region.clientWidth));
 await alternatives.press('ArrowRight');
 await page.waitForFunction(()=>document.querySelector('.alternatives-table-wrap').scrollLeft>0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize(originalViewport);

 await page.goto(base+'/resource.html?id=36-cinematic-film-titles',{waitUntil:'networkidle'});
 assert.equal(await page.locator('#resource h1').textContent(),'36 Cinematic Film Titles');
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.locator('a.skip').focus();
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'#results');
 assert.equal(errors.length,0,errors.map(error=>error.message).join('\n'));
 await page.goto(base+'/open-resolve-list/workflows.html',{waitUntil:'networkidle'});
 await page.locator('#my-setup summary').click();
 await page.locator('#my-setup [name=edition]').selectOption('Studio');
 await page.locator('#my-setup [name=version]').fill('20');
 await page.locator('#my-setup [name=platform]').selectOption('Windows');
 await page.getByRole('button',{name:'Save setup',exact:true}).press('Enter');
 await page.getByRole('button',{name:'Automatic subtitles',exact:true}).click();
 await page.locator('#workflow-results article').first().waitFor();
 assert.match(await page.locator('#workflow-results').textContent(),/auto-subs/);
 assert.match(await page.locator('#workflow-results').textContent(),/Why it matched/);
 assert.ok(await page.locator('#workflow-results .setup-assessment a').count()>0);
 await page.locator('#workflow-query').fill('film look and automatic subtitles');
 await page.getByRole('button',{name:'Find tools',exact:true}).click();
 assert.match(await page.locator('#workflow-count').textContent(),/more than one workflow/);
 assert.equal(await page.locator('#workflow-results article').count(),0);
 await page.getByRole('button',{name:'Automatic subtitles',exact:true}).click();
 await audit();
 await page.goto(base+'/open-resolve-list/workflow/action-camera-log/',{waitUntil:'networkidle'});
 assert.match(await page.locator('h1').textContent(),/action-camera/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.goto(base+'/open-resolve-list/?q=auto-subs',{waitUntil:'networkidle'});
 await page.locator('#results article.resource').first().waitFor();
 assert.equal(await page.locator('#filters [name=edition]').inputValue(),'');
 await page.setViewportSize({width:412,height:915});
 const save=page.locator('#results article[data-resource-id="auto-subs"] .collection-save summary');
 const toolbarHeight=await save.evaluate(el=>el.closest('.row-actions').offsetHeight);
 await save.press('Enter');
 const bookmark=page.getByRole('button',{name:'Bookmark auto-subs',exact:true});await bookmark.press('Space');
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Bookmark auto-subs');
 assert.equal(await bookmark.getAttribute('aria-pressed'),'true');
 assert.ok(await bookmark.locator('.save-mark').isVisible());
 assert.match(await page.locator('#notice').textContent(),/Bookmarked · auto-subs/);
 await bookmark.press('Escape');
 assert.ok(await save.evaluate(summary=>summary===document.activeElement&&!summary.parentElement.open));
 assert.ok(await save.locator('.save-mark').isVisible());
 assert.equal(await save.evaluate(el=>el.closest('.row-actions').offsetHeight),toolbarHeight);
 await page.setViewportSize(originalViewport);
 await page.getByText('My collections',{exact:true}).click();
 const before=await page.evaluate(()=>localStorage.getItem('open-resolve-collections-v1'));
 await page.locator('#collection-import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schema_version":1,"items":[{"id":"unknown","statuses":["installed"]}]}')});
 await page.waitForFunction(()=>document.querySelector('#collection-message').textContent.includes('Import failed'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('open-resolve-collections-v1')),before);
 await page.goto(base+'/?q=auto-subs&edition=Free',{waitUntil:'networkidle'});
 assert.equal(await page.locator('#filters [name=edition]').inputValue(),'Free');
 await page.goto(base+'/?q=auto-subs',{waitUntil:'networkidle'});
 assert.equal(await page.locator('#filters [name=edition]').inputValue(),'');
 await page.goBack({waitUntil:'networkidle'});
 assert.equal(await page.locator('#filters [name=edition]').inputValue(),'Free');
 await page.goForward({waitUntil:'networkidle'});
 assert.equal(await page.locator('#filters [name=edition]').inputValue(),'');
 await page.setViewportSize({width:320,height:800});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.ok(await page.locator('#results article.resource > div').first().evaluate(el=>el.getBoundingClientRect().width)>220,'Card content must retain readable width at 320px');
 await page.goto(base+'/creator/casey-faris/',{waitUntil:'networkidle'});
 assert.match(await page.locator('main').textContent(),/Learning topics and lessons/);
 await audit();
 await page.goto(base+'/creators.html',{waitUntil:'networkidle'});
 const allTopics=page.getByRole('button',{name:'All topics',exact:true});
 assert.equal(await allTopics.getAttribute('aria-pressed'),'true');
 const creatorCount=page.locator('#creator-count[role=status]');
 const totalCreators=await creatorCount.textContent();
 const colorTopic=page.getByRole('button',{name:'Color',exact:true});
 await colorTopic.press('Enter');
 assert.equal(await allTopics.getAttribute('aria-pressed'),'false');
 assert.equal(await colorTopic.getAttribute('aria-pressed'),'true');
 assert.ok(await colorTopic.locator('.topic-check').isVisible());
 assert.notEqual(await creatorCount.textContent(),totalCreators);
 for(const scheme of ['light','dark']){
  await page.emulateMedia({colorScheme:scheme});
  await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,scheme);
  await audit();
 }
 await page.goto(base+'/directory.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 assert.equal(await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Workflows',exact:true}).count(),1);
 assert.ok(await page.locator('#theme').isVisible());
 if(engine==='chromium'&&!mobile)await checkAnalytics(browser);
 console.log(engine+(mobile?' mobile':' desktop')+' smoke passed: rendered catalogue, search, static page, dynamic API page, and keyboard skip link.');
}finally{
 if(browser)await browser.close();
 if(server&&!server.killed)server.kill();
}
