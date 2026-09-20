import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export function maintenanceFindings(records,captures){
 const findings=[],byUrl=new Map(records.map(r=>[r.urls.canonical,r]));
 const add=(record,type,before,after,source)=>findings.push({id:record?.id||null,name:record?.name||'Source check',type,before,after,source});
 for(const check of captures.github||[]){
  const record=byUrl.get(check.requested_url);if(!record)continue;
  if(!check.data){add(record,'Manual review','Available listing','Repository inaccessible',record.urls.canonical);continue;}
  const repo=check.data;
  if(repo.isArchived)add(record,'Repository archived','Maintained listing','Upstream repository is archived',repo.url);
  if(repo.url&&repo.url!==record.urls.canonical)add(record,'URL redirected',record.urls.canonical,repo.url,repo.url);
  const release=repo.latestRelease||repo.releases?.nodes?.[0],commit=repo.defaultBranchRef?.target;
  const version=release?.tagName||(record.version.kind==='commit'?commit?.oid:null);
  if(version&&version!==record.version.version)add(record,release?'Release candidate':'Revision candidate',record.version.version||'Not established',version,release?.url||commit?.url||repo.url);
 }
 for(const check of captures.external||[]){
  const record=byUrl.get(check.url);if(!record)continue;
  if([404,410].includes(check.http_status)){add(record,'Broken source','Maintained URL','HTTP '+check.http_status,check.url);continue;}
  if(check.final_url&&check.final_url.replace(/\/$/,'')!==check.url.replace(/\/$/,''))add(record,'URL redirected',check.url,check.final_url,check.final_url);
  const version=check.product_metadata?.version;
  if(version&&version!==record.version.version)add(record,'Provider version candidate',record.version.version||'Not established',version,check.final_url||check.url);
  else if(check.status!=='retrieved')add(record,'Manual review',record.version.version||'Not established',check.status||'Unknown fetch outcome',check.url);
  else if(!version)add(record,'Manual review',record.version.version||'Not established','Page retrieved; no comparable numeric version extracted',check.url);
 }
 return findings;
}
const clean=value=>String(value??'—').replace(/[\r\n|<>]/g,' ').replace(/[\[\]]/g,'');
export function renderSummary(records,captures){
 const findings=maintenanceFindings(records,captures),lines=['## Catalogue maintenance review','','Candidates require original-source review before changing catalogue facts.',''];
 for(const name of ['github','github-changelogs','external'])if(!captures[name])lines.push(`**Incomplete check:** ${name} output was not produced.`);
 lines.push('','| Resource | Review reason | Recorded | Observed | Source |','| --- | --- | --- | --- | --- |');
 for(const f of findings)lines.push(`| ${clean(f.name)} | ${clean(f.type)} | ${clean(f.before)} | ${clean(f.after)} | ${/^https:\/\//.test(f.source||'')?'[Source]('+encodeURI(f.source).replace(/[()]/g,c=>'%'+c.charCodeAt(0).toString(16))+')':'Unavailable'} |`);
 if(!findings.length)lines.push('| — | No comparable changes detected in available checks | — | — | — |');
 lines.push('','### Check coverage');
 for(const [name,items]of Object.entries(captures)){
  const counts={};for(const item of items){const state=item.status||(name==='github-changelogs'?(item.text?'retrieved':'unavailable'):'unknown');counts[state]=(counts[state]||0)+1;}
  lines.push(`- ${name}: ${items.length} records; ${Object.entries(counts).map(([key,count])=>clean(key)+': '+count).join(', ')}`);
 }
 lines.push('','This automated provider check is not a full discovery-source review. Raw captures remain local to the runner; no catalogue records are changed.');
 return lines.join('\n')+'\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=path.join(root,'.research/update-check'),captures={};
 for(const name of ['github','github-changelogs','external']){const file=path.join(dir,name+'.json');if(fs.existsSync(file))captures[name]=JSON.parse(fs.readFileSync(file,'utf8'));}
 console.log(renderSummary(loadCanonicalResources(root),captures));
}
