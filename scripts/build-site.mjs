import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseCsv,parseExternalResources,isOfficialResource} from './build-catalogue.mjs';
import {TASKS} from '../site/model.mjs';
import {loadCanonicalResources,toSiteEntry} from './canonical-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const plain=s=>s.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]*>/g,'').replace(/\*\*/g,'').trim();
const safeUrl=u=>{try{return new URL(u).protocol==='https:';}catch{return false;}};
const xmlEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const htmlEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const htmlList=values=>Array.isArray(values)&&values.length?values.map(value=>`<li>${htmlEscape(value)}</li>`).join(''):'<li>Not established</li>';
function staticResourcePage(entry){
 const requirements=entry.requirements||{},version=entry.version||{},evidence=entry.evidence||[];
 const versionText=version.version||version.kind||'Not established';
 const original=safeUrl(entry.url)?`<a href="${htmlEscape(entry.url)}">Open original resource ↗</a>`:'Original resource unavailable';
 const evidenceItems=evidence.length?evidence.map(item=>`<li><strong>${htmlEscape(item.level)}</strong> — ${htmlEscape(item.field)} · <a href="${htmlEscape(item.source)}">Source</a>${item.note?`<br>${htmlEscape(item.note)}`:''}</li>`).join(''):'<li>No field-level evidence recorded.</li>';
 const jsonLd=JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication",name:entry.name,description:entry.description,url:entry.url,applicationCategory:entry.category}).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
 return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="${htmlEscape(entry.description)}"><link rel="canonical" href="https://subtlesayak.github.io/open-resolve-list/resource/${encodeURIComponent(entry.id)}/">\n<title>${htmlEscape(entry.name)} — Open Resolve List</title><link rel="stylesheet" href="../../style.css?v=24"><script type="application/ld+json">${jsonLd}</script></head>\n<body><header><a class="brand" href="../../">Open Resolve List</a><nav aria-label="Main"><a href="../../">Catalogue</a><a href="../../updates.html">Updates</a><a href="../../about.html">About</a></nav></header>\n<main><p><a href="../../">← Back to catalogue</a></p><article><p class="eyebrow">${htmlEscape(entry.category)}</p><h1>${htmlEscape(entry.name)}</h1><p class="lede">${htmlEscape(entry.description)}</p><p>${original}</p><dl class="facts"><dt>Creator</dt><dd>${htmlEscape(entry.creator)}</dd><dt>Format</dt><dd>${htmlEscape(entry.kind)}</dd><dt>Access</dt><dd>${htmlEscape(entry.access)}</dd><dt>Platforms</dt><dd>${htmlEscape((entry.platforms||[]).join(' · ')||'Not established')}</dd><dt>Resolve edition</dt><dd>${htmlEscape((requirements.editions||[]).join(' · ')||'Not established')}</dd><dt>Tool version</dt><dd>${htmlEscape(versionText)}</dd></dl><h2>Tasks</h2><ul>${htmlList(entry.tasks)}</ul><h2>Evidence</h2><p>${evidence.length} field-level source record${evidence.length===1?'':'s'}.</p><ul>${evidenceItems}</ul><p class="muted">This page reports maintained source evidence; it does not imply blanket compatibility or installation testing.</p></article></main><footer class="site-footer"><p>Source-backed catalogue maintained locally.</p></footer></body></html>\n`;
}
function staticDirectory(resources){
 const groups=new Map();for(const entry of resources){if(!groups.has(entry.category))groups.set(entry.category,[]);groups.get(entry.category).push(entry);}
 const sections=[...groups].map(([category,entries])=>`<section><h2>${htmlEscape(category)}</h2><ul>${entries.sort((a,b)=>a.name.localeCompare(b.name)).map(entry=>`<li><a href="resource/${encodeURIComponent(entry.id)}/">${htmlEscape(entry.name)}</a> — ${htmlEscape(entry.description)}</li>`).join('\n')}</ul></section>`).join('\n');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DaVinci Resolve Plugins and Fusion Tools Directory | Open Resolve List</title><meta name="description" content="Browse free and paid DaVinci Resolve plugins, DCTLs, LUTs, Fusion tools, scripts and templates by category, with creator links and compatibility evidence."><link rel="canonical" href="https://subtlesayak.github.io/open-resolve-list/directory.html"><link rel="stylesheet" href="style.css?v=27"></head><body><header><a class="brand" href="./">Open Resolve List</a><nav aria-label="Main"><a href="./">Search and filters</a><a href="updates.html">Updates</a><a href="about.html">About</a></nav></header><main><h1>DaVinci Resolve plugins and Fusion tools directory</h1><p>Browse ${resources.length} resources by category: plugins, DCTLs, LUTs, PowerGrades, scripts, templates and workflow utilities. Listings include free and paid tools; check each resource for platform and Resolve Free or Studio requirements.</p><p><a href="./">Search, filter and compare tools</a></p>${sections}</main></body></html>\n`;
}
export function buildSite(){
 const canonicalRecords=fs.existsSync(path.join(root,'data/resources/index.json'))?loadCanonicalResources(root):null;
 const csv=parseCsv(fs.readFileSync(path.join(root,'data/repositories.csv'),'utf8')),md=fs.readFileSync(path.join(root,'data/external-tools.md'),'utf8'),external=parseExternalResources(md);
 const versions=new Map(read('data/versions.json').entries.map(e=>[e.url,e]));
 const details=read('data/resource-details.json'),history=read('data/provider-updates.json');
 const tagData=read('data/search-tags.json'),tagMap=new Map();
 for(const item of tagData.entries){if(tagMap.has(item.url)||!Array.isArray(item.tags)||item.tags.length<2||new Set(item.tags).size!==item.tags.length||item.tags.some(t=>typeof t!=='string'||!t.trim()||t!==t.toLowerCase())||!item.sources?.length||item.sources.some(u=>!safeUrl(u)))throw Error('Invalid search tags '+item.url);tagMap.set(item.url,item.tags);}
 const creators=new Map();let creator=null;for(const line of md.split('\n')){if(/^#{2,3} |^#### Other/.test(line))creator=null;if(/^#### 👤 /.test(line))creator=line.replace(/^#### 👤 /,'').trim();const m=line.match(/^\| \[([^\]]+)\]\((https:[^)]+)\)/);if(m&&creator)creators.set(m[2],creator);}
 const sources=new Map([...read('data/marketplace-discoveries.json').additions,...read('data/community-discoveries.json').additions].map(e=>[e.url,e]));
 const audit=new Map(read('data/update-audit.json').external.map(e=>[e.url,e]));
 const entries=canonicalRecords?canonicalRecords.map(toSiteEntry):[...csv.map(e=>({...e,name:e.repository.split('/')[1],creator:e.repository.split('/')[0],origin:'github'})),...external.map(e=>({...e,creator:creators.get(e.url)||new URL(e.url).hostname.replace(/^www\./,''),origin:'external'}))].map(e=>{
  const v=versions.get(e.url);if(!v)throw Error('Missing version '+e.url);
  const tags=tagMap.get(e.url);if(!tags)throw Error('Missing search tags '+e.url);
  const original=sources.get(e.url)||audit.get(e.url),d=details.entries.find(d=>d.url===e.url);
  const requirements={editions:[],resolve:[],architectures:[],gpu:null,processing:'unknown',pricing:'unknown',account:'unknown',dependencies:null,installation:null,...d?.requirements};
  if(requirements.editions.some(x=>!['Free','Studio'].includes(x))||requirements.architectures.some(x=>!['x64','arm64'].includes(x))||!['unknown','local','cloud','hybrid'].includes(requirements.processing)||!['unknown','free','mixed','one-time','subscription'].includes(requirements.pricing))throw Error('Invalid requirements '+e.url);
  for(const r of requirements.resolve)if((!r.min&&!r.max)||[r.min,r.max].filter(Boolean).some(v=>!/^\d+(\.\d+)*$/.test(v))||(r.edition&&!requirements.editions.includes(r.edition)))throw Error('Invalid Resolve range '+e.url);
  let platforms=e.origin==='github'?e.platforms.split(';').filter(x=>['Windows','macOS','Linux','iPadOS'].includes(x)):[];
  if(e.origin==='external'&&!/❔|📖|per (product|tool|package)|older|version-specific|varies/i.test(e.platforms+' '+e.description))platforms=[['🪟','Windows'],['🍎','macOS'],['🐧','Linux']].filter(([icon])=>e.platforms.includes(icon)).map(([,os])=>os);
  if(d?.platforms)platforms=d.platforms;
  const evidence=[];
  if(platforms.length)evidence.push({field:'platforms',level:'documented',source:e.platform_source||original?.sources?.[0]||e.url,checked_at:e.platform_checked_at||original?.checked_at||v.checked_at,note:'Provider-listed platforms; see limitations and exact builds.'});
  if(v.version)evidence.push({field:v.kind==='commit'?'repository revision':'version',level:'documented',source:v.source,checked_at:v.checked_at,note:v.kind==='commit'?'Source revision, not a software release.':'Recorded version evidence, not installation testing.'});
  if(d)for(const item of d.evidence)evidence.push(item);
  if(evidence.some(x=>!safeUrl(x.source)||!['documented','creator','tested'].includes(x.level)||!x.checked_at))throw Error('Invalid evidence '+e.url);
  const recommended=!!d?.recommendation;
  if(recommended&&(!evidence.some(x=>x.level==='tested')||!d.recommendation.reason||!d.recommendation.tested_setup))throw Error('Recommendation requires reviewed test evidence '+e.url);
  const text=e.category.toLowerCase();let tasks=[];
  for(const [pattern,key]of [[/color|dctl|grade|film looks/,'color'],[/fusion|animation|motion|visual effects/,'fusion'],[/subtit|transcrip|dialogue|caption|editing/,'captions'],[/workflow|script|productivity|automation|ai assistant/,'workflow'],[/encoding|media|deliver|proxy|render|servers/,'media'],[/audio|fairlight/,'audio'],[/develop|scripting reference/,'development'],[/train|learn|reference|director/,'learning'],[/hardware|midi|control surface/,'hardware'],[/linux/,'linux']])if(pattern.test(text))tasks.push(key);
  tasks=d?.tasks||tasks;
  if(tasks.some(t=>!TASKS[t]))throw Error('Unknown task '+e.url);
  const a=e.access.replace(/^[^\p{L}\p{N}]+/u,'');let accessGroup=/mixed|free.*paid|free.*license|basic.*paid|watermark|first 20/i.test(a)?'mixed':/^free\b/i.test(a)?'free':/^paid|license|membership|business-only/i.test(a)?'paid':'public';
  if(d?.accessGroup)accessGroup=d.accessGroup;
  const unknownFields=[...(!platforms.length?['platforms']:[]),...(!requirements.editions.length?['Resolve edition']:[]),...(!requirements.resolve.length?['Resolve version']:[]),...(!requirements.architectures.length?['architecture']:[]),...(requirements.processing==='unknown'?['processing']:[]),...(!v.version&&v.kind!=='not-applicable'?['tool version']:[])];
  return {id:createHash('sha256').update(e.url).digest('hex').slice(0,12),name:e.name,creator:e.creator,url:e.url,origin:e.origin,official:isOfficialResource(e),reference:/Reference|📖/.test(e.platforms),category:plain(e.category),tasks,tags,description:plain(e.description),access:plain(e.access),accessGroup,platforms,platformNotes:plain(e.platform_notes||e.platforms),requirements,evidence,unknownFields,recommended,recommendation:d?.recommendation||null,version:v,releaseDate:['stable-release','prerelease'].includes(v.kind)||['release','devlog'].includes(v.date_kind)?v.date:null,activityDate:e.last_pushed_at||null,stars:e.origin==='github'?Number(e.stars):null,metadataChecked:e.metadata_checked_at||null,history:history.entries.filter(h=>h.url===e.url)};
 });
 for(const url of tagMap.keys())if(!entries.some(e=>e.url===url))throw Error('Orphan search tags '+url);
 for(const d of details.entries)if(!entries.some(e=>e.url===d.url))throw Error('Orphan requirements '+d.url);
 for(const h of history.entries)if(!entries.some(e=>e.url===h.url)||!safeUrl(h.source)||!h.from||!h.to)throw Error('Invalid history');
 const releases=read('data/catalogue-releases.json').releases;
 const latestUpdate=read('data/latest-update.json');
 if(new Set(latestUpdate.added_urls).size!==latestUpdate.added_urls.length||latestUpdate.added_urls.some(url=>!entries.some(e=>e.url===url))||!releases.some(r=>r.version===latestUpdate.release))throw Error('Invalid latest update');
 const inventory=JSON.parse(fs.readFileSync(path.join(root,'data/reactor-inventory.json'),'utf8'));
 const data={latestUpdate:{...latestUpdate,addedCount:latestUpdate.added_urls.length},schema_version:1,title:'Open Resolve List',tagline:'The open Resolve ecosystem database.',description:'Curated, source-backed DaVinci Resolve and Fusion tools with compatibility evidence, version tracking and clear uncertainty.',catalogue:'https://github.com/subtlesayak/open-resolve-list',tasks:TASKS,entries,releases,updates:history.entries,inventoryCount:inventory.folder_count};
 const resources=entries.map(entry=>({id:entry.id,name:entry.name,creator:entry.creator,url:entry.url,category:entry.category,kind:entry.kind,tasks:entry.tasks,description:entry.description,access:entry.access,platforms:entry.platforms,requirements:entry.requirements,version:entry.version,evidence:entry.evidence.map(item=>({field:item.field,level:item.level,source:item.source,checked_at:item.checked_at}))}));
 const feed={schema_version:1,title:data.title,description:data.description,resources};
 const api={schema_version:1,title:data.title,description:data.description,resources};
 const categories=[...new Set(entries.map(entry=>entry.category))].sort((a,b)=>a.localeCompare(b));
 const tasks=Object.entries(TASKS).map(([id,label])=>({id,label,count:entries.filter(entry=>entry.tasks.includes(id)).length}));
 const apiReleases=releasesForApi(data.releases);
 const apiRoot=path.join(root,'site/api/v1');
 fs.mkdirSync(apiRoot,{recursive:true});
 const resourceApiRoot=path.join(apiRoot,'resources');
 fs.mkdirSync(resourceApiRoot,{recursive:true});
 fs.mkdirSync(path.join(root,'site'),{recursive:true});
 fs.writeFileSync(path.join(root,'site/catalogue.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(root,'site/resources.json'),JSON.stringify(feed,null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'resources.json'),JSON.stringify(api,null,2)+'\n');
 for(const entry of entries)fs.writeFileSync(path.join(resourceApiRoot,entry.id+'.json'),JSON.stringify({schema_version:1,resource:entry},null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'categories.json'),JSON.stringify({schema_version:1,categories},null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'tasks.json'),JSON.stringify({schema_version:1,tasks},null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'releases.json'),JSON.stringify({schema_version:1,releases:apiReleases},null,2)+'\n');
 const items=resources.slice(0,50).map(entry=>`<item><title>${xmlEscape(entry.name)}</title><link>${xmlEscape(entry.url)}</link><guid isPermaLink="true">${xmlEscape(entry.url)}</guid><description>${xmlEscape(entry.description)}</description></item>`).join('');
 fs.writeFileSync(path.join(root,'site/feed.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${xmlEscape(data.title)}</title><link>https://subtlesayak.github.io/open-resolve-list/</link><description>${xmlEscape(data.description)}</description>${items}</channel></rss>\n`);
 const resourceRoot=path.join(root,'site/resource');
 fs.mkdirSync(resourceRoot,{recursive:true});
 for(const entry of resources){const directory=path.join(resourceRoot,entry.id);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'index.html'),staticResourcePage(entry));}
 const siteBase='https://subtlesayak.github.io/open-resolve-list/';
 fs.writeFileSync(path.join(root,'site/directory.html'),staticDirectory(resources));
 const sitemap=[`<?xml version="1.0" encoding="UTF-8"?>`,`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,`<url><loc>${siteBase}</loc></url>`,`<url><loc>${siteBase}directory.html</loc></url>`,`<url><loc>${siteBase}about.html</loc></url>`,`<url><loc>${siteBase}updates.html</loc></url>`,...resources.map(entry=>`<url><loc>${siteBase}resource/${xmlEscape(entry.id)}/</loc></url>`),'</urlset>'].join('');
 fs.writeFileSync(path.join(root,'site/sitemap.xml'),sitemap+'\n');
 fs.writeFileSync(path.join(root,'site/robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+siteBase+'sitemap.xml\n');
 console.log(`Built searchable site data for ${entries.length} resources; ${details.entries.length} reviewed requirement records.`);return data;
}

function releasesForApi(releases){return releases.map(release=>({version:release.version,date:release.date,source:release.url}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildSite();
