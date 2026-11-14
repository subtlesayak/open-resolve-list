import {readTextResponse,needsRenderedPage} from './page-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
export function classifySource(result){
 const status=Number(result.http_status??result.status),extraction=result.extraction_status||result.extraction;
 if(status===404||status===410)return 'confirmed_broken';
 if(status===429)return 'rate_limited';
 if(status===401||status===403||result.status==='challenge'||/captcha|checking your browser|verify you are human|access denied/i.test(result.text||''))return 'blocked';
 if(status>=500||result.error||status===408||result.status==='fetch_error')return 'temporary_error';
 if(result.status==='dynamic_content'||extraction==='dynamic_content'||/javascript required|enable javascript/i.test(result.text||''))return 'javascript_dependent';
 if(result.truncated||['unsupported_content','unsupported_encoding','truncated_content','limited_content'].includes(extraction)||result.status==='limited_content')return 'incomplete';
 if(result.final_url&&result.final_url!==result.url&&status>=200&&status<300)return 'redirect';
 if(status>=200&&status<300)return 'reachable_review_needed';
 return 'incomplete';
}
export async function checkSource(url,{fetchImpl=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),maxAttempts=3}={}){
 let last;const attempts=Math.max(1,Math.min(3,Math.floor(maxAttempts)||1));
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(12000),redirect:'follow',headers:{'User-Agent':'Open-Resolve-List-Source-Review/1.0'}});
   const {raw,...extraction}=await readTextResponse(response,16000);
   last={url,http_status:response.status,final_url:response.url||url,text:raw,...extraction,attempts:attempt};
   if(needsRenderedPage(last.final_url,raw))last.status='dynamic_content';
  }catch{last={url,error:'request_failed',attempts:attempt};}
  if(!['temporary_error','rate_limited'].includes(classifySource(last))||attempt===attempts)break;
  await wait(attempt*1000);
 }
 const {text,...safe}=last;return {...safe,classification:classifySource(last),checked_at:new Date().toISOString()};
}
export function queueCoverage(queue){
 const completed=new Set(['reachable_review_needed','confirmed_broken','redirect']);
 return {total:queue.length,attempted:queue.filter(r=>r.attempts>0||r.checked_at).length,fetch_complete:queue.filter(r=>completed.has(r.classification)).length,incomplete:queue.filter(r=>!completed.has(r.classification)).length};
}
export function sourceChecklist(records){return [...new Set(records.flatMap(r=>[r.urls.canonical,...r.urls.previous,...r.evidence.map(e=>e.source),...(r.search_sources||[])]).filter(u=>/^https:\/\//.test(u)))].sort();}
async function main(){
 const root=fileURLToPath(new URL('..',import.meta.url)),urls=sourceChecklist(loadCanonicalResources(root));
 const capturesIndex=process.argv.indexOf('--captures');let results=[];
 if(capturesIndex>=0){const raw=JSON.parse(fs.readFileSync(process.argv[capturesIndex+1],'utf8'));results=raw.map(r=>({...r,classification:classifySource(r)}));}
 else if(process.argv.includes('--check')){for(let start=0;start<urls.length;start+=4)results.push(...await Promise.all(urls.slice(start,start+4).map(url=>checkSource(url))));}
 const observed=new Map(results.map(r=>[r.url||r.requested_url,r]));
 const queue=urls.map(url=>({url,...(observed.get(url)||{classification:'incomplete',attempts:0}),review_status:'candidate_only'}));
 const target=path.join(root,'.research/source-review-queue.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({schema_version:1,created_at:new Date().toISOString(),scope:'Maintained canonical and evidence URLs. A formal listing update must additionally reconstruct all discovery ledgers, credits and prior local follow-ups.',coverage:queueCoverage(queue),queue},null,2)+'\n');
 console.log(`Source review queue: ${urls.length} sources; ${queueCoverage(queue).incomplete} incomplete. No catalogue changes.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
