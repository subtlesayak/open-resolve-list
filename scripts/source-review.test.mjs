import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySource,checkSource,queueCoverage,sourceChecklist,buildSourceQueue,weeklyObservations,renderQueueSummary} from './source-review-queue.mjs';
import {fetchPage} from './check-updates.mjs';
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

test('weekly captures distinguish content, metadata, unavailable sources and missing files',()=>{
 const repo='https://github.com/example/tool';
 const log=repo+'/blob/main/CHANGELOG.md';
 const provider='https://example.org/plugin';
 const older='https://example.org/old-notes';
 const update='https://example.org/notes';
 const records=[{
  urls:{canonical:provider,previous:[repo]},evidence:[{source:provider+'#windows'}],
  version:{source:update+'#current'},history:[{source:older,changelogs:[{url:update+'#older'}]}],
 }];
 const captures={
  github:[{requested_url:repo,data:{url:repo,latestRelease:{description:'Raw release notes'}}}],
  'github-changelogs':[{url:log,text:'Raw changelog'}],
  external:[{url:provider,final_url:provider+'#windows',http_status:200,status:'retrieved',update_snippets:['Raw provider copy']}],
  'changelog-pages':[{url:update,final_url:update,http_status:404,status:'challenge'}],
 };
 const queue=buildSourceQueue(sourceChecklist(records),weeklyObservations(captures));
 const classification=url=>queue.find(item=>item.url===url)?.classification;
 assert.equal(classification(repo),'metadata_only');
 assert.equal(classification(log),'reachable_review_needed');
 assert.equal(classification(provider),'reachable_review_needed');
 assert.equal(classification(update),'blocked');
 assert.equal(classification(older),'incomplete');
 assert.deepEqual(queueCoverage(queue),{total:5,attempted:4,fetch_complete:2,incomplete:3});
 assert.doesNotMatch(JSON.stringify(queue),/Raw /);
 assert.ok(queue.every(item=>item.review_status==='candidate_only'));
 const summary=renderQueueSummary(queue,['github-changelogs']);
 assert.match(summary,/4 attempted\. 1 not attempted/);
 assert.match(summary,/Repository metadata only: 1/);
 assert.match(summary,/Blocked: 1/);
 assert.match(summary,/Capture files missing: github-changelogs/);
 assert.doesNotMatch(summary,/https?:\/\//);
});

test('weekly fetch retries a temporary response and retains the recovered changelog evidence',async()=>{
 const delays=[];
 const responses=[
  new Response('Temporarily unavailable',{status:503,headers:{'Retry-After':'2'}}),
  new Response('<p>'+('Provider details. '.repeat(70))+'</p><a href="/notes">Release notes</a>',{headers:{'Content-Type':'text/html'}}),
 ];
 const result=await fetchPage('https://example.org/tool',{fetchImpl:async()=>responses.shift(),wait:async ms=>delays.push(ms)});
 assert.equal(result.status,'retrieved');
 assert.equal(result.attempts,2);
 assert.deepEqual(result.update_links,[{url:'https://example.org/notes',label:'Release notes'}]);
 assert.deepEqual(delays,[2000]);
});

test('weekly fetch leaves long rate limits, access blocks and permanent errors for review',async()=>{
 const now=()=>Date.parse('2026-11-21T12:00:00Z');
 const retryDate='Sat, 21 Nov 2026 12:01:00 GMT';
 for(const [status,retryAfter,classification] of [[429,retryDate,'rate_limited'],[403,null,'blocked'],[404,null,'confirmed_broken']]){
  const result=await fetchPage('https://example.org/tool',{
   fetchImpl:async()=>new Response('Unavailable',{status,headers:retryAfter?{'Retry-After':retryAfter}:{}}),
   wait:async()=>assert.fail('This result must not trigger a retry'),
   now,
  });
  assert.equal(result.attempts,1);
  assert.equal(classifySource(result),classification);
  assert.equal(Boolean(result.retry_deferred),status===429);
  const queue=buildSourceQueue([],weeklyObservations({external:[result]}));
  assert.equal(Boolean(queue[0].retry_deferred),status===429);
 }
});
