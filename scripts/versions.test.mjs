import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCsv,parseExternalResources} from './build-catalogue.mjs';
import {versionLabel} from './versions.mjs';
import {externalVersions,githubVersion} from './version-evidence.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const versions=JSON.parse(read('data/versions.json')).entries;
test('every catalogue entry has one version state and an upstream source',()=>{
 const all=[...parseCsv(read('data/repositories.csv')),...parseExternalResources(read('data/external-tools.md'))];
 assert.deepEqual(versions.map(e=>e.url).sort(),all.map(e=>e.url).sort());
 assert.equal(new Set(versions.map(e=>e.url)).size,versions.length);
 for(const e of versions){
  assert.ok(['stable-release','prerelease','commit','vendor-version','package-version','unverified','not-applicable','reference-edition'].includes(e.kind));
  assert.equal(new URL(e.source).protocol,'https:');assert.ok(Number.isFinite(Date.parse(e.checked_at)));
  if(e.kind==='unverified'){assert.equal(e.version,null);assert.match(versionLabel(e.url),/not established/);}
  else if(e.kind==='not-applicable'){assert.equal(e.version,null);assert.match(versionLabel(e.url),/not applicable/);}
  else assert.ok(e.version);
  if(e.kind==='commit'){assert.match(e.version,/^[a-f0-9]{40}$/);assert.match(versionLabel(e.url),/Revision .*no published release/);}
  if(e.kind==='prerelease')assert.match(versionLabel(e.url),/prerelease/);
 }
});

test('published external versions reconcile with maintained evidence and overrides',()=>{
 const expected=externalVersions(parseExternalResources(read('data/external-tools.md')),JSON.parse(read('data/update-audit.json')),JSON.parse(read('data/community-discoveries.json')),JSON.parse(read('data/version-overrides.json')));
 const order=items=>[...items].sort((a,b)=>a.url.localeCompare(b.url));
 assert.deepEqual(order(versions.filter(e=>!e.url.startsWith('https://github.com/'))),order(expected));
});

test('GitHub transformation distinguishes stable releases, prereleases and source revisions',()=>{
 const item={checked_at:'2026-09-06',data:{defaultBranchRef:{target:{oid:'a'.repeat(40),url:'https://github.com/a/b/commit/abc',committedDate:'2026-09-01'}}}};
 assert.equal(githubVersion('a/b','https://github.com/a/b',item).kind,'commit');
 item.data.releases={nodes:[{tagName:'2-beta',url:'https://github.com/a/b/releases/tag/2-beta',isPrerelease:true}]};
 assert.equal(githubVersion('a/b','https://github.com/a/b',item).kind,'prerelease');
 item.data.latestRelease={tagName:'1.0',url:'https://github.com/a/b/releases/tag/1.0',isPrerelease:false};
 assert.equal(githubVersion('a/b','https://github.com/a/b',item).version,'1.0');
 assert.throws(()=>githubVersion('a/b','https://github.com/a/b',null),/Missing metadata/);
});
test('every public README entry displays version evidence or explicit uncertainty',()=>{
  const readme=read('CATALOGUE.md');
 for(const e of versions){const row=readme.split('\n').find(l=>l.startsWith('| [')&&l.includes(']('+e.url+')'));assert.ok(row?.includes(versionLabel(e.url)),e.name);}
});
