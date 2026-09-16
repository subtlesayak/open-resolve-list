// Read-only upstream checks. Writes research output; never executes downloaded code.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseCsv } from './build-catalogue.mjs';
import { loadCanonicalResources, toCatalogueEntry } from './canonical-source.mjs';
import { gumroadVersion } from './update-evidence.mjs';
import {cleanUpdateUrl,readTextResponse,needsRenderedPage} from './page-evidence.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const dir='.research/update-check';
fs.mkdirSync(dir,{recursive:true});
const checkedAt=new Date().toISOString();
const canonical=fs.existsSync('data/resources/index.json')?loadCanonicalResources(root):null;
const entries=canonical?canonical.filter(e=>e.origin==='github').map(toCatalogueEntry):parseCsv(fs.readFileSync('data/repositories.csv','utf8'));
const external=canonical?canonical.filter(e=>e.origin==='external').map(toCatalogueEntry):[...fs.readFileSync('data/external-tools.md','utf8').matchAll(/^\| \[([^\]]+)\]\((https:\/\/[^)]+)\)/gm)].map(m=>({name:m[1],url:m[2]}));
const save=(name,value)=>{
 const target=`${dir}/${name}.json`,temporary=target+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');
 fs.renameSync(temporary,target);
};
function graph(query){
 const r=spawnSync('gh',['api','graphql','--input','-'],{input:JSON.stringify({query}),encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
 if(r.status!==0) throw new Error('GitHub API request failed: '+r.stderr.slice(0,300));
 return JSON.parse(r.stdout);
}
function github(){
 const results=[];
 for(let start=0;start<entries.length;start+=10){
  const chunk=entries.slice(start,start+10);
  const fields=chunk.map((e,i)=>{
   if(!/^[\w.-]+\/[\w.-]+$/.test(e.repository)) throw Error('Invalid public repository identifier');
   const [owner,name]=e.repository.split('/');
   return `r${i}: repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}) { nameWithOwner url isArchived isEmpty isDisabled stargazerCount pushedAt latestRelease { name tagName url publishedAt isPrerelease description } releases(first:1,orderBy:{field:CREATED_AT,direction:DESC}) { nodes { name tagName url publishedAt isPrerelease description } } defaultBranchRef { name target { ... on Commit { oid committedDate url messageHeadline tree { entries { name type path } } } } } }`;
  });
  const res=graph('query { '+fields.join('\n')+' }');
  for(let i=0;i<chunk.length;i++) results.push({repository:chunk[i].repository,requested_url:chunk[i].url,checked_at:checkedAt,status:res.data?.['r'+i]?'available':'unresolved',data:res.data?.['r'+i]||null,errors:(res.errors||[]).filter(e=>e.path?.[0]==='r'+i).map(e=>e.type||'API error')});
  console.log(`GitHub: ${Math.min(start+10,entries.length)}/${entries.length}`);
 }
 save('github',results);
}
function githubLogs(){
 const records=JSON.parse(fs.readFileSync(`${dir}/github.json`,'utf8'));
 const results=[];
 for(const record of records){
  const repo=record.data,branch=repo?.defaultBranchRef;
  const files=branch?.target.tree.entries.filter(e=>e.type==='blob'&&/^(changelog|changes|history|news)(\.|$)/i.test(e.name))||[];
  if(!files.length)continue;
  const [owner,name]=repo.nameWithOwner.split('/');
  const fields=files.map((f,i)=>`f${i}: object(expression:${JSON.stringify(branch.name+':'+f.path)}) { ... on Blob { text } }`);
  const r=graph(`query { repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}) { ${fields.join('\n')} } }`);
  for(let i=0;i<files.length;i++)results.push({repository:record.repository,path:files[i].path,url:repo.url+'/blob/'+encodeURIComponent(branch.name)+'/'+files[i].path,text:r.data?.repository?.['f'+i]?.text||null});
 }
 save('github-changelogs',results);console.log(`Read ${results.length} root changelog files`);
}
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n));
const textOf=s=>decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const updateWords=/change\s*log|release\s*notes|version\s*history|what[’']?s\s*new|update\s*history|latest\s*updates/i;
async function fetchPage(url){
 const started=new Date().toISOString();
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'Open-Resolve-List-Link-Check/1.0','Accept':'text/html,application/json;q=0.9,*/*;q=0.5'}});
  const {raw,...extraction}=await readTextResponse(response);
  const text=textOf(raw);
  const links=[];
  for(const m of raw.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)){
   const href=m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];const label=textOf(m[2]);
   if(!href||!updateWords.test(label+' '+href))continue;
   try{const url=cleanUpdateUrl(decode(href),response.url);if(url)links.push({url,label:label.slice(0,120)});}catch{}
  }
  const snippets=[];
  const pattern=/change\s*log|release\s*notes|version\s*history|what[’']?s\s*new|last\s*updated|latest\s*version|release\s*date|updated\s*on|version\s*\d+\.\d+/gi;
  for(const m of text.matchAll(pattern)){snippets.push(text.slice(Math.max(0,m.index-45),m.index+650));if(snippets.length>=12)break;}
  const dates=[...raw.matchAll(/(?:dateModified|datePublished|article:modified_time)["']?\s*(?:content=["']|:\s*["'])([^"']+)/gi)].map(m=>m[1].slice(0,100));
  const blocked=/just a moment|verify you are human|checking your browser|access denied|captcha/i.test(text.slice(0,600));
  const product = new URL(url).hostname.endsWith('.gumroad.com') ? gumroadVersion(raw) : null;
  const status=blocked?'challenge':!response.ok?'http_error':extraction.extraction_status!=='text_extracted'?extraction.extraction_status:needsRenderedPage(response.url,raw)?'dynamic_content':text.length<800&&!product?'limited_content':'retrieved';
  return {url,final_url:response.url,checked_at:started,http_status:response.status,status,...extraction,title:textOf(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,180),text_length:text.length,product_metadata:product,update_links:[...new Map(links.map(e=>[e.url,e])).values()].slice(0,12),update_snippets:snippets,page_date_candidates:dates};
 }catch(e){return {url,checked_at:started,status:'fetch_error',error:e.name==='TimeoutError'?'timeout':e.cause?.code||e.name};}
}
async function pool(items,fn,limit=6){let next=0;const out=[];await Promise.all(Array.from({length:limit},async()=>{for(;;){const i=next++;if(i>=items.length)break;out[i]=await fn(items[i],i);}}));return out;}
async function websites(){
 const results=await pool(external,async(e,i)=>{const item={...e,...await fetchPage(e.url)};save('external-'+i,item);console.log(`External ${i+1}/${external.length}: ${item.status} ${e.name}`);return item;});
 save('external',results);
 // Follow discovered changelog links, never forms, purchases, downloads or arbitrary scripts.
 const urls=[...new Set(results.flatMap(e=>e.update_links||[]).map(e=>e.url.split('#')[0]))].filter(u=>!external.some(e=>e.url===u)&&!/^https:\/\/github.com\//.test(u)&&! /\.(zip|exe|dmg|pkg|pdf|msi)(?:$|[?#])/i.test(u));
 const logs=await pool(urls,async(u,i)=>{const r=await fetchPage(u);save('log-'+i,r);return r;},4);
 save('changelog-pages',logs);console.log(`Checked ${logs.length} discovered update/changelog pages`);
}
if(process.argv.includes('--github'))github();
else if(process.argv.includes('--github-changelogs'))githubLogs();
else if(process.argv.includes('--external'))await websites();
else throw Error('Choose --github, --github-changelogs, or --external. Outputs go to .research/update-check for review.');
