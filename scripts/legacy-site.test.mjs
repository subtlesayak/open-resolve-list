import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyHtml} from './build-legacy-site.mjs';

test('saved app keeps its content and gets an explicit move link without a redirect',()=>{
 const original='<html><head><link rel="canonical" href="https://subtlesayak.github.io/open-resolve-list/"></head><body><main id="catalogue">Catalogue</main><script src="app.mjs"></script></body></html>';
 const result=legacyHtml(original);
 assert.match(result,/aria-label="Website move"/);
 assert.match(result,/Your saved app or bookmark still works here/);
 assert.match(result,/href="https:\/\/subtlesayak.github.io\/open-resolve-list\/"/);
 assert.ok(result.includes('<main id="catalogue">Catalogue</main><script src="app.mjs"></script>'));
 assert.doesNotMatch(result,/http-equiv="refresh"|location\.(replace|assign)/);
});
