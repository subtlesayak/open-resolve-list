import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources,toCatalogueEntry} from './canonical-source.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function exportCompatibility(){
 const records=loadCanonicalResources(root),write=(file,value)=>fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
 const policy='Generated from data/resources/*.json. Edit canonical records, then run npm run build.';
 const github=records.filter(r=>r.origin==='github').map(toCatalogueEntry);
 const headers=['category','repository','url','description','access','research_snapshot','platforms','platform_notes','platform_source','platform_checked_at','stars','last_pushed_at','metadata_checked_at'];
 const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
 write('data/repositories.csv',[headers.join(','),...github.map(r=>headers.map(h=>csv(r[h])).join(','))].join('\n')+'\n');
 const cell=value=>String(value??'').replaceAll('|','\\|').replace(/[\r\n]+/g,' ');
 const external=records.filter(r=>r.origin==='external'),groups=new Map();
 for(const r of external){if(!groups.has(r.category))groups.set(r.category,[]);groups.get(r.category).push(r);}
 write('data/external-tools.md','# External resources\n\n'+policy+'\n\n'+[...groups].sort(([a],[b])=>Number(b==='Official Blackmagic Design resources')-Number(a==='Official Blackmagic Design resources')||a.localeCompare(b)).map(([category,members])=>'## '+(category==='Official Blackmagic Design resources'?'🏢 ':category==='Color tools'?'🎨 ':'')+category+'\n\n| Resource | Access | Platforms | Description |\n| :--- | :--- | :--- | :--- |\n'+members.map(r=>{const e=toCatalogueEntry(r);return `\n#### 👤 ${cell(r.creator)}\n\n| [${cell(e.name)}](${e.url}) | ${cell(e.access)} | ${cell(e.platforms)} | ${cell(e.description)} |`;}).join('\n')).join('\n\n')+'\n');
 write('data/versions.json',{schema_version:1,policy,entries:records.map(r=>({...r.version,url:r.urls.canonical}))});
 write('data/search-tags.json',{schema_version:1,policy,reviewed_at:records.map(r=>r.tags_reviewed_at||'').sort().at(-1),entries:records.map(r=>({url:r.urls.canonical,name:r.name,tags:r.tags,sources:r.search_sources||[r.urls.canonical]}))});
 write('data/resource-details.json',{schema_version:1,policy,entries:records.map(r=>({url:r.urls.canonical,requirements:r.requirements,tasks:r.tasks,platforms:r.platforms,accessGroup:r.accessGroup,evidence:r.evidence,...(r.recommendation?{recommendation:r.recommendation}:{})}))});
 write('data/resources/index.json',{schema_version:1,generated_from:'canonical resource files',entries:records.map(({id,name,creator,urls,origin,category,kind})=>({id,name,creator,url:urls.canonical,origin,category,kind}))});
 console.log(`Generated compatibility exports for ${records.length} canonical resources.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))exportCompatibility();
