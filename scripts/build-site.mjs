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
 const data={latestUpdate:{...latestUpdate,addedCount:latestUpdate.added_urls.length},schema_version:1,title:'Subtle Resolve List',tagline:'Find tools for your Resolve setup.',description:'Source-backed compatibility, version history and clear requirements.',catalogue:'https://github.com/subtlesayak/subtle-resolve-list',tasks:TASKS,entries,releases,updates:history.entries,inventoryCount:inventory.folder_count};
 fs.mkdirSync(path.join(root,'site'),{recursive:true});fs.writeFileSync(path.join(root,'site/catalogue.json'),JSON.stringify(data,null,2)+'\n');console.log(`Built searchable site data for ${entries.length} resources; ${details.entries.length} reviewed requirement records.`);return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildSite();
