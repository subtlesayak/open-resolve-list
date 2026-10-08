import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gumroadVersion,validDate} from './update-evidence.mjs';
import {parseCsv} from './build-catalogue.mjs';
import {buildUpdateReport} from './build-update-report.mjs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const audit=JSON.parse(read('data/update-audit.json'));

test('product metadata excludes policy dates and host compatibility versions',()=>{
 const html=attributes=>'<div data-page="'+JSON.stringify({props:{product:{name:'Example',attributes,refund_policy:{updated_at:'2025-05-24'}}}}).replaceAll('&','&amp;').replaceAll('"','&quot;')+'">';
 assert.deepEqual(gumroadVersion(html([{name:'Resolve Version',value:'19'}])),{name:'Example',version:null});
 assert.deepEqual(gumroadVersion(html([{name:'Plugin Version ',value:'1.0'}])),{name:'Example',version:'1.0'});
 assert.equal(gumroadVersion(html([{name:'Latest Version',value:'4'}])).version,'4');
 assert.equal(gumroadVersion('<div data-page="broken">'),null);
});

test('ambiguous and impossible dates are not eligible for relative release ages',()=>{
 for(const value of ['09/02/26','2024-18-11','2025-02-29','Unreleased',null])assert.equal(validDate(value),false);
 assert.equal(validDate('2024-02-29'),true);
 for(const e of audit.external)if(e.date){assert.ok(validDate(e.date));assert.ok(e.update_source&&e.date_kind);assert.ok(e.date<=audit.reviewed_on);}
 assert.equal(audit.external.find(e=>e.name==='Proto V3').date,null);
 assert.equal(audit.external.find(e=>e.name==='SuperModulation').date,null);
});

test('audit snapshot plus later discoveries cover every destination exactly once',()=>{
 const repos=parseCsv(read('data/repositories.csv'));
 const urls=[...read('data/external-tools.md').matchAll(/^\| \[[^\]]+\]\((https:\/\/[^)]+)\)/gm)].map(m=>m[1]);
 const later=JSON.parse(read('data/community-discoveries.json'));
 assert.equal(audit.scope.github,repos.length);assert.equal(audit.scope.external,audit.external.length);
 assert.equal(audit.scope.external,later.baseline_count);
 assert.deepEqual(audit.github.map(e=>e.repository).sort(),repos.map(e=>e.repository).sort());
 assert.deepEqual([...audit.external,...later.additions].map(e=>e.url).sort(),urls.sort());
 for(const e of audit.github){
  const r=repos.find(r=>r.repository===e.repository);
  if(e.status==='available')assert.ok(Date.parse(r.metadata_checked_at)>=Date.parse(e.checked_at),'Current metadata must not predate its audit snapshot');
  if(r.metadata_checked_at===e.checked_at){assert.equal(String(e.stars),r.stars);assert.equal(e.last_pushed_at||'',r.last_pushed_at);}
  if(e.latest_stable_release)assert.equal(e.latest_stable_release.prerelease,false);
 }
 const serialized=JSON.stringify(audit);
 assert.doesNotMatch(serialized,/[A-Z]:\\|file:\/\/|refund_policy|analytics|seller_reputation/);
});

test('report includes every resource and regenerates deterministically',()=>{
 buildUpdateReport(); // Local reports are intentionally absent from Git.
 const before=read('data/update-audit.md');buildUpdateReport();assert.equal(read('data/update-audit.md'),before);
 for(const e of [...audit.github,...audit.external])assert.ok(before.includes(']('+e.url+')'));
 assert.ok(before.includes('HTTP 404'));
 assert.ok(before.includes('🧪 Prerelease'));
 for(const file of ['README.md','data/update-audit.md','data/external-tools.md','CHANGELOG.md']){
  for(const m of read(file).matchAll(/\]\(([^)]+)\)/g)){
   const target=m[1].split('#')[0];if(!target||/^https?:/.test(target))continue;
   assert.ok(fs.existsSync(new URL(target,new URL(file,root))),`${file}: ${target}`);
  }
 }
});
