import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySource,checkSource,queueCoverage} from './source-review-queue.mjs';
test('source queue distinguishes broken links, redirects, blocking, JS and temporary failures',()=>{
 for(const [record,result] of [[{http_status:404},'confirmed_broken'],[{http_status:410},'confirmed_broken'],[{http_status:429},'rate_limited'],[{http_status:403},'blocked'],[{http_status:503},'temporary_error'],[{http_status:200,url:'https://a',final_url:'https://b'},'redirect'],[{http_status:200,text:'Enable JavaScript'},'javascript_dependent'],[{},'incomplete']])assert.equal(classifySource(record),result);
});
test('source checks retry temporary errors at most three times and retain incomplete evidence',async()=>{
 let count=0;const result=await checkSource('https://example.test/',{fetchImpl:async()=>{count++;throw Error('temporary');},wait:async()=>{}});assert.equal(count,3);assert.equal(result.classification,'temporary_error');
 count=0;const blocked=await checkSource('https://example.test/',{fetchImpl:async()=>{count++;return new Response('',{status:403,headers:{'content-type':'text/html'}});},wait:async()=>{}});assert.equal(count,1);assert.equal(blocked.classification,'blocked');
});

test('queue consumes actual external-check status and extraction fields conservatively',()=>{
 for(const [record,expected]of [[{http_status:200,status:'challenge'},'blocked'],[{http_status:200,status:'dynamic_content',extraction_status:'text_extracted'},'javascript_dependent'],[{http_status:200,extraction_status:'unsupported_content'},'incomplete'],[{http_status:200,extraction_status:'truncated_content',truncated:true},'incomplete']])assert.equal(classifySource(record),expected);
 const queue=[{classification:'incomplete',attempts:0},{classification:'blocked',checked_at:'2026-11-14'},{classification:'javascript_dependent',attempts:1},{classification:'reachable_review_needed',attempts:1}];
 assert.deepEqual(queueCoverage(queue),{total:4,attempted:3,fetch_complete:1,incomplete:3});
});
test('source checker retains JS shells and truncated bodies as incomplete coverage',async()=>{
 const js=await checkSource('https://example.test/',{fetchImpl:async()=>new Response('<app-root></app-root>',{headers:{'content-type':'text/html'}})});
 assert.equal(js.classification,'javascript_dependent');
 const large=await checkSource('https://example.test/',{fetchImpl:async()=>new Response('a'.repeat(17000),{headers:{'content-type':'text/html'}})});
 assert.equal(large.classification,'incomplete');assert.equal(large.truncated,true);
});
