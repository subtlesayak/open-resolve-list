import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources,toSiteEntry} from './canonical-source.mjs';
import {assessSetup} from '../site/discovery-model.mjs';
import {filterEntries,DEFAULTS} from '../site/model.mjs';
const records=loadCanonicalResources(fileURLToPath(new URL('..',import.meta.url)));
const entry=id=>toSiteEntry(records.find(record=>record.id===id));
test('a creator-reported Totonoe test point does not become an open-ended Resolve range',()=>{
 const tool=entry('totonoe-skin-retouch');
 assert.equal(assessSetup(tool,{edition:'Free',version:'21',platform:'macOS',architecture:'arm64'}).label,'Requirements unknown');
 assert.equal(assessSetup(tool,{edition:'Studio',platform:'macOS'}).label,'Requirements unknown');
 assert.ok(tool.evidence.some(e=>e.level==='creator'&&e.note.includes('20.3.2')));
 assert.ok(!tool.evidence.some(e=>e.level==='tested'));
});
test('panel protocol tools retain hardware dependencies and untested-platform uncertainty',()=>{
 const tool=entry('bmd-micro-color-panel-tools');
 assert.match(tool.requirements.dependencies,/Micro Color Panel.*Python 3.*hidapi/);
 assert.equal(assessSetup(tool,{platform:'Linux'}).label,'Requirements unknown');
 assert.equal(assessSetup(tool,{platform:'macOS'}).label,'Requirements unknown');
 assert.ok(tool.evidence.some(e=>e.source.endsWith('/LICENSE')));
 assert.equal(tool.version.kind,'commit');
});
test('RTO uses the current provider minimum and keeps OS-specific CPU combinations uncertain',()=>{
 const tool=entry('resolve-telemetry-overlay');
 assert.equal(assessSetup(tool,{edition:'Free',version:'18.6.5'}).label,'Documented incompatibility');
 assert.equal(assessSetup(tool,{edition:'Studio',version:'21',platform:'Windows',architecture:'arm64'}).label,'Requirements unknown');
 assert.equal(tool.version.date,null,'A build number is not a release date');
 assert.ok(tool.evidence.some(e=>e.field==='editions'&&e.level==='documented'&&e.source.includes('/guide')));
});
test('reviewed submissions are searchable without being promoted to tested recommendations',()=>{
 for(const [id,query] of [['totonoe-skin-retouch','skin retouch'],['bmd-micro-color-panel-tools','micro color panel'],['resolve-telemetry-overlay','fit activity data']]){
  const tool=entry(id);assert.ok(filterEntries([tool],{...DEFAULTS,q:query}).length);assert.equal(tool.recommended,false);assert.equal(tool.recommendation,null);
  assert.ok(records.find(record=>record.id===id).search_sources.some(source=>source.startsWith('https://github.com/subtlesayak/open-resolve-list/issues/')));
 }
});

test('Classic scripts and the current Resolve Tools app retain different host ranges',()=>{
 const classic=entry('marker-madness-suite-for-davinci-resolve');
 const current=entry('resolve-tools-marker-madness-suite');
 assert.equal(assessSetup(classic,{edition:'Free',version:'21.1'}).label,'Documented incompatibility');
 assert.equal(assessSetup(current,{edition:'Free',version:'21.1'}).label,'Documented incompatibility');
 assert.equal(assessSetup(current,{edition:'Studio',version:'21.1'}).label,'Documented match');
 assert.match(classic.access,/Noncommercial/);
});

test('AAC package labels and prereleases do not turn into host support or stable claims',()=>{
 const bridge=entry('resolve-aac-bridge');
 assert.equal(bridge.version.version,'v21.2.6-adts');
 assert.deepEqual(bridge.requirements.resolve,[]);
 assert.equal(assessSetup(bridge,{edition:'Studio',version:'21.2.6',platform:'Linux'}).label,'Requirements unknown');
 assert.equal(entry('hushcut').version.kind,'prerelease');
 assert.equal(entry('corridorkey-2-source').version.kind,'commit');
 assert.equal(entry('logsortie').version.date,null,'Month-only source dates do not establish a publication day');
});
