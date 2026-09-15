import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {relativeDate,isOfficialResource} from './build-catalogue.mjs';
import {validDate} from './update-evidence.mjs';
import {replaceGeneratedSection} from './generated-section.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=s=>String(s??'').replaceAll('|','\\|').replace(/[\r\n]/g,' ').replaceAll('<','&lt;').replaceAll('>','&gt;');
const link=(n,u)=>`[${clean(n)}](${u})`;
export function buildCommunityReport(){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
 const c=JSON.parse(read('data/community-discoveries.json')),r=JSON.parse(read('data/reactor-inventory.json'));
 const age=d=>validDate(d)?`${relativeDate(d+'T00:00:00Z',c.checked_at+'T12:00:00Z')} (${d})`:'Not established';
 const entries=[...c.additions].sort((a,b)=>a.creator.localeCompare(b.creator)||a.name.localeCompare(b.name));
 const tablesFor=items=>[...Map.groupBy(items,e=>e.creator)].flatMap(([creator,items])=>[
  `#### 👤 ${creator}`,'','| Resource | Access | Platforms | Purpose and requirements |','|---|---|---|---|',
  ...items.map(e=>`| ${link(e.name,e.url)} | ${e.access} | ${e.platforms} | ${e.description} |`),'']).join('\n');
 const marker='## 🔎 Community discoveries';
 let directory=read('data/external-tools.md');
 const officialMarker='## 🏢 Official Blackmagic Design resources';
 if(!directory.includes(officialMarker)) directory=directory.replace('## 🎨 Color tools',officialMarker+'\n<!-- end official resources -->\n\n## 🎨 Color tools');
 directory=replaceGeneratedSection(directory,officialMarker,'<!-- end official resources -->','\n'+tablesFor(entries.filter(isOfficialResource))+'\n');
 directory=directory.replace(/\*\*\d+ external destinations\*\*/,`**${c.total_count} external destinations**`).replace('Versions, updates and changelogs for all 72 resources','Earlier update audit: 72 resources');
 directory=directory.replace('The tree returned a loading shell during this pass, so individual package compatibility was not audited.',`The public API inventory contains ${r.folder_count} package folders. See the [package inventory](reactor-inventory.md); compatibility still varies by package.`).replace(/a later API scan retrieved all \d+ manifests/g,`the current API inventory contains ${r.folder_count} package folders`);
 directory=directory.replace('[package inventory](reactor-inventory.md)','[package inventory](https://github.com/subtlesayak/subtle-resolve-list/blob/main/data/reactor-inventory.md)');
 // Keep later products from an existing creator under that creator's heading.
 const placedCreators=new Set();
 for(const [creator,items] of Map.groupBy(entries.filter(e=>!isOfficialResource(e)),e=>e.creator)){
  const heading=`#### 👤 ${creator}\n`,start=directory.indexOf(heading);
  if(start<0||start>=directory.indexOf(marker))continue;
  const open=`<!-- additional entries: ${creator} -->`,close=`<!-- end additional entries: ${creator} -->`;
  if(!directory.includes(open)){
   const bodyStart=start+heading.length,next=directory.slice(bodyStart).search(/^#{2,4} /m);
   const end=next<0?directory.length:bodyStart+next;
   directory=directory.slice(0,end)+open+'\n'+close+'\n\n'+directory.slice(end);
  }
  const table=tablesFor(items).slice(heading.length).trim();
  directory=replaceGeneratedSection(directory,open,close,'\n\n'+table+'\n\n');
  placedCreators.add(creator);
 }
 write('data/external-tools.md',replaceGeneratedSection(directory,marker,'<!-- end community discoveries -->',`\n**${c.added_count} later additions**, including resources grouped under existing creators above, from the [community source data](community-discoveries.json). ${link('Versions and package dates','community-discoveries.json')} are recorded separately from the earlier audit.\n\n`+tablesFor(entries.filter(e=>!isOfficialResource(e)&&!placedCreators.has(e.creator)))));
 const coverage=[
 ['🧩 Reactor / GitLab','https://gitlab.com/WeSuckLess/Reactor/-/tree/master/Atoms',`${r.folder_count} folders enumerated through all API pages; ${r.retrieved_count} manifest records retained. Full inventory published separately; ${entries.filter(e=>e.package_id).length} packages curated.`],
 ['💬 We Suck Less','https://www.steakunderwater.com/wesuckless/viewtopic.php?t=4176','Searched Fuse/release discussions and followed EXRIO and Reactor references. Manifest 0.6 supersedes older ReadEXR thread versions.'],
 ['🎨 Lift Gamma Gain','https://www.liftgammagain.com/forum/','Searched DCTL and development discussions. Followed spektrafilm to its official site; CAS_Sharp, Max Sat and 2499 DRT remain leads.'],
 ['☕ Ko-fi','https://ko-fi.com/davinciresolvetipstricks/shop','Searched creator/product listings; six additions. Deduplicated sh4rk and NxColor storefronts. Template placeholders cannot establish price or sold-out status.'],
 ['🎁 Patreon','https://www.patreon.com/calverschool/posts/calver-glow-v2-123021297','Searched public effect, macro and project posts; four additions. Access limits and indexed-only evidence are recorded per entry.'],
 ['🛠️ Blackmagic forum','https://forum.blackmagicdesign.com/viewtopic.php?f=22&t=51470','Searched scripting/tool announcements. X-Raym duplicates an existing repository; Random Text Generator remains a legacy distribution lead.'],
 ['🎞️ Creator tutorial archives','https://www.patreon.com/ablackbirdcalledsue/sitemap','Searched tutorial download and sitemap listings; followed analog-counter and motion-graphics attachments.'],
 ['🎮 itch.io','https://fractale.itch.io/cheetah-video-proxy-generator','Additional marketplace pass: Cheetah and YouTube Prep Tool added; VideoRemap duplicate; Resolve MCP Pro held.']
 ];
 write('data/community-discovery-report.md',[
 '# 🔎 Community discovery report','', '[🎬 Catalogue](../README.md) · [🌐 External tools](external-tools.md) · [🧩 Reactor inventory](reactor-inventory.md) · [📥 Evidence](community-discoveries.json)','',
 `Checked **${c.checked_at}**. Added **${c.added_count} external entries**, bringing the external directory from **${c.baseline_count} to ${c.total_count}**. The GitHub catalogue remains at **225 repositories**.`, '',
 'All seven proposed source families were searched, plus itch.io. This is a bounded public-source search, not a claim to have exhausted every post or website. No purchases, account access, plugin installations, or binary downloads were performed. Reactor manifests were read as text, never executed.', '',
 '## Search coverage','', '| Source | Work completed |','|---|---|',...coverage.map(([n,u,d])=>`| ${link(n,u)} | ${d} |`),'',
 `The ${r.folder_count}-folder Reactor inventory includes host installers, dependencies, documentation, legacy packages and tools for other applications. It is not ${r.folder_count} new Resolve plugins and is not added to the catalogue total. Selected individual packages expand the existing Reactor umbrella entry; this relationship is explicit rather than treated as an independent ecosystem.`, '',
 '## 🕒 Versions and update evidence','',
 'Relative ages use the research date. Reactor dates are the manifest’s declared Date field, not independently verified release or last-commit timestamps. Store post dates are not promoted to product updates. Missing dates and platforms remain unassigned. Listed versions describe the checked distribution; another channel may have a newer build.', '',
 '| Creator / resource | Version found | Date evidence | Sources / retrieval |','|---|---|---|',
 ...entries.map(e=>`| ${clean(e.creator)} / ${link(e.name,e.url)} | ${clean(e.version||'Not established')} | ${age(e.updated)}${e.updated?' · '+e.date_kind:''} | ${e.sources.map((s,i)=>link(i?'Additional source':'Primary source',s)).join(' · ')} — ${e.evidence_mode} |`),'',
 '## Held leads','',...c.held_candidates.map(e=>`- ${link(e.name,e.source)} — ${e.reason}`),'',
 '## Duplicate destinations','',...c.duplicates.map(e=>`- ${link(e.name,e.source)} — ${e.existing_url?'Already catalogued at '+link('the current developer site',e.existing_url)+'.':e.reason}`),''].join('\n'));
 const cats=Map.groupBy([...r.packages].sort((a,b)=>(a.category||'Unknown').localeCompare(b.category||'Unknown')||a.id.localeCompare(b.id)),e=>e.category||'Unresolved metadata');
 write('data/reactor-inventory.md',[
 '# 🧩 Reactor package inventory','', '[🎬 Catalogue](../README.md) · [🔎 Source data](community-discoveries.json) · [📥 Inventory JSON](reactor-inventory.json)','',
 `Snapshot **${r.checked_at}**: **${r.folder_count} package folders**, **${r.retrieved_count} manifests retrieved** through GitLab’s public API. One manifest used different filename capitalization; its actual path is retained.`, '',
 'This is an inventory, not a compatibility or license endorsement. It includes application installers, dependencies, legacy tools and non-Resolve companions. Names, authors, categories, versions and dates are literal manifest metadata. A package Date is not proof of its latest release. OS support and price must be checked per package. Raw descriptions and executable payloads are excluded.', '',
 ...[...cats].flatMap(([cat,items])=>[`## ${clean(cat)}`,'','| Package | Creator | Version | Manifest date |','|---|---|---|---|',...items.map(e=>`| ${link(e.name||e.id,e.url)} <br> ${clean(e.id)} | ${clean(e.creator||'Not established')} | ${clean(e.version||'Not established')} | ${validDate(e.manifest_date)?e.manifest_date:'Not established'} |`),''])].join('\n'));
 console.log(`Built ${entries.length} additions and ${r.packages.length} inventory rows.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildCommunityReport();
