import {browseEntry} from './browse-index.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources,toSiteEntry} from './canonical-source.mjs';
import {findWorkflow,assessSetup,validateSetup,workflowIntent} from '../site/discovery-model.mjs';
import {evidenceCoverage,comparableResources,relatedResources} from '../site/model.mjs';
import {validateCollection,importCollection} from '../site/collections.mjs';
const entries=loadCanonicalResources(fileURLToPath(new URL('..',import.meta.url))).map(toSiteEntry),byId=id=>entries.find(e=>e.id===id);
test('Cube compatibility citations use only the existing FAQ scope',()=>{
 const cube=byId('3d-cube-dctl-and-cube-slice');
 for(const key of ['editions','resolve'])assert.deepEqual(evidenceCoverage(cube).fields.find(f=>f.key===key).evidence.map(e=>e.source),['https://mononodes.com/faq/']);
 const unrelated={...cube,id:'another-resource'};for(const key of ['editions','resolve'])assert.equal(evidenceCoverage(unrelated).fields.find(f=>f.key===key).evidence.length,0);
});
test('Workflow Finder handles constrained intent, brand terms, ambiguity and no results deterministically',()=>{
 const query='free automatic subtitles on Windows';const result=findWorkflow(entries,query);
 assert.ok(result.some(r=>r.entry.id==='auto-subs'));assert.ok(result.every(r=>r.entry.accessGroup==='free'&&r.reasons.length));
 assert.ok(!result.some(r=>['resolve-textplus-srt-importer','resolve-opencaptions','comfyui-secondunit','vocalslice','badwords','barkted'].includes(r.entry.id)));
 assert.ok(findWorkflow(entries,'Kodak-style film look').some(r=>r.entry.id==='kodak-2383-powergrade'));
 assert.deepEqual(findWorkflow(entries,'unfindable-quartz-waterfall'),[]);assert.deepEqual(findWorkflow(entries,''),[]);
 assert.deepEqual(result.map(r=>r.entry.id),findWorkflow(entries,query).map(r=>r.entry.id));
});
test('Workflow Finder separates caption tasks and applies explicitly requested Resolve setup',()=>{
 const imported=findWorkflow(entries,'import an SRT subtitle file');
 assert.ok(imported.some(row=>row.entry.id==='resolve-textplus-srt-importer'));
 assert.ok(imported.every(row=>row.reasons.includes('Subtitle import')));
 assert.equal(workflowIntent('automatic subtitle import from SRT').capability,'subtitle-import');
 assert.ok(findWorkflow(entries,'import subtitles from SRT into Resolve').some(row=>row.entry.id==='resolve-textplus-srt-importer'));
 const translated=findWorkflow(entries,'subtitle translation');
 assert.ok(translated.some(row=>row.entry.id==='sub-translator'));
 assert.ok(translated.every(row=>row.reasons.includes('Subtitle translation')));
 assert.equal(findWorkflow(entries,'AutoSubs')[0].entry.id,'auto-subs');
 assert.deepEqual(findWorkflow(entries,'?!'),[]);
 assert.equal(workflowIntent('text to speech').capability,'');
 assert.equal(workflowIntent('captions for Resolve Free').access,'');
 assert.equal(workflowIntent('free captions for Resolve 20.1 Studio').access,'free');
 const row=findWorkflow(entries,'free subtitles on Resolve Studio 20.1 for iPadOS',
  {edition:'Free',version:'19',platform:'macOS'}).find(match=>match.entry.id==='auto-subs');
 assert.deepEqual(row.verdict.checks.map(({key,selected})=>[key,selected]),
  [['platforms','iPadOS'],['editions','Studio'],['resolve','20.1']]);
});
test('setup distinguishes missing requirements from explicit conflicts and honors edition ranges',()=>{
 const base={...byId('auto-subs'),platforms:[],requirements:{editions:[],resolve:[],architectures:[]}};
 assert.equal(assessSetup(base,{platform:'Windows'}).label,'Requirements unknown');
 const known={...base,evidence:['platforms','editions','architectures','resolve'].map(field=>({field,level:'documented',source:'https://example.test/requirements',checked_at:'2026-11-14'})),platforms:['Windows'],requirements:{editions:['Studio'],architectures:['x64'],resolve:[{edition:'Studio',min:'20'}]}};
 assert.equal(assessSetup(known,{edition:'Free'}).label,'Documented incompatibility');
 assert.equal(assessSetup(known,{platform:'Windows',edition:'Studio',version:'20.1',architecture:'x64'}).label,'Documented match');
 assert.equal(assessSetup(known,{edition:'Studio',version:'19'}).label,'Documented incompatibility');
 assert.deepEqual(validateSetup({edition:'arbitrary',platform:'somewhere',version:'private text',architecture:'gpu'}),{edition:'',version:'',platform:'',architecture:''});
});
test('diagnostic DCTLs and film-emulation DCTLs cannot be compared solely by format',()=>{
 const cube=byId('3d-cube-dctl-and-cube-slice');const film={...byId('kodak-2383-powergrade'),kind:'dctl'};
 assert.equal(comparableResources(cube,film),false);
});
test('collection import validates fully before returning a merge and never alters input on failure',()=>{
 const ids=new Set(['auto-subs','kodak-2383-powergrade']);const current={schema_version:1,items:[{id:'auto-subs',statuses:['installed']}]};const snapshot=JSON.stringify(current);
 const good=JSON.stringify({schema_version:1,items:[{id:'auto-subs',statuses:['bookmark']},{id:'kodak-2383-powergrade',statuses:['shortlist']}]});
 const merged=importCollection(good,current,ids);assert.equal(merged.items.length,2);assert.deepEqual(merged.items[0].statuses,['bookmark','installed']);
 for(const raw of ['{}','{"schema_version":2,"items":[]}',JSON.stringify({schema_version:1,items:[{id:'unknown',statuses:['bookmark']}]}),'bad json'])assert.throws(()=>importCollection(raw,current,ids));
 assert.equal(JSON.stringify(current),snapshot);assert.deepEqual(validateCollection(merged,ids),merged);
});
test('private plans and reports are excluded from the public site artifact',()=>{
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(dir+'/'+d.name):[dir+'/'+d.name]);
 assert.ok(!walk(fileURLToPath(new URL('../site',import.meta.url))).some(p=>/\.research|audience-report|media-kit|sponsorship-plan|pasted.text/i.test(p)));
});

