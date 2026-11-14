import {loadCanonicalResources} from './canonical-source.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const TAG_TITLE='Open Resolve List';
const REVIEW_INTERVAL={weeks:2,days:0,hours:0,minutes:0,seconds:0};
const root=fileURLToPath(new URL('..',import.meta.url));

function apiRoot(value){
  const parsed=new URL(value);
  if(parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('CHANGEDETECTION_URL must not contain credentials, a query, or a fragment.');
  const loopback=['localhost','127.0.0.1','::1'].includes(parsed.hostname);
  if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&loopback))throw new Error('Use HTTPS for a remote Changedetection.io instance (HTTP is allowed only for loopback).');
  let pathname=parsed.pathname.replace(/\/+$/,'');
  if(!pathname)pathname='/api/v1';
  else if(!pathname.endsWith('/api/v1'))pathname+='/api/v1';
  parsed.pathname=pathname;
  return parsed.toString().replace(/\/$/,'');
}

async function request(api,apiKey,fetchImpl,path,options={}){
  const response=await fetchImpl(api+path,{...options,headers:{'x-api-key':apiKey,'accept':'application/json',...(options.body?{'content-type':'application/json'}:{}),...options.headers}});
  if(!response.ok)throw new Error(`Changedetection.io API ${options.method||'GET'} ${path} failed (HTTP ${response.status}).`);
  if(response.status===204)return null;
  const text=await response.text();
  if(!text)return null;
  try{return JSON.parse(text);}catch{if((options.method||'GET')!=='GET')return text;throw new Error(`Changedetection.io API ${options.method||'GET'} ${path} returned invalid JSON.`);}
}

function watchRows(payload){
  if(Array.isArray(payload))return payload;
  if(payload&&typeof payload==='object')return Object.values(payload);
  throw new Error('Changedetection.io returned an unexpected watch-list shape.');
}

function changedWithinReviewWindow(watch,now){
  const raw=watch.last_changed;
  const timestamp=typeof raw==='number'?raw:Number(raw);
  return Number.isFinite(timestamp)&&timestamp>0&&timestamp>=Math.floor(now.getTime()/1000)-14*24*60*60;
}

const clean=value=>String(value??'').replace(/[\r\n|<>\[\]]/g,' ').trim();
const safeLink=value=>/^https:\/\//.test(value||'')?'['+clean(value)+']('+encodeURI(value).replace(/[()]/g,c=>'%'+c.charCodeAt(0).toString(16))+')':clean(value);

