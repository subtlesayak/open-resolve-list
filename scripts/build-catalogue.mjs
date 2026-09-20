import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {versionLabel, versionFor, resetVersions} from './versions.mjs';
import {loadCanonicalResources,toCatalogueEntry} from './canonical-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  return rows.filter(r => r.length > 1).map(r => {
    if (r.length !== headers.length) throw new Error('Invalid CSV row');
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
}

export const categories = [
  ['🎨', 'Color / DCTL', 'Color grading, DCTLs, film looks, and color science'],
  ['✨', 'Fusion / VFX', 'Fusion, motion graphics, visual effects, and package management'],
  ['💬', 'Captions / Editing', 'Subtitles, transcription, dialogue cleanup, and automatic editing'],
  ['🤖', 'AI / MCP', 'AI assistants, MCP servers, and ComfyUI integrations'],
  ['🛠️', 'Workflow / Scripts', 'Productivity scripts, workflow bridges, and integrations'],
  ['🎞️', 'Encoding / Servers', 'Encoding, codecs, proxy generation, rendering, and project servers'],
  ['🐧', 'Linux', 'Linux installation, compatibility, and troubleshooting'],
  ['📚', 'Development', 'Developer libraries and scripting references'],
  ['🎛️', 'Hardware / MIDI', 'Hardware, control surfaces, MIDI, and Speed Editor tools'],
  ['🧭', 'Directories', 'Directories covering free and commercial products'],
];
export function parseExternalResources(text) {
  const entries = [];
  let category = 'Resources';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (/^#{2,3} /.test(line)) category = line.replace(/^#+\s*/, '').replace(/^[^\p{L}\p{N}]+/u, '');
    if (!line.startsWith('| [')) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map(cell => cell.trim());
    const link = cells[0]?.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (cells.length !== 4 || !link) throw new Error(`Invalid external resource: ${line}`);
    const [, name, url] = link;
    entries.push({ name, url, access: cells[1], platforms: cells[2], description: cells[3], category });
  }
  if (new Set(entries.map(entry => entry.url)).size !== entries.length) throw new Error('Duplicate external resource');
  return entries;
}
const categoryFor = e => categories.find(c => c[2] === e.category);
const compare = (a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0;
const byName = (a, b) => compare(a.repository.split('/')[1], b.repository.split('/')[1]) || compare(a.repository, b.repository);
export function accessGroup(entry) {
  return entry.access.startsWith('Mixed') || entry.access.startsWith('Free/paid') ? 'Mixed' : entry.access.startsWith('Free') ? 'Free' : 'Public';
}
export const sorts = {
  'latest-updated': ['🕒 Latest updated', 'Latest supported update first', (a, b) => compare(b.last_pushed_at || '', a.last_pushed_at || '') || byName(a, b)],
  name: ['🔤 Name', 'Project name A–Z; owner breaks ties', byName],
  type: ['🏷️ Type', 'Category A–Z, then project name A–Z', (a, b) => compare(categoryFor(a)[1], categoryFor(b)[1]) || byName(a, b)],
  stars: ['⭐ Stars', 'Most stars first', (a, b) => Number(b.stars) - Number(a.stars) || byName(a, b)],
  access: ['💰 Access', 'Free, Mixed, Paid, Public; then project name A–Z', (a, b) => compare(accessGroup(a), accessGroup(b)) || byName(a, b)],
};
export function sorted(entries, key) { return [...entries].sort(sorts[key][2]); }
export function creatorGroups(entries) {
  const owners = new Map();
  for (const entry of entries) {
    const owner = entry.repository.split('/')[0];
    const key = owner.toLowerCase();
    if (!owners.has(key)) owners.set(key, { owner, entries: [] });
    owners.get(key).entries.push(entry);
  }
  const groups = [...owners.values()].filter(g => g.entries.length > 1)
    .sort((a, b) => compare(a.owner, b.owner))
    .map(g => ({ ...g, entries: sorted(g.entries, 'name') }));
  const singles = [...owners.values()].filter(g => g.entries.length === 1).flatMap(g => g.entries);
  if (singles.length) groups.push({ owner: null, entries: sorted(singles, 'name') });
  return groups;
}
export function olderThanTwoYears(timestamp, checkedAt) {
  const elapsed = Date.parse(checkedAt) - Date.parse(timestamp);
  return Number.isFinite(elapsed) && elapsed > 730 * 86400000;
}
const activityLegend = '**†** No repository push for more than 2 years (730 days) as of its metadata snapshot. For external resources, † marks a recorded provider or package date older than 2 years at review. Neither marker establishes abandonment or compatibility; unknown dates are not marked.';
export function relativeDate(timestamp, checkedAt) {
  if (!timestamp) return 'Unavailable';
  const days = Math.floor((Date.parse(checkedAt) - Date.parse(timestamp)) / 86400000);
  if (!Number.isFinite(days) || days < 0) return 'Unavailable';
  if (days === 0) return 'Today';
  const [value, unit] = days < 7 ? [days, 'day'] : days < 30 ? [Math.floor(days / 7), 'week'] : days < 365 ? [Math.floor(days / 30), 'month'] : [Math.floor(days / 365), 'year'];
  return `${value} ${unit}${value === 1 ? '' : 's'} back`;
}
const escape = text => text.replaceAll('|', '\\|').replaceAll('\n', ' ');
const wrapText = text => escape(text).replace(/([A-Za-z0-9]{10})(?=[A-Za-z0-9])/g, '$1&#8203;').replace(/([/_])/g, '$1&#8203;');
export const platformIcons = { Windows: '🪟', macOS: '🍎', Linux: '🐧', iPadOS: '📱', Reference: '📖', Unverified: '❔' };
export function platformLabel(e) {
  const platforms = (e.platforms || 'Unverified').split(';');
  if (platforms.some(p => !platformIcons[p])) throw new Error(`Invalid platform for ${e.repository}`);
  const label = platforms.map(p => `${platformIcons[p]} ${p}`).join(' · ');
  const linked = e.platform_source ? `[${label}](${e.platform_source})` : label;
  return linked + (e.platform_notes ? `<br><sub>${wrapText(e.platform_notes)}</sub>` : '');
}
function accessLabel(e, prefix) {
  const group = accessGroup(e);
  const qualifier = e.access === group ? '' : ` ${wrapText(e.access)}`;
  return `![${group}](${prefix}assets/badges/${group.toLowerCase()}.svg)${qualifier}`;
}
export function repositoryLabel(repository) {
  const [owner, name] = repository.split('/');
  const wrap = text => text.replace(/([_-])/g, '$1&#8203;').replace(/([A-Za-z0-9.]{12})(?=[A-Za-z0-9.])/g, '$1&#8203;');
  return { name: wrap(name), owner: wrap(owner) };
}
function row(e, prefix, includeType = false) {
  const c = categoryFor(e);
  const label = repositoryLabel(e.repository);
  const type = includeType ? `<br><sub>${c[0]} ${c[1]}</sub>` : '';
  const details = `${wrapText(e.description)}${type}<br><sub>${versionLabel(e.url)}</sub>`;
  const updated = relativeDate(e.last_pushed_at, e.metadata_checked_at).replaceAll(' ', '&nbsp;') + (olderThanTwoYears(e.last_pushed_at, e.metadata_checked_at) ? '&nbsp;†' : '');
  return `| [${label.name}](${e.url})<br><sub>${label.owner}</sub> | ${details} | ${accessLabel(e, prefix)} | ${platformLabel(e)} | ${e.stars} | <sub>${updated}</sub> |`;
}
function table(entries, prefix, includeType = false) {
  return [
    '| 📦 Repository | 📝 Details | 💰 Access | 💻 Platforms | ⭐ Stars | 🕒 Updated |',
    '| :--- | :--- | :--- | :--- | ---: | :--- |',
    ...entries.map(e => row(e, prefix, includeType)),
  ].join('\n');
}
function navigation(prefix) {
  return Object.entries(sorts).map(([key, [label]]) => `[${label}](${prefix}${key}.md)`).join(' · ');
}
export function externalUpdated(e) {
  if (!e || !['vendor-version', 'package-version'].includes(e.kind) || !/^https:\/\//.test(e.source || '') || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) return 'Unknown';
  const timestamp = Date.parse(`${e.date}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== e.date || !Number.isFinite(Date.parse(e.checked_at)) || timestamp > Date.parse(e.checked_at)) return 'Unknown';
  const dateKinds = ['release', 'Windows download update', 'listed product-group update', 'installer update', 'macOS plugin update', 'Reactor manifest date', 'devlog'];
  if (!dateKinds.includes(e.date_kind)) return 'Unknown';
  const marker = olderThanTwoYears(e.date, e.checked_at) ? '&nbsp;†' : '';
  const age = relativeDate(e.date, e.checked_at).replaceAll(' ', '&nbsp;');
  return `[${age}](${e.source} "${e.date}")${marker}<br><sub>${escape([e.date_kind,e.date_platform,e.date_version].filter(Boolean).join(' · '))}</sub>`;
}
function externalTable(entries) {
  return [
    '| 🌐 Resource | 📝 Details | 💰 Access | 💻 Platforms | 🕒 Updated |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...[...entries].sort((a, b) => compare(a.name, b.name)).map(e => `| [${e.name}](${e.url}) | ${e.description}<br><sub>${versionLabel(e.url)}</sub> | ${e.access} | ${e.platforms} | ${externalUpdated(versionFor(e.url))} |`),
  ].join('\n');
}

export function isOfficialResource(entry) {
  return entry.category?.includes('Official Blackmagic Design resources') || ['www.blackmagicdesign.com', 'documents.blackmagicdesign.com', 'help.cloud.blackmagicdesign.com'].includes(new URL(entry.url).hostname);
}

export function sortCatalogue(entries, key) {
  const name = e => e.repository ? e.repository.split('/')[1] : e.name;
  const type = e => e.repository ? categoryFor(e)[1] : e.category;
  const access = e => e.repository ? accessGroup(e) : /mixed|free.*paid|🆓.*[💰💳]/iu.test(e.access) ? 'Mixed' : /free|🆓/i.test(e.access) ? 'Free' : /paid|💰|💳/i.test(e.access) ? 'Paid' : 'Public';
  const date = e => e.repository ? Date.parse(e.last_pushed_at) : externalUpdated(versionFor(e.url)) === 'Unknown' ? NaN : Date.parse(versionFor(e.url).date);
  const number = value => Number.isFinite(value) ? value : -Infinity;
  return [...entries].sort((a,b) => {
    if (isOfficialResource(a) !== isOfficialResource(b)) return isOfficialResource(a) ? -1 : 1;
    let order = 0;
    if(key === 'latest-updated') order = number(date(b)) - number(date(a));
    if(key === 'stars') order = number(b.repository ? Number(b.stars) : NaN) - number(a.repository ? Number(a.stars) : NaN);
    if(key === 'type') order = compare(type(a),type(b));
    if(key === 'access') order = compare(access(a),access(b));
    return (Number.isNaN(order) ? 0 : order) || compare(name(a),name(b)) || compare(a.repository || a.url,b.repository || b.url);
  });
}

function catalogueTable(entries) {
  return ['| 📦 Resource | 📝 Details / type | 💰 Access | 💻 Platforms | ⭐ Stars | 🕒 Updated |',
    '| :--- | :--- | :--- | :--- | ---: | :--- |',
    ...entries.map(e => e.repository ? row(e,'../',true) : `| [${e.name}](${e.url}) | ${e.description}<br><sub>${escape(e.category)}</sub><br><sub>${versionLabel(e.url)}</sub> | ${e.access} | ${e.platforms} | — | ${externalUpdated(versionFor(e.url))} |`)].join('\n');
}

export function build() {
  resetVersions();
  const canonical=loadCanonicalResources(root);
  const sourceEntries=canonical.map(toCatalogueEntry);
  const entries = sourceEntries.filter(entry => entry.repository);
  const external = sourceEntries.filter(entry => !entry.repository);
  const official = external.filter(isOfficialResource);
  const thirdParty = external.filter(e => !isOfficialResource(e));
  if (new Set(entries.map(e => e.url)).size !== entries.length) throw new Error('Duplicate repository');
  for (const e of entries) {
    if (!categoryFor(e) || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(e.url) || !/^\d+$/.test(e.stars)) throw new Error('Invalid entry');
  }
  const cataloguePath = path.join(root, 'CATALOGUE.md');
  const old = fs.readFileSync(cataloguePath, 'utf8');
  const start = old.indexOf('## Contents');
  const end = old.indexOf('## Compatibility notes');
  if (start < 0 || end < start) throw new Error('README section markers missing');
  let intro = old.slice(0, start).replace(/^# Open Resolve List/m, '# 🎬 Open Resolve List — DaVinci Resolve Plugins & Tools');
  intro = intro.replace(/\*\*\d+ public GitHub repositories\*\*(?: and \*\*\d+ external resources\*\*)?/, `**${entries.length} public GitHub repositories** and **${external.length} external resources**`);
  // Rebuilding only replaces the generated section; editorial notes stay intact.
  const content = [
    '## Contents', '',
    '### ↕️ Sort the catalogue', '', navigation('views/'), '',
    '[🧭 Start with a task](START-HERE.md) · [🗄️ Legacy resources](views/legacy.md) · [📖 Labels and evidence](CATALOGUE-GUIDE.md)', '',
    '### 🗂️ Browse by category', '',
    `- [🏢 Official Blackmagic Design resources](#official-resources) (${official.length})`,
    ...categories.map(([emoji, , title], i) => `- [${emoji} ${title}](#category-${i + 1}) (${entries.filter(e => e.category === title).length})`),
    `- [🌐 External resources](#external-resources) (${thirdParty.length})`,
    '- [⚠️ Compatibility notes](#compatibility-notes)', '',
    '<a id="official-resources"></a>', '', '## 🏢 Official Blackmagic Design resources', '',
    `${official.length} official product, support, training and developer resources. Version labels distinguish advertised product families from exact releases. Unknown update dates are not inferred from website checks.`, '',
    externalTable(official), '',
    ...categories.flatMap(([emoji, , title], i) => {
      const members = entries.filter(e => e.category === title);
      const groups = creatorGroups(members).filter(g => g.owner);
      return [`<a id="category-${i + 1}"></a>`, '', `## ${emoji} ${title}`, '', `${members.length} repositories.`, '',
        '### All repositories', '', table(sorted(members, 'name'), ''), '',
        ...groups.flatMap(g => [
          `### 👤 [${g.owner}](https://github.com/${g.owner})`, '',
          table(g.entries, ''), '',
        ])];
    }),
    '<a id="external-resources"></a>', '', '## 🌐 External resources', '',
    `${thirdParty.length} third-party and community resources, sorted A–Z. Resource names link directly to their websites or stores. Access conditions and compatibility notes are preserved from the [external directory](data/external-tools.md).`, '',
    'Updated ages use the same days/weeks/months/years format as repository rows, calculated at the recorded review date. Hover over an age for its exact date; the link opens provider evidence. The label beneath each age identifies a release, platform-specific update, devlog, or Reactor package-manifest date; these are not interchangeable. **Unknown** means no supported date was established. **†** marks dates more than 2 years (730 days) before their recorded review date, not proof that the entire product is abandoned. Website-check dates are never used as product update dates.', '',
    externalTable(thirdParty), '',
    activityLegend, '',
    '<a id="access-labels"></a>', '<a id="platforms-supported"></a>', '',
    'See the [access and platform guide](CATALOGUE-GUIDE.md) for label definitions, version evidence and browsing conventions.', '',
  ].join('\n');
  fs.writeFileSync(cataloguePath, intro + content + '\n' + old.slice(end));
  fs.writeFileSync(path.join(root, 'README.md'), [
    '# 🎬 Open Resolve List — DaVinci Resolve Plugins & Tools', '',
    `An open, curated database of **DaVinci Resolve plugins, Fusion tools, DCTLs, LUTs, PowerGrades, scripts and templates**, spanning **${entries.length} public GitHub repositories** and **${external.length} external resources** with source-backed compatibility, version history and clear requirements.`, '',
    '[🌐 Browse the searchable website](https://subtlesayak.github.io/open-resolve-list/) · [🎬 Resolve YouTube creators](https://subtlesayak.github.io/open-resolve-list/creators.html) · [🧭 Find a tool for your task](START-HERE.md) · [📖 Read the labels](CATALOGUE-GUIDE.md)', '',
    '## Start here', '',
    '- [Browse the full catalogue](CATALOGUE.md)',
    '- [Find tools by task](START-HERE.md)',
    '- [Read access, platform and evidence labels](CATALOGUE-GUIDE.md)',
    '- [Use sorted catalogue views](views/latest-updated.md)',
    '- [Suggest or correct a resource](CONTRIBUTING.md)', '',
    '## Local maintenance', '',
    'The maintained records live in [`data/resources/`](data/resources/). Build and validation are local-only:', '',
    '```text',
    'npm run build',
    'npm run validate',
    '```', '',
    'See [website maintenance and hosting](WEBSITE.md) for local preview and source-evidence rules.', '',
  ].join('\n'));
  fs.mkdirSync(path.join(root, 'views'), { recursive: true });
  for (const [key, [label, description]] of Object.entries(sorts)) {
    fs.writeFileSync(path.join(root, 'views', key + '.md'), [
      `# ${label}`, '', '[🌐 Searchable website](https://subtlesayak.github.io/open-resolve-list/) · [🎬 Catalogue home](../CATALOGUE.md) · [📥 CSV download](../data/repositories.csv)', '',
      navigation(''), '', `**${entries.length} repositories + ${external.length} external resources · ${description}.**`, '',
      'Official Blackmagic resources come first. The selected sort applies within the official group and across all remaining entries. Unknown dates and inapplicable stars sort last; — means stars do not apply.', '',
      activityLegend, '',
      `GitHub metadata checked: **${entries[0].metadata_checked_at}**. Relative ages are as of this snapshot. Updated = latest repository push, not release date; exact UTC timestamps are in the CSV. Type = category. Access and compatibility reflect the [access label definitions](../CATALOGUE-GUIDE.md#access-labels).`, '',
      '## 🏢 Official Blackmagic Design resources', '', catalogueTable(sortCatalogue(official,key)), '',
      '## 🌐 Community and third-party resources', '', catalogueTable(sortCatalogue([...entries,...thirdParty],key)), '',
    ].join('\n'));
  }
  const legacy=JSON.parse(fs.readFileSync(path.join(root,'data/legacy.json'),'utf8')).entries;
  const byUrl=new Map(entries.map(e=>[e.url,e]));
  for(const item of legacy)if(!byUrl.has(item.url)||!['archived','deprecated'].includes(item.status)||!item.source||!Number.isFinite(Date.parse(item.checked_at)))throw Error('Invalid legacy evidence');
  fs.writeFileSync(path.join(root,'views/legacy.md'),[
    '# 🗄️ Legacy resources','', '[🌐 Searchable website](https://subtlesayak.github.io/open-resolve-list/) · [🎬 Full catalogue](../CATALOGUE.md) · [🧭 Start with a task](../START-HERE.md)','',
    `${legacy.length} repositories with explicit archived or deprecated status. All remain in the full catalogue. Inactivity alone is not a reason for inclusion. Status is a dated observation; check upstream before choosing a resource.`,'',
    ...legacy.map(e=>`- [${e.repository}](${e.source}) — **${e.status}**; checked ${e.checked_at.slice(0,10)}. ${e.reason}`),'',
    table(sorted(legacy.map(e=>byUrl.get(e.url)),'name'),'../',true),'',
  ].join('\n'));
  console.log(`Built README, CATALOGUE.md and ${Object.keys(sorts).length} sorted views for ${entries.length} repositories.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
