import {readTextResponse,needsRenderedPage} from './page-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
export function classifySource(result){
 const status=Number(result.http_status??result.status),extraction=result.extraction_status||result.extraction;
 if(status===429)return 'rate_limited';
 if(status===401||status===403||result.status==='challenge'||/captcha|checking your browser|verify you are human|access denied/i.test(result.text||''))return 'blocked';
 if(status===404||status===410)return 'confirmed_broken';
 if(status>=500||result.error||status===408||result.status==='fetch_error')return 'temporary_error';
 if(result.status==='dynamic_content'||extraction==='dynamic_content'||/javascript required|enable javascript/i.test(result.text||''))return 'javascript_dependent';
 if(result.truncated||['unsupported_content','unsupported_encoding','truncated_content','limited_content'].includes(extraction)||result.status==='limited_content')return 'incomplete';
 if(status>=200&&status<300){
  const requested=sourceUrl(result.url||result.requested_url);
  const final=sourceUrl(result.final_url);
  if(requested&&final&&requested!==final)return 'redirect';
  return 'reachable_review_needed';
 }
 return 'incomplete';
}
const MAX_RETRY_DELAY_MS=5000;
function retryDelay(header,attempt,now){
 if(!header)return attempt*1000;
 const value=header.trim();
 const milliseconds=/^\d+$/.test(value)?Number(value)*1000:Date.parse(value)-now();
 return Number.isNaN(milliseconds)?attempt*1000:Math.max(milliseconds,attempt*1000);
}
export async function withSourceRetries(check,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,maxAttempts=3}={}){
 const attempts=Math.max(1,Math.min(3,Math.floor(maxAttempts)||1));
 for(let attempt=1;attempt<=attempts;attempt++){
  const {retry_after,...observed}=await check(attempt);
  const result={...observed,attempts:attempt};
  if(attempt===attempts||!['temporary_error','rate_limited'].includes(classifySource(result)))return result;
  const delay=retryDelay(retry_after,attempt,now);
  if(delay>MAX_RETRY_DELAY_MS)return {...result,retry_deferred:true};
  await wait(delay);
 }
}
export async function checkSource(url,{fetchImpl=fetch,wait,maxAttempts=3}={}){
 const last=await withSourceRetries(async()=>{
  try{
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(12000),redirect:'follow',headers:{'User-Agent':'Open-Resolve-List-Source-Review/1.0'}});
   const {raw,...extraction}=await readTextResponse(response,16000);
   const final_url=response.url||url;
   return {url,http_status:response.status,final_url,text:raw,...extraction,
    status:needsRenderedPage(final_url,raw)?'dynamic_content':undefined,retry_after:response.headers.get('retry-after')};
  }catch{return {url,error:'request_failed'};}
 },{wait,maxAttempts});
 const {text,...safe}=last;return {...safe,classification:classifySource(last),checked_at:new Date().toISOString()};
}
export function queueCoverage(queue){
 const completed=new Set(['reachable_review_needed','confirmed_broken','redirect']);
 return {total:queue.length,attempted:queue.filter(r=>r.attempts>0||r.checked_at).length,fetch_complete:queue.filter(r=>completed.has(r.classification)).length,incomplete:queue.filter(r=>!completed.has(r.classification)).length};
}
function sourceUrl(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password)return null;
  url.hash='';
  return url.href;
 }catch{return null;}
}
export function sourceChecklist(records){
 const sources=records.flatMap(record=>[
  record.urls.canonical,...record.urls.previous,...record.evidence.map(e=>e.source),...(record.search_sources||[]),
  record.version?.source,...(record.history||[]).flatMap(item=>[item.source,...(item.changelogs||[]).map(item=>item.url)]),
 ]);
 return [...new Set(sources.map(sourceUrl).filter(Boolean))].sort();
}

