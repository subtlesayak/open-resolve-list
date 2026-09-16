import test from 'node:test';
import assert from 'node:assert/strict';
import {counterUrl} from '../site/footer.mjs';

test('visit counter only runs on production and never includes search or filters', () => {
  const home = counterUrl(new URL('https://subtlesayak.github.io/open-resolve-list/'));
  assert.ok(home);
  for (const page of ['?q=private-search&platform=macOS', 'updates.html', 'about.html#contact']) {
    assert.equal(counterUrl(new URL('https://subtlesayak.github.io/open-resolve-list/' + page)), home);
  }
  for (const location of ['http://127.0.0.1:4175/', 'http://localhost:4173/', 'https://example.com/open-resolve-list/', 'https://subtlesayak.github.io/', 'https://subtlesayak.github.io/open-resolve-list-other/']) {
    assert.equal(counterUrl(new URL(location)), null);
  }
});

test('counter accepts integer API values and rejects missing or malformed data', async () => {
 const {parseCount}=await import('../site/footer.mjs');
 assert.equal(parseCount({value:'12'}),12);
 assert.equal(parseCount({value:0}),0);
 for(const value of [null,undefined,-1,1.2,'','oops',true,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>parseCount({value}));
});
test('failed increments recover through a read without counting a second visit', async () => {
 const {loadCount}=await import('../site/footer.mjs');
 const url=counterUrl(new URL('https://subtlesayak.github.io/open-resolve-list/'));
 const calls=[];
 const count=await loadCount(url,async (target,options)=>{
  calls.push(target);
  assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  if(calls.length===1)throw Error('Network failure');
  return {ok:true,json:async()=>({value:'23'})};
 });
 assert.equal(count,23);
 assert.deepEqual(calls,[url,url.replace('/hit/','/get/')]);
 await assert.rejects(loadCount(url,async()=>({ok:false})));
});
