import test from 'node:test';
import assert from 'node:assert/strict';
import {renderChangedetectionSummary,syncChangedetection} from './changedetection-sync.mjs';

const now=new Date('2026-09-22T12:00:00Z');
const item=(id,url)=>({id,name:id,urls:{canonical:url}});

function fakeApi({tags={},watches={}}={}){
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    const route=new URL(url).pathname.replace('/api/v1',''),method=options.method||'GET';
    const body=options.body?JSON.parse(options.body):null;
    calls.push({route,method,body});
    if(route==='/tags')return{ok:true,status:200,text:async()=>JSON.stringify(tags)};
    if(route==='/watch'&&method==='GET')return{ok:true,status:200,text:async()=>JSON.stringify(watches)};
    if(route==='/tag'&&method==='POST')return{ok:true,status:201,text:async()=>JSON.stringify({uuid:'tag1'})};
    if(route==='/watch'&&method==='POST')return{ok:true,status:201,text:async()=>JSON.stringify({uuid:'new-watch'})};
    if(route.startsWith('/watch/')&&method==='PUT')return{ok:true,status:200,text:async()=>'OK'};
    throw new Error(`Unexpected mock call: ${method} ${route}`);
  };
  return{calls,fetchImpl};
}

test('creates one muted 14-day watch per unique canonical HTTPS URL',async()=>{
  const {calls,fetchImpl}=fakeApi();
  const stats=await syncChangedetection({records:[item('a','https://example.org/a'),item('b','https://example.org/b'),item('c','https://example.org/a')],baseUrl:'https://watch.example',apiKey:'test-key',fetchImpl,now});
  assert.equal(stats.catalogueResources,3);
  assert.equal(stats.uniqueUrls,2);
  assert.equal(stats.created,2);
  const created=calls.filter(call=>call.route==='/watch'&&call.method==='POST');
  assert.ok(created.every(call=>call.body.time_between_check.weeks===2&&call.body.time_between_check_use_default===false&&call.body.notification_muted===true));
});

test('adopts existing watches, preserves their settings, and attaches the 14-day interval',async()=>{
  const {calls,fetchImpl}=fakeApi({tags:{tag:{uuid:'tag1',title:'Open Resolve List'}},watches:{watch:{uuid:'watch',url:'https://example.org/a',tags:['other'],last_changed:now.getTime()/1000}}});
  const stats=await syncChangedetection({records:[item('a','https://example.org/a')],baseUrl:'https://watch.example',apiKey:'test-key',fetchImpl,now});
  const update=calls.find(call=>call.route==='/watch/watch');
  assert.equal(stats.adopted,1);
  assert.deepEqual(update.body.tags,['other','tag1']);
  assert.equal(update.body.time_between_check.weeks,2);
  assert.equal('notification_muted' in update.body,false);
  assert.equal(stats.changed.length,1);
});

test('preserves already-managed watches on the correct interval and limits change results to fourteen days',async()=>{
  const {calls,fetchImpl}=fakeApi({tags:{tag:{uuid:'tag1',title:'Open Resolve List'}},watches:{
    recent:{uuid:'recent',url:'https://example.org/a',tags:['tag1'],time_between_check:{weeks:2},last_changed:now.getTime()/1000},
    old:{uuid:'old',url:'https://example.org/b',tags:['tag1'],time_between_check:{weeks:2},last_changed:now.getTime()/1000-15*86400},
  }});
  const stats=await syncChangedetection({records:[item('a','https://example.org/a'),item('b','https://example.org/b')],baseUrl:'https://watch.example',apiKey:'test-key',fetchImpl,now});
  assert.equal(stats.alreadyManaged,2);
  assert.equal(stats.changed.length,1);
  assert.equal(calls.some(call=>call.method==='PUT'||call.method==='POST'),false);
});

test('rejects insecure remote services',async()=>{
  await assert.rejects(syncChangedetection({records:[],baseUrl:'http://remote.example',apiKey:'secret',fetchImpl:async()=>{throw new Error('unexpected fetch');}}),/Use HTTPS/);
});

test('summary labels detections as review candidates',()=>{
  const text=renderChangedetectionSummary({catalogueResources:514,uniqueUrls:514,skippedNonHttps:0,created:514,adopted:0,alreadyManaged:0,changed:[{title:'Example',url:'https://example.org'}]});
  assert.match(text,/Changes detected during the last 14 days: 1/);
  assert.match(text,/do not edit listings/);
});
