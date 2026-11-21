import {replaceGeneratedSection} from './generated-section.mjs';
import {siteHeader,siteHeaderAssets} from './site-header.mjs';
import {supportButton} from './site-footer.mjs';
import {createHash} from 'node:crypto';
import {buildWorkflowPages} from './workflow-pages.mjs';
import {resourceView,structuredResource} from '../site/resource-view.mjs';
import {browseEntry} from './browse-index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TASKS,FORMAT_LABELS} from '../site/model.mjs';
import {loadCanonicalResources,toSiteEntry} from './canonical-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const plain=s=>s.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]*>/g,'').replace(/\*\*/g,'').trim();
const safeUrl=u=>{try{return new URL(u).protocol==='https:';}catch{return false;}};
const xmlEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const htmlEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const sourceLink=(url,label,creatorId,placement)=>`<a href="${htmlEscape(url)}"${creatorId ? ` data-analytics-event="creator_outbound_click" data-analytics-id="${htmlEscape(creatorId)}" data-analytics-placement="${placement}"` : ''}>${htmlEscape(label)} <span aria-hidden="true">↗</span></a>`;
const creatorLinks=(creator,placement)=>{
 const links=new Map();
 for(const [url,label] of [[creator.channel,/youtube\.com|youtu\.be/.test(creator.channel||'')?'Channel':'Website'],[creator.website,'Website'],[creator.evidence,'Evidence']])if(url&&!links.has(url))links.set(url,label);
 return [...links].map(([url,label])=>sourceLink(url,label,placement&&label!=='Evidence'?creator.id:null,placement)).join(' · ');
};