export async function syncChangedetection({records,baseUrl,apiKey,fetchImpl=fetch,now=new Date()}){
  if(!baseUrl||!apiKey)throw new Error('Both CHANGEDETECTION_URL and CHANGEDETECTION_API_KEY are required.');
  const api=apiRoot(baseUrl);
  const resources=new Map();
  let skippedNonHttps=0;
  for(const record of records){
    const url=record?.urls?.canonical;
    if(!url||!/^https:\/\//.test(url)){skippedNonHttps++;continue;}
    if(!resources.has(url))resources.set(url,record);
  }

  const [tagPayload,watchPayload]=await Promise.all([
    request(api,apiKey,fetchImpl,'/tags'),
    request(api,apiKey,fetchImpl,'/watch'),
  ]);
  let tags=tagPayload&&typeof tagPayload==='object'?Object.values(tagPayload):[];
  let tag=tags.find(item=>String(item.title||'').toLocaleLowerCase()===TAG_TITLE.toLocaleLowerCase());
  if(!tag){
    const created=await request(api,apiKey,fetchImpl,'/tag',{method:'POST',body:JSON.stringify({title:TAG_TITLE})});
    if(!created?.uuid)throw new Error('Changedetection.io created a tag without returning its UUID.');
    tag={uuid:created.uuid,title:TAG_TITLE};
  }

  const watches=watchRows(watchPayload);
  const byUrl=new Map();
  for(const watch of watches){if(typeof watch?.url==='string'&&!byUrl.has(watch.url))byUrl.set(watch.url,watch);}
  const stats={catalogueResources:records.length,uniqueUrls:resources.size,skippedNonHttps,created:0,adopted:0,alreadyManaged:0,changed:[]};
  const managedIds=new Set();
  for(const [url,record] of resources){
    const existing=byUrl.get(url);
    if(existing){
      const existingTags=Array.isArray(existing.tags)?existing.tags:[];
      if(existingTags.includes(tag.uuid)){
        stats.alreadyManaged++;
        if(existing.time_between_check?.weeks!==2)await request(api,apiKey,fetchImpl,'/watch/'+encodeURIComponent(existing.uuid),{method:'PUT',body:JSON.stringify({time_between_check:REVIEW_INTERVAL,time_between_check_use_default:false})});
        if(existing.uuid)managedIds.add(existing.uuid);
        continue;
      }
      if(!existing.uuid)throw new Error('A matching existing watch did not include its UUID; refusing to modify it.');
      const updatedTags=[...new Set([...existingTags,tag.uuid])];
      await request(api,apiKey,fetchImpl,'/watch/'+encodeURIComponent(existing.uuid),{
        method:'PUT',body:JSON.stringify({tags:updatedTags,time_between_check:REVIEW_INTERVAL,time_between_check_use_default:false}),
      });
      stats.adopted++;
      managedIds.add(existing.uuid);
      continue;
    }
    await request(api,apiKey,fetchImpl,'/watch',{
      method:'POST',body:JSON.stringify({
        url,title:record.name,tags:[tag.uuid],time_between_check:REVIEW_INTERVAL,
        time_between_check_use_default:false,notification_muted:true,
      }),
    });
    stats.created++;
  }

  for(const watch of watches){
    if(!managedIds.has(watch.uuid)||!changedWithinReviewWindow(watch,now))continue;
    stats.changed.push({title:watch.title||watch.url,url:watch.link||watch.url});
  }
  stats.changed.sort((a,b)=>a.title.localeCompare(b.title));
  return stats;
}

export function renderChangedetectionSummary(stats){
  const lines=['## changedetection.io 14-day watch sync','','Catalogue source pages are monitored by changedetection.io on a 14-day interval. Detected changes are review candidates only; they do not edit listings.','',
    `- Catalogue resources: ${stats.catalogueResources}`,
    `- Unique HTTPS URLs monitored: ${stats.uniqueUrls}`,
    `- Resources skipped because they lack an HTTPS canonical URL: ${stats.skippedNonHttps}`,
    `- New watches created: ${stats.created}`,
    `- Existing watches adopted into the Open Resolve List group: ${stats.adopted}`,
    `- Already managed: ${stats.alreadyManaged}`,
    `- Changes detected during the last 14 days: ${stats.changed.length}`,
  ];
  if(stats.changed.length){
    lines.push('','### Changed pages to review','','| Page | Source |','| --- | --- |');
    for(const item of stats.changed.slice(0,100))lines.push(`| ${clean(item.title)} | ${safeLink(item.url)} |`);
    if(stats.changed.length>100)lines.push('',`Showing the first 100 of ${stats.changed.length} changed pages.`);
  }
  lines.push('','The Changedetection.io instance performs the checks; this workflow synchronizes catalogue URLs and reports recent changes. Existing watch notification settings are preserved. Newly created watches are muted to avoid unsolicited notifications.');
  return lines.join('\n')+'\n';
}

async function main(){
  const baseUrl=process.env.CHANGEDETECTION_URL,apiKey=process.env.CHANGEDETECTION_API_KEY;
  if(!baseUrl&&!apiKey){console.log('## changedetection.io 14-day watch sync\n\nNot configured; add CHANGEDETECTION_URL and CHANGEDETECTION_API_KEY as repository Actions secrets to enable it.\n');return;}
  const stats=await syncChangedetection({records:loadCanonicalResources(root),baseUrl,apiKey});
  console.log(renderChangedetectionSummary(stats));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
