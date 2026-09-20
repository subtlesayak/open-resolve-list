import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources,toSiteEntry} from './canonical-source.mjs';
import {browseEntry} from './browse-index.mjs';
import {DEFAULTS,FORMAT_LABELS,collectResolveVersions,filterEntries,searchScore,stateFromUrl,stateToUrl} from '../site/model.mjs';
import {createDetailLoader} from '../site/detail-loader.mjs';
import {resourceView,structuredResource} from '../site/resource-view.mjs';
import {maintenanceFindings,renderSummary} from './maintenance-summary.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const records=loadCanonicalResources(root),entries=records.map(toSiteEntry);
const compact=entries.map(e=>{const b=browseEntry(e);return {...b,evidence:b.evidenceLevels.map(level=>({level}))};});
test('canonical records validate without legacy files or an index',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'resolve-canonical-'));
 try{fs.mkdirSync(path.join(temp,'data/resources'),{recursive:true});const record=records[0];fs.writeFileSync(path.join(temp,'data/resources',record.id+'.json'),JSON.stringify(record));assert.deepEqual(loadCanonicalResources(temp),[record]);}
 finally{assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
});
test('compact index preserves filter results for every supported format and requirement facet',()=>{
 const cases=[...Object.keys(FORMAT_LABELS).map(kind=>({kind})),...['Windows','macOS','Linux','iPadOS'].map(platform=>({platform})),...collectResolveVersions(entries).map(resolve=>({resolve})),...['documented','creator','tested','unknown'].map(evidence=>({evidence})),{q:'Fusion macro'},{kind:'dctl',platform:'Windows',access:'free'}];
 for(const patch of cases){const state={...DEFAULTS,...patch};assert.deepEqual(filterEntries(compact,state).map(e=>e.id),filterEntries(entries,state).map(e=>e.id),JSON.stringify(patch));}
 assert.ok(Buffer.byteLength(JSON.stringify(compact))<Buffer.byteLength(JSON.stringify(entries))*0.6);
});
test('format state round-trips through share URLs and exact formats outrank description mentions',()=>{
 const state={...DEFAULTS,kind:'ofx',platform:'Windows'};assert.deepEqual(stateFromUrl('?'+stateToUrl(state)).state,state);
 const base={name:'Example',creator:'Maker',description:'OFX',tags:[],category:'Effects',tasks:[]};assert.ok(searchScore({...base,kind:'ofx'},'OFX')>searchScore({...base,kind:'other'},'OFX'));
 assert.ok(collectResolveVersions([{requirements:{resolve:[{min:'22.2',max:'23.1'}]}}]).includes('22.2'));
});
test('detail loader shares cached requests, validates identity and retries failed loads',async()=>{
 let calls=0;const load=createDetailLoader(async()=>{calls++;return {ok:true,json:async()=>({resource:{id:'example'}})};});
 await Promise.all([load('example'),load('example')]);assert.equal(calls,1);
 let attempts=0;const retry=createDetailLoader(async()=>({ok:++attempts>1,json:async()=>({resource:{id:'example'}})}));await assert.rejects(retry('example'));assert.equal((await retry('example')).id,'example');assert.equal(attempts,2);
 await assert.rejects(createDetailLoader(async()=>({ok:true,json:async()=>({resource:{id:'wrong'}})}))('example'),/mismatch/);
 await assert.rejects(load('../secret'),/Invalid/);
});
test('resource pages distinguish uncertainty and escape provider content',()=>{
 const entry={...entries[0],name:'<img src=x onerror=alert(1)>',description:'<script>bad()</script>'};const html=resourceView(entry,entries);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>bad/);
 for(const heading of ['Compatibility','Requirements','Pricing and access','Version history','Related tools','Sources and limitations'])assert.ok(html.includes(heading));
 for(const [kind,type]of [['ofx','SoftwareApplication'],['reference','TechArticle'],['training','LearningResource'],['collection','CollectionPage'],['powergrade','CreativeWork']])assert.equal(structuredResource({...entry,kind},'https://example.com/').mainEntity['@type'],type);
});
test('maintenance reports candidate changes and incomplete checks without modifying records',()=>{
 const record={id:'sample',name:'Sample',urls:{canonical:'https://github.com/a/b'},version:{kind:'stable-release',version:'v1'}};
 const before=JSON.stringify(record),captures={github:[{requested_url:record.urls.canonical,data:{url:record.urls.canonical,isArchived:true,latestRelease:{tagName:'v2',url:record.urls.canonical+'/releases/tag/v2'}}}]};
 assert.deepEqual(maintenanceFindings([record],captures).map(f=>f.type),['Repository archived','Release candidate']);assert.equal(JSON.stringify(record),before);assert.match(renderSummary([record],captures),/Incomplete check/);
 const external={...record,urls:{canonical:'https://example.com/tool'}};assert.equal(maintenanceFindings([external],{external:[{url:external.urls.canonical,http_status:404}]} )[0].type,'Broken source');
});
test('RSS follows release dates and uses stable release GUIDs instead of catalogue ordering',()=>{
 const rss=fs.readFileSync(path.join(root,'site/feed.xml'),'utf8'),releases=JSON.parse(fs.readFileSync(path.join(root,'data/catalogue-releases.json'))).releases;
 const latest=[...releases].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0];assert.ok(rss.includes('<pubDate>'));assert.ok(rss.indexOf(latest.url)<rss.indexOf('</item>'));assert.equal((rss.match(/<item>/g)||[]).length,Math.min(50,releases.length));
});
