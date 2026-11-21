import {loadCanonicalResources} from './canonical-source.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const TAG_TITLE='Open Resolve List';
const REVIEW_INTERVAL={weeks:2,days:0,hours:0,minutes:0,seconds:0};
const SECONDS_PER_UNIT={weeks:604800,days:86400,hours:3600,minutes:60,seconds:1};
const REVIEW_INTERVAL_SECONDS=14*86400;
const root=fileURLToPath(new URL('..',import.meta.url));

function apiRoot(value){
  const parsed=new URL(value);
  if(parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('CHANGEDETECTION_URL must not contain credentials, a query, or a fragment.');
  const loopback=['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&loopback))throw new Error('Use HTTPS for a remote Changedetection.io instance (HTTP is allowed only for loopback).');
  let pathname=parsed.pathname.replace(/\/+$/,'');
  if(!pathname)pathname='/api/v1';
  else if(!pathname.endsWith('/api/v1'))pathname+='/api/v1';
  parsed.pathname=pathname;
  return parsed.toString().replace(/\/$/,'');
}

async function request(api,apiKey,fetchImpl,path,options={}){
  const response=await fetchImpl(api+path,{
    ...options,redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{'x-api-key':apiKey,'accept':'application/json',...(options.body?{'content-type':'application/json'}:{}),...options.headers},
  });
  if(!response.ok)throw new Error(`Changedetection.io API ${options.method||'GET'} ${path} failed (HTTP ${response.status}).`);
  if(response.status===204)return null;
  const text=await response.text();
  if(!text)return null;
  try{return JSON.parse(text);}catch{if((options.method||'GET')!=='GET')return text;throw new Error(`Changedetection.io API ${options.method||'GET'} ${path} returned invalid JSON.`);}
}

function listRows(payload,kind){
  const entries=Array.isArray(payload)?payload.map(row=>[null,row]):Object.entries(payload||{});
  if(!payload||typeof payload!=='object'||entries.some(([,row])=>!row||typeof row!=='object'||Array.isArray(row))){
    throw new Error(`Changedetection.io returned an unexpected ${kind} list.`);
  }
  return entries.map(([key,row])=>({...row,uuid:key||row.uuid}));
}

function hasReviewInterval(watch){
  if(watch.time_between_check_use_default!==false)return false;
  const interval=watch.time_between_check;
  if(!interval||typeof interval!=='object')return false;
  const units=Object.entries(SECONDS_PER_UNIT);
  if(units.some(([unit])=>interval[unit]!=null&&(!Number.isInteger(interval[unit])||interval[unit]<0)))return false;
  return units.reduce((seconds,[unit,multiplier])=>seconds+(interval[unit]??0)*multiplier,0)===REVIEW_INTERVAL_SECONDS;
}

function changedWithinReviewWindow(watch,now){
  const raw=watch.last_changed;
  const timestamp=typeof raw==='number'?raw:Number(raw);
  const current=Math.floor(now.getTime()/1000);
  return Number.isFinite(timestamp)&&timestamp>0&&timestamp>=current-REVIEW_INTERVAL_SECONDS&&timestamp<=current;
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
  const watches=listRows(watchPayload,'watch');
  const tags=listRows(tagPayload,'tag');
  let tag=tags.find(item=>String(item.title||'').toLocaleLowerCase()===TAG_TITLE.toLocaleLowerCase());
  if(!tag){
    const created=await request(api,apiKey,fetchImpl,'/tag',{method:'POST',body:JSON.stringify({title:TAG_TITLE})});
    if(!created?.uuid)throw new Error('Changedetection.io created a tag without returning its UUID.');
    tag={uuid:created.uuid,title:TAG_TITLE};
  }

  if(typeof tag.uuid!=='string'||!tag.uuid)throw new Error('Changedetection.io did not return a tag UUID.');
  const watchTags=watch=>Array.isArray(watch.tags)?watch.tags:[];
  const isManaged=watch=>watchTags(watch).includes(tag.uuid);
  const byUrl=new Map();
  for(const watch of watches){
    if(!resources.has(watch.url))continue;
    const previous=byUrl.get(watch.url);
    if(!previous||(!isManaged(previous)&&isManaged(watch)))byUrl.set(watch.url,watch);
  }
  const managed=[...byUrl.values()].filter(isManaged);
  for(const watch of byUrl.values()){
    if(typeof watch.uuid!=='string'||!watch.uuid)throw new Error('A matching existing watch did not include its UUID.');
  }

  // The list endpoint omits the interval. Read individual settings before updating, in small groups.
  const details=new Map();
  for(let i=0;i<managed.length;i+=6){
    const batch=managed.slice(i,i+6);
    await Promise.all(batch.map(async watch=>{
      const info='time_between_check_use_default' in watch&&'time_between_check' in watch
        ?watch
        :await request(api,apiKey,fetchImpl,'/watch/'+encodeURIComponent(watch.uuid));
      if(!info||typeof info!=='object'||Array.isArray(info))throw new Error('Changedetection.io returned invalid watch settings.');
      details.set(watch.uuid,info);
    }));
  }

  const intervalSettings={time_between_check:REVIEW_INTERVAL,time_between_check_use_default:false};
  const stats={catalogueResources:records.length,uniqueUrls:resources.size,skippedNonHttps,created:0,adopted:0,alreadyManaged:0,intervalsUpdated:0,changed:[]};
  for(const [url,record] of resources){
    const existing=byUrl.get(url);
    if(existing){
      const watchPath='/watch/'+encodeURIComponent(existing.uuid);
      if(isManaged(existing)){
        stats.alreadyManaged++;
        if(!hasReviewInterval(details.get(existing.uuid))){
          await request(api,apiKey,fetchImpl,watchPath,{method:'PUT',body:JSON.stringify(intervalSettings)});
          stats.intervalsUpdated++;
        }
      }else{
        const updatedTags=[...new Set([...watchTags(existing),tag.uuid])];
        await request(api,apiKey,fetchImpl,watchPath,{method:'PUT',body:JSON.stringify({tags:updatedTags,...intervalSettings})});
        stats.adopted++;
      }
      if(changedWithinReviewWindow(existing,now))stats.changed.push({title:record.name,url});
      continue;
    }
    await request(api,apiKey,fetchImpl,'/watch',{
      method:'POST',body:JSON.stringify({
        url,title:record.name,tags:[tag.uuid],...intervalSettings,notification_muted:true,
      }),
    });
    stats.created++;
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
    `- Existing schedules corrected: ${stats.intervalsUpdated}`,
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
