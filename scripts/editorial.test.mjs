import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCsv,parseExternalResources} from './build-catalogue.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('catalogue presentation keeps concise navigation and complete descriptions',()=>{
const readme=read('CATALOGUE.md');
 assert.equal(readme.match(/^## .+$/m)?.[0],'## Contents');
 assert.doesNotMatch(readme,/awesome\.re\/badge/);
 for(const e of [...parseCsv(read('data/repositories.csv')),...parseExternalResources(read('data/external-tools.md'))]){
  assert.match(e.description,/[.!?]$/,e.repository||e.name);
  assert.equal(e.description,e.description.trim());
 }
for(const file of ['README.md','CATALOGUE.md','START-HERE.md','CATALOGUE-GUIDE.md','TOOL-FINDER.md','CONTRIBUTING.md']){
  const text=read(file);
  assert.equal([...text.matchAll(/^# /gm)].length,1,file);
  assert.doesNotMatch(text,/\t| +\r?$/m,file);
 }
});

test('legacy view matches explicit evidence without removing full-catalogue entries',()=>{
 const records=JSON.parse(read('data/legacy.json')).entries;
 const urls=[...read('views/legacy.md').matchAll(/^\| \[[^\]]+\]\((https:\/\/[^)]+)\)/gm)].map(m=>m[1]);
 assert.deepEqual([...urls].sort(),records.map(e=>e.url).sort());
 assert.equal(new Set(urls).size,records.length);
 for(const e of records){
  assert.ok(['archived','deprecated'].includes(e.status));
  assert.equal(new URL(e.source).protocol,'https:');
  assert.ok(e.reason&&Number.isFinite(Date.parse(e.checked_at)));
  assert.ok(read('CATALOGUE.md').includes(']('+e.url+')'));
 }
});