const htmlList=values=>Array.isArray(values)&&values.length?values.map(value=>`<li>${htmlEscape(value)}</li>`).join(''):'<li>Not established</li>';
const analyticsTag=(prefix='')=>`<script type="module" src="${prefix}analytics.mjs?v=1"></script>`;
function staticResourcePage(entry,entries){
 const url='https://subtlesayak.github.io/open-resolve-list/resource/'+encodeURIComponent(entry.id)+'/';
 const jsonLd=JSON.stringify(structuredResource(entry,url)).replaceAll('<','\\u003c');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${htmlEscape(entry.description)}"><link rel="canonical" href="${url}"><title>${htmlEscape(entry.name)} — Open Resolve List</title>${siteHeaderAssets('../../')}<script type="application/ld+json">${jsonLd}</script>${analyticsTag('../../')}<script type="module" src="../../table-scroll.mjs?v=1"></script></head><body><a class="skip" href="#resource">Skip to resource</a>${siteHeader('../../','')}<main class="resource-page"><p><a href="../../">← Back to catalogue</a></p><article id="resource" tabindex="-1">${resourceView(entry,entries)}</article></main><footer class="site-footer">${supportButton('../../')}</footer></body></html>\n`;
}
function staticDirectory(resources){
 const groups=new Map(),nameCounts=new Map();for(const entry of resources){if(!groups.has(entry.category))groups.set(entry.category,[]);groups.get(entry.category).push(entry);const key=entry.name.trim().toLocaleLowerCase();nameCounts.set(key,(nameCounts.get(key)||0)+1);}
 const sections=[...groups].map(([category,entries])=>`<section><h2>${htmlEscape(category)}</h2><ul>${entries.sort((a,b)=>a.name.localeCompare(b.name)).map(entry=>{const duplicate=nameCounts.get(entry.name.trim().toLocaleLowerCase())>1;const identifier=duplicate?` <span class="directory-identifier">(${htmlEscape(entry.creator||entry.id)})</span>`:'';return `<li><a href="resource/${encodeURIComponent(entry.id)}/">${htmlEscape(entry.name)}</a>${identifier} — ${htmlEscape(entry.description)}</li>`;}).join('\n')}</ul></section>`).join('\n');
 const taskLabels={captions:'Captions & dialogue',color:'Color & film looks',fusion:'Fusion & animation',workflow:'Workflow & automation',media:'Media & delivery',audio:'Audio',development:'Development',learning:'Learning & references',hardware:'Hardware',linux:'Linux setup'};
 const taskCards=Object.entries(taskLabels).map(([id,label])=>{const count=resources.filter(entry=>entry.tasks.includes(id)).length;return `<a class="browse-card" href="./?task=${id}"><strong>${htmlEscape(label)}</strong><span>${count} resources</span></a>`;}).join('');
 const formatCounts=new Map(resources.map(entry=>[entry.kind,(resources.filter(item=>item.kind===entry.kind).length)]));
 const formatCards=[...formatCounts].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([kind,count])=>`<a class="browse-chip" href="./?kind=${encodeURIComponent(kind)}">${htmlEscape(FORMAT_LABELS[kind]||kind)} · ${count}</a>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DaVinci Resolve Plugins and Fusion Tools Directory | Open Resolve List</title><meta name="description" content="Browse free and paid DaVinci Resolve plugins, DCTLs, LUTs, Fusion tools, scripts and templates by category, with creator links and compatibility evidence."><link rel="canonical" href="https://subtlesayak.github.io/open-resolve-list/directory.html">${siteHeaderAssets('')}${analyticsTag()}</head><body>${siteHeader('','')}<main><h1>DaVinci Resolve plugins and Fusion tools directory</h1><p>Browse ${resources.length} resources by task, format or category. Listings include free and paid tools; check each resource for platform and Resolve Free or Studio requirements.</p><p><a href="./">Search, filter and compare tools</a></p><section class="browse-discovery"><h2>Browse by what you want to do</h2><div class="browse-grid">${taskCards}</div></section><section class="browse-discovery"><h2>Browse by format</h2><div class="browse-chips">${formatCards}</div></section>${sections}</main><footer class="site-footer">${supportButton()}</footer></body></html>\n`;
}
function staticCreators(creators){
 const topicPatterns={Editing:/edit/i,Fusion:/fusion/i,Color:/color|grading|colour|look/i,Scripting:/script|python|dctl|automation/i,VFX:/vfx|composit/i,Training:/training|course|masterclass/i};
 const records=creators.map(creator=>{
  const topics=creator.guide?.topics||Object.entries(topicPatterns)
   .filter(([,pattern])=>pattern.test(`${creator.name} ${creator.focus}`)).map(([label])=>label);
  return {...creator,topics};
 });
 const topics=[...new Set(records.flatMap(creator=>creator.topics))].sort();
 const topicChip=(topic,label,pressed=false)=>`<button type="button" class="topic-chip" data-topic="${htmlEscape(topic)}" aria-pressed="${pressed}"><span class="topic-check" aria-hidden="true">✓</span>${htmlEscape(label)}</button>`;
 const chips=[topicChip('','All topics',true),...topics.map(topic=>topicChip(topic,topic))].join('');
 const card=creator=>{
  const initials=creator.name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase();
  const topicText=creator.topics.join(' · ');
  const example=creator.kind==='tool-creator'?creator.resources[0]:null;
  const summary=example?`<a href="resource/${encodeURIComponent(example.id)}/">${htmlEscape(example.name)}</a>`:htmlEscape(creator.focus);
  const details=[topicText,creator.guide?'Learning guide':'',creator.resourceCount?`${creator.resourceCount} catalogue resource${creator.resourceCount===1?'':'s'}`:''].filter(Boolean);
  return `<article class="creator-card" data-topics="${htmlEscape(creator.topics.join('|'))}"><div class="creator-avatar" aria-hidden="true">${htmlEscape(initials)}</div><div class="creator-card-body"><h3><a href="creator/${encodeURIComponent(creator.id)}/">${htmlEscape(creator.name)}</a></h3><p>${summary}</p>${details.length?`<p class="creator-meta">${htmlEscape(details.join(' · '))}</p>`:''}<p class="source-link">${creatorLinks(creator,'creator_directory')}</p></div></article>`;
 };
 const official=records.filter(creator=>creator.kind==='official-training').map(card).join('\n');
 const educators=records.filter(creator=>creator.kind==='educator').map(card).join('\n');
 const tools=records.filter(creator=>creator.kind==='tool-creator').map(card).join('\n');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Resolve creators, educators and official Blackmagic Design training resources for editing, Fusion, color and post-production workflows."><link rel="canonical" href="https://subtlesayak.github.io/open-resolve-list/creators.html"><title>DaVinci Resolve creators and educators | Open Resolve List</title>${siteHeaderAssets('')}<script type="module" src="creators.mjs?v=3"></script>${analyticsTag()}</head><body><a class="skip" href="#main-content">Skip to content</a>${siteHeader('','creators')}<main id="main-content" class="information-page" tabindex="-1"><h1>Resolve creators and educators</h1><p class="lede">Public channels, educator sites and training providers for learning Resolve, Fusion, color and workflow automation. Visit each source for its current material and terms.</p><section class="creator-tools" aria-label="Find creators"><label for="creator-search">Search creators and topics</label><input id="creator-search" type="search" placeholder="Search editing, Fusion, color…"><div class="topic-chips" role="group" aria-label="Filter by topic">${chips}</div><p id="creator-count" class="muted" role="status">${records.length} directory entries</p></section><section class="creator-group" data-group="official" aria-labelledby="official-heading"><h2 id="official-heading">Official Blackmagic Design training</h2><div class="creator-grid" aria-label="Official Blackmagic Design training">${official}</div></section><section class="creator-group" data-group="educators" aria-labelledby="educators-heading"><h2 id="educators-heading">Educators and YouTube creators</h2><div class="creator-grid" aria-label="Educators and YouTube creators">${educators}</div></section><section class="creator-group" data-group="tools" aria-labelledby="tools-heading"><h2 id="tools-heading">Tool creators</h2><div class="creator-grid" aria-label="Tool creators">${tools}</div></section><p id="creator-empty" class="empty-state" hidden>No creators or training sources match that search. Try another topic.</p></main><footer class="site-footer" aria-label="Site information">${supportButton()}<p class="footer-credit">© 2026 <a href="https://subtlesayak.github.io/">Subtle Sayak ↗</a></p><a class="footer-email" href="mailto:subtlesayak@gmail.com">subtlesayak@gmail.com</a><a class="footer-license" href="https://github.com/subtlesayak/open-resolve-list/blob/main/NOTICE.md">CC0 · Licensing &amp; credits</a></footer></body></html>\\n`;
}
function staticCreatorPage(creator){
 const {resources,guide}=creator;
 const lessons=guide?guide.links.map(item=>{
  const source=item.source===item.url?'':`${sourceLink(item.source,'Source')} · `;
  return `<li><h3>${sourceLink(item.url,item.title,creator.id,'creator_profile')}</h3><p>${htmlEscape(item.description)}</p><p class="muted">${source}Checked ${htmlEscape(item.checked_at)}</p></li>`;
 }).join(''):'';
 const learning=guide?`<p>Topics: ${guide.topics.map(htmlEscape).join(' · ')}</p><ul>${lessons}</ul>`:
  `<p>${sourceLink(creator.channel,'Browse lessons from '+creator.name,creator.id,'creator_profile')}</p>`;
 const list=resources.map(entry=>`<li><a href="../../resource/${encodeURIComponent(entry.id)}/">${htmlEscape(entry.name)}</a><span class="muted"> · ${htmlEscape(FORMAT_LABELS[entry.kind]||entry.category||'Resolve resource')}</span></li>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${htmlEscape(creator.name)} Resolve resources, tutorials and creator links in Open Resolve List."><link rel="canonical" href="https://subtlesayak.github.io/open-resolve-list/creator/${encodeURIComponent(creator.id)}/"><title>${htmlEscape(creator.name)} — Open Resolve List</title>${siteHeaderAssets('../../')}${analyticsTag('../../')}</head><body><a class="skip" href="#main-content">Skip to content</a>${siteHeader('../../','')}<main id="main-content" class="information-page" tabindex="-1"><p><a href="../../creators.html">← All creators</a></p><h1>${htmlEscape(creator.name)}</h1>${creator.focus?`<p class="lede">${htmlEscape(creator.focus)}</p>`:''}<p class="source-link">${creatorLinks(creator,'creator_profile')}</p>${creator.kind!=='tool-creator'||guide?`<section><h2>Learning topics and lessons</h2>${learning}</section>`:''}${list?`<section><h2>Catalogue resources</h2><ul>${list}</ul></section>`:''}<section><h2>Source and verification</h2><p>${sourceLink(creator.evidence,'Evidence source')}</p><p class="muted">This directory links public creator sources and catalogue records. It is a discovery guide, not an endorsement.</p></section></main><footer class="site-footer" aria-label="Site information">${supportButton('../../')}<p class="footer-credit">© 2026 <a href="https://subtlesayak.github.io/">Subtle Sayak ↗</a></p><a class="footer-email" href="mailto:subtlesayak@gmail.com">subtlesayak@gmail.com</a><a class="footer-license" href="https://github.com/subtlesayak/open-resolve-list/blob/main/NOTICE.md">CC0 · Licensing &amp; credits</a></footer></body></html>\n`;
}
function refreshSiteHeaders() {
 for (const [file, current] of [['index.html','browse'],['about.html','about'],['updates.html','updates'],['resource.html','']]) {
  const target = path.join(root, 'site', file);
  const source = fs.readFileSync(target, 'utf8');
  const markup = replaceGeneratedSection(source, '<!-- site-header:start -->', '<!-- site-header:end -->', siteHeader('', current));
  const assets = current === 'browse' ? siteHeaderAssets('', 38) : siteHeaderAssets();
  const next = replaceGeneratedSection(markup, '<!-- site-header-assets:start -->', '<!-- site-header-assets:end -->', assets);
  if (next !== source) fs.writeFileSync(target, next);
 }
}
export function buildSite(){
 refreshSiteHeaders();
 const canonicalRecords=loadCanonicalResources(root);
 const entries=canonicalRecords.map(toSiteEntry);
 const previews=read('data/previews.json').previews;
 for(const preview of previews){const entry=entries.find(e=>e.id===preview.resource_id);if(!entry||!/^[-a-z0-9]+\.svg$/.test(preview.file)||!preview.permission||!preview.color_context)throw Error('Invalid preview record');entry.preview=preview;}
 const complements=read('data/relationships.json').complements;
 for(const relation of complements){const from=entries.find(e=>e.id===relation.from),to=entries.find(e=>e.id===relation.to);if(!from||!to||!relation.reason||!relation.sources?.length)throw Error('Invalid complementary relationship');(from.worksTogether||=[]).push({...relation,resourceId:to.id,name:to.name});(to.worksTogether||=[]).push({...relation,resourceId:from.id,name:from.name});}
 const history={entries:entries.flatMap(entry=>entry.history.map(change=>({...change,name:change.name||entry.name,url:change.url||entry.url})))};
 const releases=read('data/catalogue-releases.json').releases;
 for(const entry of entries) entry.catalogueReleases=releases.filter(release=>release.body?.includes(entry.url)).map(release=>({version:release.version,url:release.url}));
 const latestUpdate=read('data/latest-update.json');
 const creators=read('data/youtube-creators.json');
 const training=read('data/training-providers.json');
 if(new Set(latestUpdate.added_urls).size!==latestUpdate.added_urls.length||latestUpdate.added_urls.some(url=>!entries.some(e=>e.url===url))||!releases.some(r=>r.version===latestUpdate.release))throw Error('Invalid latest update');
 const inventory=JSON.parse(fs.readFileSync(path.join(root,'data/reactor-inventory.json'),'utf8'));
 const data={latestUpdate:{...latestUpdate,addedCount:latestUpdate.added_urls.length},schema_version:1,title:'Open Resolve List',tagline:'The open Resolve ecosystem database.',description:'Curated, source-backed DaVinci Resolve and Fusion tools with compatibility evidence, version tracking and clear uncertainty.',catalogue:'https://github.com/subtlesayak/open-resolve-list',tasks:TASKS,entries,releases,updates:history.entries,inventoryCount:inventory.folder_count};
 const educatorRecords=creators.creators.map(creator=>{const id=creator.id||creator.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const linked=entries.filter(entry=>entry.creator===creator.name);return {...creator,id,kind:'educator',resources:linked,resourceCount:linked.length};});
 const educatorNames=new Set(educatorRecords.map(creator=>creator.name.toLowerCase()));
 const toolGroups=new Map();for(const entry of entries){if(!entry.creator||educatorNames.has(entry.creator.toLowerCase()))continue;const group=toolGroups.get(entry.creator)||{name:entry.creator,resources:[]};group.resources.push(entry);toolGroups.set(entry.creator,group);}
 const toolRecords=[...toolGroups.values()].map(group=>{const first=group.resources[0];const id=group.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return {id,name:group.name,channel:first.url,website:first.url,evidence:first.evidence?.[0]?.source||first.url,focus:'',kind:'tool-creator',resources:group.resources,resourceCount:group.resources.length};});
 const trainingRecords=training.providers.map(provider=>({...provider,kind:'official-training',id:provider.id||provider.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),resources:[],resourceCount:0}));
 const creatorRecords=[...trainingRecords,...educatorRecords,...toolRecords];
 const aboutPage=path.join(root,'site/about.html');
 const aboutMarkup=fs.readFileSync(aboutPage,'utf8');
 const formatCount=new Set(entries.map(entry=>entry.kind)).size;
 const scale=`${entries.length} resources · ${creatorRecords.length} creator and training profiles · ${formatCount} formats`;
 const updatedAbout=replaceGeneratedSection(aboutMarkup,'<!-- catalogue-scale:start -->','<!-- catalogue-scale:end -->',
  `<p class="site-stats" id="site-stats" aria-label="Catalogue scale">${scale}</p>`);
 if(updatedAbout!==aboutMarkup)fs.writeFileSync(aboutPage,updatedAbout);
 for(const guide of read('data/creator-guides.json').guides){const creator=creatorRecords.find(c=>c.id===guide.creator_id);if(!creator||!guide.links?.length||!guide.links.every(link=>safeUrl(link.url)&&safeUrl(link.source)&&/^\d{4}-\d{2}-\d{2}$/.test(link.checked_at)))throw Error('Invalid creator learning guide: '+guide.creator_id);creator.guide=guide;}
 fs.writeFileSync(path.join(root,'site/analytics-ids.mjs'),'export const resourceIds='+JSON.stringify(entries.map(e=>e.id))+';\nexport const creatorIds='+JSON.stringify(creatorRecords.map(c=>c.id))+';\n');
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
 fs.writeFileSync(path.join(root,'site/latest-update.json'),JSON.stringify({latestUpdate:data.latestUpdate})+'\n');
 const browsePayload=JSON.stringify({schema_version:1,title:data.title,catalogue:data.catalogue,latestUpdate:data.latestUpdate,entries:entries.map(browseEntry)})+'\n';
 fs.writeFileSync(path.join(root,'site/catalogue-index.json'),browsePayload);
 fs.writeFileSync(path.join(root,'site/catalogue-version.mjs'),'export const catalogueVersion='+JSON.stringify(createHash('sha256').update(browsePayload).digest('hex').slice(0,16))+';\n');
 fs.writeFileSync(path.join(root,'site/catalogue.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(root,'site/resources.json'),JSON.stringify(feed,null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'resources.json'),JSON.stringify(api,null,2)+'\n');
 for(const entry of entries)fs.writeFileSync(path.join(resourceApiRoot,entry.id+'.json'),JSON.stringify({schema_version:1,resource:entry},null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'categories.json'),JSON.stringify({schema_version:1,categories},null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'tasks.json'),JSON.stringify({schema_version:1,tasks},null,2)+'\n');
 fs.writeFileSync(path.join(apiRoot,'releases.json'),JSON.stringify({schema_version:1,releases:apiReleases},null,2)+'\n');
 const items=[...releases].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||b.version.localeCompare(a.version,undefined,{numeric:true})).slice(0,50).map(release=>{
  const description=String(release.body).replace(/\r\n?/g,'\n');
  return `<item><title>${xmlEscape(release.title)}</title><link>${xmlEscape(release.url)}</link><guid isPermaLink="true">${xmlEscape(release.url)}</guid><pubDate>${new Date(release.date).toUTCString()}</pubDate><description>${xmlEscape(description)}</description></item>`;
 }).join('');
 fs.writeFileSync(path.join(root,'site/feed.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Open Resolve List — new tools and updates</title><link>https://subtlesayak.github.io/open-resolve-list/</link><description>New catalogue additions and recorded provider updates, grouped by catalogue release.</description>${items}</channel></rss>\n`);
 const resourceRoot=path.join(root,'site/resource');
 fs.mkdirSync(resourceRoot,{recursive:true});
 for(const entry of entries){const directory=path.join(resourceRoot,entry.id);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'index.html'),staticResourcePage(entry,entries));}
 const workflowRoutes=buildWorkflowPages(root,entries);
 const siteBase='https://subtlesayak.github.io/open-resolve-list/';
 fs.writeFileSync(path.join(root,'site/directory.html'),staticDirectory(resources));
 fs.writeFileSync(path.join(root,'site/creators.html'),staticCreators(creatorRecords));
 const creatorRoot=path.join(root,'site/creator');fs.mkdirSync(creatorRoot,{recursive:true});for(const creator of creatorRecords){const directory=path.join(creatorRoot,creator.id);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'index.html'),staticCreatorPage(creator));}
 const sitemap=[`<?xml version="1.0" encoding="UTF-8"?>`,`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,`<url><loc>${siteBase}</loc></url>`,`<url><loc>${siteBase}directory.html</loc></url>`,`<url><loc>${siteBase}creators.html</loc></url>`,`<url><loc>${siteBase}about.html</loc></url>`,`<url><loc>${siteBase}updates.html</loc></url>`,...resources.map(entry=>`<url><loc>${siteBase}resource/${xmlEscape(entry.id)}/</loc></url>`),'</urlset>'].join('');
 fs.writeFileSync(path.join(root,'site/sitemap.xml'),sitemap.replace('</urlset>',workflowRoutes.map(route=>`<url><loc>${siteBase}${route}</loc></url>`).join('')+creatorRecords.map(creator=>`<url><loc>${siteBase}creator/${xmlEscape(creator.id)}/</loc></url>`).join('')+'</urlset>')+'\n');
 fs.writeFileSync(path.join(root,'site/robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+siteBase+'sitemap.xml\n');
 console.log(`Built searchable site data for ${entries.length} resources; ${entries.filter(e=>e.evidence.length).length} records with evidence.`);return data;
}

function releasesForApi(releases){return releases.map(release=>({version:release.version,date:release.date,source:release.url}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildSite();