function pageObservation(capture){
 return {
  url:capture.url||capture.requested_url,
  final_url:capture.final_url,
  http_status:capture.http_status,
  extraction_status:capture.extraction_status,
  checked_at:capture.checked_at,
  attempts:capture.attempts||1,
  retry_deferred:capture.retry_deferred,
  classification:classifySource(capture),
 };
}
const weeklyFiles=['github','github-changelogs','external','changelog-pages'];
export function weeklyObservations(captures){
 return [
  ...(captures.github||[]).map(record=>({
   url:record.requested_url,final_url:record.data?.url,checked_at:record.checked_at,attempts:1,
   classification:record.data?'metadata_only':'incomplete',
  })),
  ...(captures['github-changelogs']||[]).map(record=>({
   url:record.url,checked_at:record.checked_at,attempts:1,
   classification:record.text?.trim()?'reachable_review_needed':'incomplete',
  })),
  ...['external','changelog-pages'].flatMap(name=>(captures[name]||[]).map(pageObservation)),
 ];
}
export function buildSourceQueue(urls,observations){
 const observed=new Map();
 for(const record of observations){
  const url=sourceUrl(record.url);
  if(url)observed.set(url,{...record,url,final_url:sourceUrl(record.final_url)||undefined});
 }
 const sources=[...new Set([...urls,...observed.keys()])].sort();
 return sources.map(url=>({
  ...(observed.get(url)||{url,classification:'incomplete',attempts:0}),
  review_status:'candidate_only',
 }));
}
export function renderQueueSummary(queue,missing=[]){
 const coverage=queueCoverage(queue);
 const labels={
  reachable_review_needed:'Page or changelog retrieved for review',confirmed_broken:'HTTP 404 or 410',redirect:'Redirected',
  metadata_only:'Repository metadata only',blocked:'Blocked',rate_limited:'Rate limited',
  temporary_error:'Temporary error',javascript_dependent:'Requires JavaScript',incomplete:'Attempted with incomplete results',
 };
 const counts=Object.fromEntries(Object.keys(labels).map(key=>[key,0]));
 for(const item of queue)if(item.attempts>0||item.checked_at)counts[item.classification]++;
 return [
  '## Source review queue','',
  `- ${coverage.total} source URLs in scope. ${coverage.attempted} attempted. ${coverage.total-coverage.attempted} not attempted.`,
  ...Object.entries(labels).filter(([key])=>counts[key]>0).map(([key,label])=>`- ${label}: ${counts[key]}`),
  ...(queue.some(item=>item.retry_deferred)?[`- Retry deferred at the server's request: ${queue.filter(item=>item.retry_deferred).length}`]:[]),
  ...(missing.length?[`- Capture files missing: ${missing.join(', ')}`]:[]),
  '',
  'These are automated check results. Formal listing updates also review original evidence, discovery ledgers, credits and prior follow-ups.',
 ].join('\n');
}

function loadCapture(file){
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(data))throw new Error('Source captures must contain an array.');
 return data;
}
async function main(){
 const root=fileURLToPath(new URL('..',import.meta.url)),urls=sourceChecklist(loadCanonicalResources(root));
 const capturesIndex=process.argv.indexOf('--captures'),missing=[];
 let results=[];
 if(process.argv.includes('--weekly')){
  const captures={};
  for(const name of weeklyFiles){
   const file=path.join(root,'.research/update-check',name+'.json');
   if(fs.existsSync(file))captures[name]=loadCapture(file);
   else missing.push(name);
  }
  results=weeklyObservations(captures);
 }else if(capturesIndex>=0){
  results=loadCapture(process.argv[capturesIndex+1]).map(pageObservation);
 }else if(process.argv.includes('--check')){
  for(let start=0;start<urls.length;start+=4)results.push(...await Promise.all(urls.slice(start,start+4).map(url=>checkSource(url))));
 }
 const queue=buildSourceQueue(urls,results);
 const target=path.join(root,'.research/source-review-queue.json');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,JSON.stringify({schema_version:1,created_at:new Date().toISOString(),scope:'Maintained listing, evidence and changelog URLs plus sources observed in these captures.',missing_captures:missing,coverage:queueCoverage(queue),queue},null,2)+'\n');
 console.log(renderQueueSummary(queue,missing));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
