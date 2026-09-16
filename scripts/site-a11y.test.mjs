import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const resource=fs.readFileSync(new URL('../site/resource.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../site/app.mjs',import.meta.url),'utf8');

test('catalogue page exposes keyboard landmarks and labelled controls',()=>{
 assert.match(index,/<a class="skip" href="#results">/);
 assert.match(index,/<main>/);
 assert.match(index,/<nav aria-label="Main">/);
 assert.match(index,/id="search"[^>]+type="search"/);
 assert.match(index,/id="filters"/);
 assert.match(index,/id="results" tabindex="-1"/);
 assert.match(index,/id="detail-dialog" aria-labelledby="dialog-title"/);
 assert.match(index,/id="dialog-close"[^>]+aria-label="Close details"/);
});

test('resource page exposes a labelled main content region and feed link',()=>{
 assert.match(resource,/<main>/);
 assert.match(resource,/id="resource" aria-live="polite"/);
 assert.match(resource,/rel="alternate" type="application\/json" href="resources\.json"/);
 assert.match(resource,/href="\.\/"/);
});

test('client code preserves focus return and status announcements for dialogs',()=>{
 assert.match(app,/lastFocus=document\.activeElement/);
 assert.match(app,/lastFocus\?\.focus\(\)/);
 assert.match(index,/id="count" role="status" aria-live="polite"/);
 assert.match(index,/id="notice" class="notice" role="status" aria-live="polite"/);
});