test('partial OS and build lists do not establish incompatibility; verdicts require citations',()=>{
 const partial={...byId('auto-subs'),platforms:['macOS'],requirements:{editions:['Free'],resolve:[{edition:'Free',min:'19',max:'20'}],architectures:['x64']},evidence:['platforms','editions','architectures','resolve'].map(field=>({field,level:'documented',source:'https://example.test/requirements'}))};
 assert.equal(assessSetup(partial,{platform:'Windows'}).label,'Requirements unknown');
 assert.equal(assessSetup(partial,{architecture:'arm64'}).label,'Requirements unknown');
 assert.equal(assessSetup(partial,{edition:'Studio'}).label,'Requirements unknown');
 assert.equal(assessSetup(partial,{version:'20'}).label,'Requirements unknown');
 assert.equal(assessSetup({...partial,evidence:[]},{platform:'macOS'}).label,'Requirements unknown');
 assert.equal(assessSetup(partial,{platform:'macOS'}).label,'Documented match');
 assert.ok(assessSetup(partial,{platform:'macOS'}).checks[0].sources.length);
 const bark=byId('barkted');assert.equal(assessSetup(bark,{platform:'Windows'}).label,'Documented incompatibility');
});

test('exact tool names rank first and mixed workflow intent asks for a narrower task',()=>{
 assert.equal(findWorkflow(entries,'Kodak 2383 PowerGrade')[0].entry.id,'kodak-2383-powergrade');
 assert.equal(workflowIntent('film look and automatic subtitles').ambiguous,true);
 assert.deepEqual(findWorkflow(entries,'film look and automatic subtitles'),[]);
});

test('compact setup assessment preserves full-data verdicts without transferring evidence text',()=>{
 for(const entry of entries)for(const setup of [{platform:'Windows'},{edition:'Free',version:'20'},{platform:'macOS',architecture:'arm64'}]){
  const full=assessSetup(entry,setup),compact=assessSetup(browseEntry(entry),setup);
  assert.equal(compact.label,full.label,entry.id);assert.deepEqual(compact.unknown,full.unknown,entry.id);assert.deepEqual(compact.conflicts,full.conflicts,entry.id);
 }
});
test('architecture tags do not establish a shared job and documented setup matches rank first',()=>{
 const a={...byId('auto-subs'),id:'example-a',name:'A',tags:['apple silicon'],description:'Audio preparation'};
 const b={...a,id:'example-b',name:'B',kind:'dctl',description:'Color adjustment'};
 assert.equal(comparableResources(a,b),false);
 const source={field:'platforms',level:'documented',source:'https://example.test/platforms'};
 const anchor={...byId('kodak-2383-powergrade'),id:'anchor'};
 const unknown={...anchor,id:'unknown',name:'A unknown',platforms:[],accessGroup:'free',evidence:[]};
 const documented={...anchor,id:'documented',name:'Z documented',platforms:['Windows'],accessGroup:'paid',evidence:[source]};
 assert.deepEqual(relatedResources(anchor,[unknown,documented],3,{platform:'Windows'}).map(e=>e.id),['documented','unknown']);
});
