import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {relativeDate} from './build-catalogue.mjs';
import {validDate} from './update-evidence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
const link=(name,url)=>`[${clean(name)}](${url})`;
export function buildUpdateReport(){
 const a=JSON.parse(fs.readFileSync(path.join(root,'data/update-audit.json'),'utf8'));
 const later=JSON.parse(fs.readFileSync(path.join(root,'data/community-discoveries.json'),'utf8'));
 const age=d=>d?`${relativeDate(d,a.checked_at)} (${d.slice(0,10)})`:'Not established';
 const stable=a.github.filter(e=>e.latest_stable_release).length;
 const release=r=>r?`${link(r.tag,r.url)} · ${age(r.published_at)}`:'None published';
 const lines=['# 🕒 Updates and changelogs','', '[🎬 Catalogue](../CATALOGUE.md) · [🌐 External directory](external-tools.md) · [📥 Evidence JSON](update-audit.json)','',
 `This historical audit covers the ${a.scope.external} external entries available at its snapshot. See [community discovery evidence](community-discoveries.json) for the ${later.additions.length} subsequently added resources.`,'',
 `Reviewed **${a.reviewed_on}**: **${a.scope.github} GitHub repositories + ${a.scope.external} external destinations**. GitHub snapshot: **${a.checked_at}**. Individual page-check timestamps are in the evidence JSON.`, '',
 `**${stable}** repositories have a GitHub-designated stable release; **${a.github.filter(e=>e.newest_created_release).length}** have any release. **${a.github.filter(e=>e.archived).length}** are archived. **${a.github.reduce((n,e)=>n+e.changelogs.length,0)}** root changelog files were read. **${a.external.filter(e=>e.http_status!==200).length}** external destinations blocked direct retrieval; primary-source web results resolved some of their update information.`, '',
 'Relative ages are frozen at the snapshot. A repository push is activity, not a software release. Release dates come from GitHub or explicit vendor entries; copyright, store-policy, webpage-edit, and store-publication dates are excluded. “Not established” does not mean abandoned or unchanged. Product collections can have separate versions. No installations were tested.', '',
 '## ⚠️ Link requiring attention','',...a.broken_update_links.map(e=>`- ${link('Shutter Encoder changelog',e.url)} returned **HTTP ${e.http_status}**; the ${link('homepage',e.parent)} works and lists version 20.3.`),'',
 '## 🌐 External resources','',
 'Versions below are the latest explicit entries found in the checked sources, not a guarantee about private/account-only builds. A source link may open a download index; no installers were downloaded. HTTP status describes the initial directory URL, independently of changelog verification.', '',
 '| Resource | Version / build found | Updated | Evidence and limitations | Initial link check |','|---|---|---|---|---|',
 ...[...a.external].sort((x,y)=>x.name.localeCompare(y.name)).map(e=>`| ${link(e.name,e.url)} | ${clean(e.version||'Not established')} | ${validDate(e.date)?age(e.date+'T00:00:00Z')+(e.date_kind!=='release'?` · ${clean(e.date_kind)}`:''):'Not established'} | ${e.update_source?link('Source',e.update_source)+' · ':''}${(e.additional_sources||[]).map(u=>link('Additional source',u)+' · ').join('')}${clean(e.note)} | ${e.http_status??'Unavailable'} · ${clean(e.fetch_status.replaceAll('_',' '))} |`), '',
 '## 🐙 GitHub repositories','',
 'All catalogue repositories were queried through the GitHub API. “Stable release” uses GitHub’s latestRelease field. The separate newest-created release is shown only when it differs; creation order can differ from publication order, and prereleases are explicitly labelled. Changelog discovery inspected default-branch root files named CHANGELOG, CHANGES, HISTORY, or NEWS; nested documentation and every historical link were not exhaustively crawled. Unreleased sections are not published releases.', '',
 '| Repository | Latest push | Stable release | Other newest-created release | Root changelog | State |','|---|---|---|---|---|---|',
 ...[...a.github].sort((x,y)=>x.repository.localeCompare(y.repository)).map(e=>`| ${link(e.repository,e.url)} | ${age(e.last_pushed_at)} | ${release(e.latest_stable_release)} | ${e.newest_created_release&&e.newest_created_release.url!==e.latest_stable_release?.url?release(e.newest_created_release)+(e.newest_created_release.prerelease?' · 🧪 Prerelease':''):'—'} | ${e.changelogs.map(l=>link(l.path,l.url)+(l.contains_unreleased?' (includes unreleased)':'')).join('<br>')||'Not found at root'} | ${e.archived?'🗄️ Archived':e.status==='available'?'Available':'Unresolved'} |`),''];
 fs.writeFileSync(path.join(root,'data/update-audit.md'),lines.join('\n'));
 console.log(`Built update report for ${a.github.length+a.external.length} resources.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildUpdateReport();
