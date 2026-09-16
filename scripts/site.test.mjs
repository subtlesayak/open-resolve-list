import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSite} from './build-site.mjs';
import {DEFAULTS as INITIAL_DEFAULTS,UNFILTERED as DEFAULTS,EVIDENCE_FIELDS,evidenceCoverage,searchScore,filterEntries,sortEntries,stateFromUrl,stateToUrl,comparisonFromUrl,comparisonToUrl,comparableResources,comparisonCompatible,relatedResources,matchesVersion,relativeDate,facetCounts,adaptTaskSelection,recoveryOptions,normalizeSearch} from '../site/model.mjs';
const data=buildSite(),find=name=>data.entries.find(e=>e.name===name);
test('public release API preserves original GitHub release links',()=>{
 const api=JSON.parse(fs.readFileSync(new URL('../site/api/v1/releases.json',import.meta.url),'utf8'));
 assert.deepEqual(api.releases,data.releases.map(release=>({version:release.version,date:release.date,source:release.url})));
 for(const release of api.releases)assert.match(release.source,/^https:\/\/github\.com\/subtlesayak\/subtle-resolve-list\/releases\/tag\//);
});
const fixture = (name,task,platform,edition,range) => ({...find('PostSync'),id:name,name,description:name,tasks:[task],platforms:[platform],requirements:{...find('PostSync').requirements,editions:edition?[edition]:[],resolve:range?[range]:[]}});
const adaptiveEntries=[fixture('New captions','captions','Windows','Free',{min:'20',max:'21'}),fixture('Old captions','captions','macOS','Studio',{min:'18',max:'19'}),fixture('Unknown captions','captions','Windows','Free'),fixture('Controller','hardware','Windows')];
test('facet counts exclude the edited constraint and keep unknown versions separate',()=>{
 const state={...DEFAULTS,task:'captions',platform:'Windows',resolve:'21'};
 assert.deepEqual(facetCounts(adaptiveEntries,state,'resolve',['','21','19']),{'':2,'21':1,'19':0});
 assert.equal(filterEntries(adaptiveEntries,state)[0].name,'New captions');
 assert.deepEqual(facetCounts(adaptiveEntries,{...state,task:'hardware'},'resolve',['','21']),{'':1,'21':0});
});
test('task changes clear conflicting requirements while preserving search and sort',()=>{
 const initial={...DEFAULTS,task:'hardware',platform:'Windows',edition:'Free',resolve:'21',q:'Controller',sort:'stars',official:'hide'};
 const result=adaptTaskSelection(adaptiveEntries,initial);
 assert.deepEqual(result.cleared,['resolve']);
 assert.equal(result.state.platform,'Windows');
 assert.equal(result.state.q,'Controller');
 assert.equal(result.state.sort,'stars');
 assert.equal(result.state.official,'hide');
 assert.equal(filterEntries(adaptiveEntries,result.state).length,1);
 assert.equal(initial.resolve,'21');
});
test('empty results offer concrete recovery choices without changing sorting or evidence',()=>{
 const state={...DEFAULTS,task:'captions',platform:'macOS',resolve:'21',sort:'updated'};
 const options=recoveryOptions(adaptiveEntries,state);
 assert.ok(options.some(o=>o.key==='resolve'&&o.count===1));
 assert.ok(options.some(o=>o.key==='platform'&&o.count===1));
 for(const o of options){const next={...state,...o.patch};assert.equal(next.sort,'updated');assert.equal(filterEntries(adaptiveEntries,next).length,o.count);}
 const fallback=recoveryOptions(adaptiveEntries,{...state,q:'does not exist',edition:'Free'});
 assert.equal(fallback[0].key,'taskOnly');
 assert.equal(fallback[0].count,2);
 assert.deepEqual(recoveryOptions(adaptiveEntries,{...state,mode:'tested'}),[]);
});
test('hiding official BMD listings preserves third-party resources and shared preferences',()=>{
  const state={...DEFAULTS,edition:'Studio',official:'hide',sort:'stars'};
  const found=filterEntries(data.entries,state);
  assert.equal(found.length,484);
  assert.ok(found.every(e=>!e.official));
  assert.ok(found.some(e=>e.name==='Resolve-OpenCaptions'));
  assert.deepEqual(stateFromUrl('?'+stateToUrl(state)).state,state);
  assert.equal(filterEntries(data.entries,{...DEFAULTS}).length,514);
  assert.equal(DEFAULTS.sort,'name');
});
test('website contains all 514 unique catalogue entries and no private outreach data',()=>{assert.equal(data.entries.length,514);assert.equal(new Set(data.entries.map(e=>e.id)).size,514);assert.equal(new Set(data.entries.map(e=>e.url)).size,514);const json=JSON.stringify(data);assert.doesNotMatch(json,/C:\\\\Users|D:\\\\Projects|gmail_draft_id|contact_email|gmail-receipts/);});
test('filters combine requirements without promoting unknowns to supported',()=>{const state={...DEFAULTS,platform:'Windows',edition:'Free',task:'captions'};const found=filterEntries(data.entries,state);assert.ok(found.some(e=>e.name==='Resolve-OpenCaptions'));assert.ok(!found.some(e=>e.name==='Tagger for Resolve'));assert.ok(found.some(e=>e.name==='auto-subs'));assert.ok(filterEntries(data.entries,{...DEFAULTS,processing:'local',pricing:'free',task:'captions'}).some(e=>e.name==='BadWords'));});
test('version ranges honor exact, minimum, maximum and edition scope',()=>{const e={requirements:{resolve:[{min:'18.6',max:'19.0.3',edition:'Free'},{min:'18.6',edition:'Studio'}]}};assert.equal(matchesVersion(e,'19.0.3','Free'),true);assert.equal(matchesVersion(e,'19.1','Free'),false);assert.equal(matchesVersion(e,'21','Studio'),true);assert.equal(matchesVersion(e,'18.5','Studio'),false);assert.equal(matchesVersion({requirements:{resolve:[]}},'21','Free'),false);});
test('all sort modes retain official-first ordering and unknown dates sort last within groups',()=>{for(const key of ['name','updated','activity','stars','creator','type']){const sorted=sortEntries(data.entries,key);const last=sorted.findLastIndex(e=>e.official);assert.ok(sorted.slice(0,last+1).every(e=>e.official));}const rows=[{id:'a',name:'A',official:false,releaseDate:null},{id:'b',name:'B',official:false,releaseDate:'2026-01-01'}];assert.equal(sortEntries(rows,'updated')[0].id,'b');assert.equal(find('PostSync').releaseDate,null);});
test('evidence is field-specific and no creator outreach is represented as confirmation or testing',()=>{assert.equal(data.entries.filter(e=>e.recommended).length,0);assert.equal(filterEntries(data.entries,{...DEFAULTS,mode:'tested'}).length,0);assert.equal(filterEntries(data.entries,{...DEFAULTS,evidence:'creator'}).length,0);for(const e of data.entries)for(const x of e.evidence){assert.match(x.source,/^https:\/\//);assert.ok(Number.isFinite(Date.parse(x.checked_at)));assert.ok(x.field);}assert.ok(find('ARISDA Bridge').evidence.every(e=>e.level==='documented'));});
test('evidence coverage reports seven explicit fields without treating unknowns as supported',()=>{const coverage=evidenceCoverage(find('ARISDA Bridge'));assert.equal(EVIDENCE_FIELDS.length,7);assert.equal(coverage.total,7);assert.equal(coverage.established,coverage.fields.filter(field=>field.known).length);assert.ok(coverage.fields.some(field=>field.key==='installation'&&!field.known));});
test('relevance scoring ranks names and exact tags above description-only matches',()=>{const base={official:false,creator:'Maker',description:'film color workflow',tags:['utility'],id:'a'};const name={...base,name:'Kodak Film',description:'',id:'name'};const tag={...base,name:'Look Tool',tags:['kodak film'],description:'',id:'tag'};const body={...base,name:'Generic Tool',id:'body'};assert.ok(searchScore(name,'kodak film')>searchScore(tag,'kodak film'));assert.ok(searchScore(tag,'kodak film')>searchScore(body,'kodak film'));assert.deepEqual(sortEntries([body,tag,name],'relevance','kodak film').map(e=>e.id),['name','tag','body']);});
test('shared filter URLs round trip independently from comparison state',()=>{const s={...DEFAULTS,q:'captions & speech',platform:'Windows',edition:'Free',sort:'updated'};assert.deepEqual(stateFromUrl('?'+stateToUrl(s)).state,s);assert.equal(stateToUrl({...INITIAL_DEFAULTS}), '');assert.deepEqual(stateFromUrl('?compare=anything').state,INITIAL_DEFAULTS);assert.deepEqual(comparisonFromUrl('?compare=alpha%2Cbeta%2Cgamma%2Cdelta'),['alpha','beta','gamma']);assert.equal(comparisonToUrl(['alpha','beta','gamma','delta']),'alpha,beta,gamma');});
test('comparison only accepts similar formats or shared category and task and offers related resources',()=>{const makeEntry=(id,kind,category,tasks,name=id)=>({id,kind,category,tasks,name});const dctl=makeEntry('a','dctl','Color tools',['color']);const dctl2=makeEntry('b','dctl','Other',['fusion']);const lut=makeEntry('c','lut','Color tools',['color']);const audio=makeEntry('d','vst','Audio tools',['audio']);assert.equal(comparableResources(dctl,dctl2),true);assert.equal(comparableResources(dctl,lut),true);assert.equal(comparableResources(dctl,audio),false);assert.equal(comparisonCompatible(lut,[dctl]),true);assert.equal(comparisonCompatible(audio,[dctl]),false);assert.deepEqual(relatedResources(dctl,[dctl,lut,audio]).map(entry=>entry.id),['c']);});
test('recorded version changes have release notes, exact old/new values and primary sources',()=>{const changelog=fs.readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8');for(const h of data.updates){assert.ok(changelog.includes(h.from+' → '+h.to));assert.ok(changelog.includes(h.source));assert.ok(data.releases.some(r=>r.version===h.release));}assert.equal(data.updates.length,28);});
test('website generation is deterministic and exposes export and related-resource comparison controls',()=>{const url=new URL('../site/catalogue.json',import.meta.url),before=fs.readFileSync(url,'utf8');buildSite();assert.equal(fs.readFileSync(url,'utf8'),before);const html=fs.readFileSync(new URL('../site/index.html',import.meta.url),'utf8');const script=fs.readFileSync(new URL('../site/app.mjs',import.meta.url),'utf8');assert.match(html,/compare-tray/);assert.match(html,/Compare selected/);assert.match(html,/compare-export/);assert.match(script,/relatedResources/);assert.match(script,/exportComparison/);assert.match(script,/text\/csv/);assert.match(html,/name="processing"/);assert.equal(relativeDate('2026-08-07',new Date('2026-09-07')),'1 month back');});
test('individual resource page uses the per-resource API without publishing private data',()=>{const html=fs.readFileSync(new URL('../site/resource.html',import.meta.url),'utf8');const script=fs.readFileSync(new URL('../site/resource.mjs',import.meta.url),'utf8');assert.match(html,/resource\.mjs/);assert.match(script,/api\/v1\/resources/);assert.match(script,/record\.id!==id/);assert.match(script,/rel='canonical'/);assert.match(script,/escapeHtml/);assert.doesNotMatch(script,/C:\\\\Users|D:\\\\Projects|gmail_draft_id|contact_email/);});
test('static resource directories expose canonical SEO pages without private data',()=>{const sample=data.entries[0],root=new URL('../site/resource/',import.meta.url),file=new URL(`${sample.id}/index.html`,root),html=fs.readFileSync(file,'utf8');assert.equal(fs.readdirSync(root).length,514);assert.match(html,new RegExp(`<h1>${sample.name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}</h1>`));assert.match(html,/application\/ld\+json/);assert.match(html,/rel="canonical"/);assert.match(html,/Source-backed catalogue maintained locally/);assert.doesNotMatch(html,/C:\\\\Users|D:\\\\Projects|gmail_draft_id|contact_email/);for(const entry of data.entries){const page=fs.readFileSync(new URL(`${entry.id}/index.html`,root),'utf8');assert.match(page,/<h1>[^<]+<\/h1>/,entry.id);assert.match(page,/rel="canonical"/,entry.id);assert.doesNotMatch(page,/C:\\\\Users|D:\\\\Projects|gmail_draft_id|contact_email/,entry.id);}});
test('machine-readable resource feed is deterministic and canonical-ID based',()=>{const feed=JSON.parse(fs.readFileSync(new URL('../site/resources.json',import.meta.url)));const indexHtml=fs.readFileSync(new URL('../site/index.html',import.meta.url),'utf8');const resourceHtml=fs.readFileSync(new URL('../site/resource.html',import.meta.url),'utf8');assert.equal(feed.schema_version,1);assert.equal(feed.resources.length,514);assert.equal(new Set(feed.resources.map(entry=>entry.id)).size,514);assert.ok(feed.resources.every(entry=>entry.kind&&entry.url.startsWith('https://')&&entry.description));assert.match(indexHtml,/rel="alternate" type="application\/json" href="resources\.json"/);assert.match(resourceHtml,/rel="alternate" type="application\/json" href="resources\.json"/);assert.doesNotMatch(JSON.stringify(feed),/C:\\\\Users|D:\\\\Projects|gmail_draft_id|contact_email/);});
test('static API, RSS and sitemap outputs are deterministic and source-backed',()=>{const api=JSON.parse(fs.readFileSync(new URL('../site/api/v1/resources.json',import.meta.url)));const detail=JSON.parse(fs.readFileSync(new URL('../site/api/v1/resources/36-cinematic-film-titles.json',import.meta.url)));const categories=JSON.parse(fs.readFileSync(new URL('../site/api/v1/categories.json',import.meta.url)));const tasks=JSON.parse(fs.readFileSync(new URL('../site/api/v1/tasks.json',import.meta.url)));const releases=JSON.parse(fs.readFileSync(new URL('../site/api/v1/releases.json',import.meta.url)));const rss=fs.readFileSync(new URL('../site/feed.xml',import.meta.url),'utf8');const sitemap=fs.readFileSync(new URL('../site/sitemap.xml',import.meta.url),'utf8');const robots=fs.readFileSync(new URL('../site/robots.txt',import.meta.url),'utf8');assert.equal(api.resources.length,514);assert.equal(detail.resource.id,'36-cinematic-film-titles');assert.ok(detail.resource.history);assert.ok(categories.categories.length>0);assert.equal(tasks.tasks.length,Object.keys(INITIAL_DEFAULTS).includes('q')?10:10);assert.ok(releases.releases.length>0);assert.match(rss,/^<\?xml version="1\.0" encoding="UTF-8"\?>/);assert.match(rss,/<rss version="2\.0">/);assert.equal((sitemap.match(/<loc>/g)||[]).length,api.resources.length+3);assert.ok(sitemap.includes("about.html"));assert.ok(sitemap.includes("updates.html"));assert.match(sitemap,/resource\/36-cinematic-film-titles\//);assert.match(robots,/Sitemap: https:\/\/subtlesayak\.github\.io\/subtle-resolve-list\/sitemap\.xml/);assert.doesNotMatch(JSON.stringify({api,detail,categories,tasks,releases,rss,sitemap,robots}),/C:\\\\Users|D:\\\\Projects|gmail_draft_id|contact_email/);});
test('local rebuild entry point is explicit and publication-free',()=>{const script=fs.readFileSync(new URL('./rebuild.mjs',import.meta.url),'utf8');assert.match(script,/migrate-resources\.mjs/);assert.match(script,/build-catalogue\.mjs/);assert.match(script,/build-site\.mjs/);assert.match(script,/No publishing or upload/);assert.doesNotMatch(script,/git push|gh release|workflow_dispatch/);});
test('local preview server is dependency-free, loopback-only and path-safe',()=>{const script=fs.readFileSync(new URL('./serve-site.mjs',import.meta.url),'utf8');assert.match(script,/127\.0\.0\.1/);assert.match(script,/path\.resolve/);assert.match(script,/startsWith\(root\+path\.sep\)/);assert.match(script,/RESOLVE_SITE_PORT/);assert.doesNotMatch(script,/fetch\(|git push|workflow_dispatch/);});
test('local HTTP smoke command stays loopback-only and checks static routes',()=>{const script=fs.readFileSync(new URL('./site-smoke.mjs',import.meta.url),'utf8');assert.match(script,/127\.0\.0\.1/);assert.match(script,/catalogue\.json/);assert.match(script,/resource\/36-cinematic-film-titles/);assert.match(script,/%2e%2e\/package\.json/);assert.doesNotMatch(script,/https?:\/\/(?!127\.0\.0\.1)/);});
test('browser smoke command exercises real local rendering without external side effects',()=>{const script=fs.readFileSync(new URL('./browser-smoke.mjs',import.meta.url),'utf8');assert.match(script,/playwright/);assert.match(script,/127\.0\.0\.1/);assert.match(script,/networkidle/);assert.match(script,/Search tools/);assert.match(script,/36-cinematic-film-titles/);assert.doesNotMatch(script,/git push|workflow_dispatch|fetch\(['"]https?:/);});
test('maintenance, deployment and hosted browser workflows preserve local evidence boundaries',()=>{const maintenance=fs.readFileSync(new URL('../.github/workflows/maintenance.yml',import.meta.url),'utf8');const pages=fs.readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');const browser=fs.readFileSync(new URL('../.github/workflows/browser.yml',import.meta.url),'utf8');const summary=fs.readFileSync(new URL('./maintenance-summary.mjs',import.meta.url),'utf8');assert.match(maintenance,/schedule:/);assert.match(maintenance,/check-updates\.mjs --external/);assert.match(maintenance,/GITHUB_STEP_SUMMARY/);assert.doesNotMatch(maintenance,/upload-artifact|git push/);assert.match(pages,/push:/);assert.match(pages,/data\/\*\*/);assert.match(browser,/playwright install --with-deps chromium/);assert.match(browser,/site-a11y\.test\.mjs/);assert.match(summary,/Raw research stays on the runner/);});
test('taxonomy review helper is conservative and records unresolved decisions explicitly',()=>{const script=fs.readFileSync(new URL('./review-kinds.mjs',import.meta.url),'utf8');assert.match(script,/loadCanonicalResources/);assert.match(script,/manual taxonomy review required/);assert.match(script,/--json/);assert.match(script,/retain-other/);assert.match(script,/--write-report/);});
test('approved taxonomy review mappings are explicit and limited to previously unresolved records',()=>{const script=fs.readFileSync(new URL('./apply-kind-review.mjs',import.meta.url),'utf8');assert.match(script,/APPROVED_KIND_REVIEW/);assert.match(script,/only the maintained record description\/source URL/);assert.match(script,/process\.argv\.includes\('--apply'\)/);assert.doesNotMatch(script,/fetch\(|https?:\/\/[^'"`]+\//);});
test('dependency-free npm scripts expose local build and validation only',()=>{const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(pkg.private,true);assert.equal(pkg.dependencies,undefined);assert.equal(pkg.scripts.build,'node scripts/rebuild.mjs');assert.match(pkg.scripts.validate,/migrate-resources\.mjs --check/);assert.doesNotMatch(JSON.stringify(pkg),/publish|deploy|push|upload/);});
test('resource draft helper is interactive, explicit, conservative and non-mutating',()=>{const script=fs.readFileSync(new URL('./add-resource.mjs',import.meta.url),'utf8');assert.match(script,/readline\/promises/);assert.match(script,/allowedKinds/);assert.match(script,/https:/);assert.match(script,/review_markers/);assert.match(script,/console\.log\(JSON\.stringify/);assert.doesNotMatch(script,/writeFile|fetch\(|git push|workflow_dispatch/);});

test('two edition choices include unknowns, exclude Studio requirements from Free, and migrate old links',()=>{
 const entries=[fixture('Free','audio','macOS','Free'),fixture('Studio','audio','macOS','Studio'),fixture('Unknown','audio','macOS')];
 const state={...INITIAL_DEFAULTS,sort:'stars'};
 assert.deepEqual(filterEntries(entries,state).map(e=>e.name),['Free','Unknown']);
 assert.deepEqual(filterEntries(entries,{...state,edition:'Studio'}).map(e=>e.name),['Free','Studio','Unknown']);
 assert.deepEqual(facetCounts(entries,state,'edition',['Free','Studio']),{Free:2,Studio:3});
 assert.deepEqual(stateFromUrl('?'+stateToUrl(state)).state,state);
 for(const query of ['', '?edition=', '?edition=unknown', '?editionUnknown=include'])assert.equal(stateFromUrl(query).state.edition,'Free');
 assert.equal(filterEntries(entries,{...state,resolve:'21'}).length,0);
 const html=fs.readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/edition-help|edition-unknown-control|name="editionUnknown"/);
 const select=html.match(/<select name="edition"[\s\S]*?<\/select>/)[0];
 assert.equal((select.match(/<option/g)||[]).length,2);
 assert.ok(!filterEntries(data.entries,state).some(e=>e.name==='NamiColor'));
 assert.ok(filterEntries(data.entries,{...state,edition:'Studio'}).some(e=>e.name==='NamiColor'));
 assert.equal(filterEntries([find('Map Engine')],{...state,resolve:'21'}).length,0);
 assert.equal(filterEntries([find('Map Engine')],{...state,edition:'Studio',resolve:'21'}).length,1);
});

test('Studio includes Free-compatible tools without relaxing platform or explicit Studio version ranges',()=>{
 const entries=[fixture('Free tool','audio','macOS','Free',{edition:'Free',min:'19',max:'20'}),fixture('Studio tool','audio','macOS','Studio')];
 assert.equal(filterEntries(entries,{...DEFAULTS,edition:'Studio'}).length,2);
 assert.equal(filterEntries(entries,{...DEFAULTS,edition:'Free'}).length,1);
 assert.equal(filterEntries(entries,{...DEFAULTS,edition:'Studio',platform:'Windows'}).length,0);
 assert.equal(matchesVersion(entries[0],'20','Studio'),true);
 assert.equal(matchesVersion(entries[0],'21','Studio'),false);
 const explicit={requirements:{resolve:[{edition:'Free',min:'19'},{edition:'Studio',min:'20',max:'20'}]}};
 assert.equal(matchesVersion(explicit,'21','Studio'),false);
});

test('BMD changelogs provide complete change lists and separate version-specific official links',()=>{
 const resolve=data.updates.find(e=>e.name==='DaVinci Resolve / Studio'&&e.to==='21.1'),fusion=data.updates.find(e=>e.name==='Fusion Studio'&&e.to==='21.1');
 assert.equal(resolve.changes.length,8);assert.equal(fusion.changes.length,5);
 assert.equal(resolve.changelogs.length,2);assert.equal(fusion.changelogs.length,1);
 for(const update of [resolve,fusion])for(const note of update.changelogs){assert.match(note.url,/^https:\/\/www\.blackmagicdesign\.com\/support\/readme\/[a-f0-9]+$/);assert.ok(note.label.includes(update.to));}
 assert.ok(resolve.changes.some(x=>x.includes('scripting')&&x.includes('Studio')));
 assert.deepEqual(data.entries.find(e=>e.url===resolve.url).history[0].changelogs,resolve.changelogs);
});

test('every entry has curated hidden search tags and matching source records',()=>{
 const tags=JSON.parse(fs.readFileSync(new URL('../data/search-tags.json',import.meta.url),'utf8'));
 assert.equal(tags.entries.length,data.entries.length);
 assert.equal(new Set(tags.entries.map(e=>e.url)).size,data.entries.length);
 for(const e of data.entries){const row=tags.entries.find(t=>t.url===e.url);assert.ok(row);assert.deepEqual(e.tags,row.tags);assert.ok(e.tags.length>=2);assert.equal(new Set(e.tags).size,e.tags.length);}
});
test('search finds editorial concepts and spelling variants without broad category false positives',()=>{
 const results=q=>filterEntries(data.entries,{...DEFAULTS,edition:'Studio',q}).map(e=>e.name);
 for(const name of ['CinePrint35','Filmbox Pro','Dehancer Pro','C.R.A.F.T. PowerGrade'])assert.ok(results('Kodak').includes(name));
 assert.ok(!results('Kodak').includes('utility-dctls'));
 assert.ok(!results('film').includes('utility-dctls'));
 assert.ok(results('colour grading').includes('CinePrint35'));
 assert.deepEqual(results('colour grading'),results('color grading'));
 assert.deepEqual(results('Fujifilm'),results('Fuji'));
 assert.deepEqual(results('black & white'),results('monochrome'));
 assert.deepEqual(results('subtitles'),results('captions'));
 assert.ok(results('skin retouching').includes('SkinCorrector'));
 assert.ok(results('noise reduction').includes('Oidn Denoiser'));
 assert.ok(results('backup').includes('PostSync'));
 assert.equal(normalizeSearch('  COLOUR—Gráding '),'color grading');
 const namicolor=find('NamiColor');assert.equal(filterEntries([namicolor],{...INITIAL_DEFAULTS,q:'film scanning'}).length,0);
 assert.equal(filterEntries([namicolor],{...INITIAL_DEFAULTS,edition:'Studio',q:'film scanning'}).length,1);
});
