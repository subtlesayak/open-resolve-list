import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { olderThanTwoYears, externalUpdated, isOfficialResource, sortCatalogue } from './build-catalogue.mjs';
import {versionLabel, versionFor} from './versions.mjs';
import { parseCsv, parseExternalResources, sorted, relativeDate, sorts, build, accessGroup, platformLabel, platformIcons, categories, creatorGroups, repositoryLabel } from './build-catalogue.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = parseCsv(fs.readFileSync(path.join(root, 'data/repositories.csv'), 'utf8'));
const discovery = JSON.parse(fs.readFileSync(path.join(root, 'data/web-discoveries.json'), 'utf8'));

test('activity marker uses exact dates and requires more than 2 years (730 days)', () => {
  const now = '2026-09-06T12:00:00Z';
  const cutoff = Date.parse(now) - 730 * 86400000;
  assert.equal(olderThanTwoYears(new Date(cutoff).toISOString(), now), false);
  assert.equal(olderThanTwoYears(new Date(cutoff - 1).toISOString(), now), true);
  for (const date of ['', 'invalid', '2026-09-07T12:00:00Z']) assert.equal(olderThanTwoYears(date, now), false);
  assert.equal(olderThanTwoYears('2020-01-01', 'invalid'), false);
  for (const file of ['CATALOGUE.md', ...Object.keys(sorts).map(k => `views/${k}.md`)]) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(text.includes('**†** No repository push for more than 2 years (730 days)'));
    for (const entry of entries) {
      const rows = text.split('\n').filter(line => line.startsWith('| [') && line.includes(`](${entry.url})`));
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.ok(!row.includes(` †](${entry.url})`));
        assert.equal(row.endsWith('&nbsp;†</sub> |'), olderThanTwoYears(entry.last_pushed_at, entry.metadata_checked_at), `${file}: ${entry.repository}`);
      }
    }
  }
});

test('relative dates handle singular, plural, missing and future timestamps', () => {
  const now = '2026-09-06T12:00:00Z';
  const ago = days => new Date(Date.parse(now) - days * 86400000).toISOString();
  for (const [days, label] of [[0, 'Today'], [1, '1 day back'], [6, '6 days back'], [7, '1 week back'], [21, '3 weeks back'], [30, '1 month back'], [90, '3 months back'], [365, '1 year back'], [730, '2 years back']]) assert.equal(relativeDate(ago(days), now), label);
  assert.equal(relativeDate('', now), 'Unavailable');
  assert.equal(relativeDate(ago(-1), now), 'Unavailable');
});
test('sorts use exact dates, numeric stars, project names and categories', () => {
  const base = entries[0];
  const fixture = [
    {...base, repository: 'a/Zebra', stars: '9', last_pushed_at: '2026-09-01T00:00:00Z'},
    {...base, repository: 'z/Alpha', stars: '100', last_pushed_at: '2026-09-06T00:00:00Z'},
    {...base, repository: 'a/Alpha', stars: '10', last_pushed_at: '2026-08-30T00:00:00Z'},
  ];
  assert.deepEqual(sorted(fixture, 'name').map(e => e.repository), ['a/Alpha', 'z/Alpha', 'a/Zebra']);
  assert.deepEqual(sorted(fixture, 'stars').map(e => e.stars), ['100', '10', '9']);
  assert.deepEqual(sorted(fixture, 'latest-updated').map(e => e.repository), ['z/Alpha', 'a/Zebra', 'a/Alpha']);
  assert.equal(accessGroup({access:'Free/paid product directory'}), 'Mixed');
});
test('CSV quotes and commas round-trip correctly', () => {
  assert.deepEqual(parseCsv('"name","description"\n"a","A comma, and ""quote"""\n'), [{name:'a', description:'A comma, and "quote"'}]);
});
test('platform labels retain evidence and caveats without guessing support', () => {
  assert.equal(platformLabel({}), '❔ Unverified');
  assert.throws(() => platformLabel({platforms:'All'}), /Invalid platform/);
  for (const entry of entries) {
    if (entry.last_pushed_at) assert.match(entry.last_pushed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.ok(entry.platforms.split(';').every(p => platformIcons[p]));
    assert.ok(entry.platform_source.startsWith(entry.url));
    assert.match(entry.platform_checked_at, /^\d{4}-\d{2}-\d{2}$/);
    const output = platformLabel(entry);
    for (const platform of entry.platforms.split(';')) assert.ok(output.includes(platformIcons[platform]));
    if (entry.platform_notes) assert.ok(output.replaceAll('&#8203;', '').includes(entry.platform_notes));
  }
  assert.match(platformLabel(entries.find(e => e.repository === 'Nusscookie/clautter')), /untested/);
  assert.match(platformLabel(entries.find(e => e.repository === 'elliotmatson/Docker-Davinci-Resolve-Project-Server')), /server hosts/);
});
test('compact tables retain every field and allow long repository names to wrap', () => {
  const readme = fs.readFileSync(path.join(root, 'CATALOGUE.md'), 'utf8');
  assert.ok(readme.includes('| 📦 Repository | 📝 Details | 💰 Access | 💻 Platforms | ⭐ Stars | 🕒 Updated |'));
  assert.ok(readme.includes('| :--- | :--- | :--- | :--- | ---: | :--- |'));
  for (const entry of entries) {
    const row = readme.split('\n').find(line => line.startsWith('| [') && line.includes(`](${entry.url})`));
    assert.ok(row, `Missing ${entry.repository}`);
    assert.equal(row.split(/(?<!\\)\|/).length, 8, `Expected six columns for ${entry.repository}`);
    const readableRow = row.replaceAll('&#8203;', '');
    assert.ok(readableRow.includes(entry.description.replaceAll('|', '\\|').replaceAll('\n', ' ')));
    assert.ok(row.includes(platformLabel(entry)));
    assert.ok(row.includes(`![${accessGroup(entry)}]`));
    if (entry.access !== accessGroup(entry)) assert.ok(readableRow.includes(entry.access.replaceAll('|', '\\|')));
    const updated = relativeDate(entry.last_pushed_at, entry.metadata_checked_at).replaceAll(' ', '&nbsp;') + (olderThanTwoYears(entry.last_pushed_at, entry.metadata_checked_at) ? '&nbsp;†' : '');
    assert.ok(row.includes(`| ${entry.stars} | <sub>${updated}</sub> |`));
    assert.ok(!row.includes('<br><br>'));
    const label = repositoryLabel(entry.repository);
    assert.equal(`${label.owner}/${label.name}`.replaceAll('&#8203;', ''), entry.repository);
    for (const part of [label.owner, label.name]) assert.ok(part.split('&#8203;').every(chunk => chunk.length <= 20));
  }
});

test('generated views preserve all entries, sort order and valid local links', () => {
  assert.equal(entries.length, discovery.total_count);
  assert.equal(new Set(entries.map(e => e.url.toLowerCase())).size, entries.length);
  const readme = fs.readFileSync(path.join(root, 'CATALOGUE.md'), 'utf8');
  const defaultUrls = [...readme.matchAll(/^\| \[[^\]]+\]\((https:\/\/github.com\/[^/)]+\/[^/)]+)\)/gm)].map(m => m[1]);
  assert.deepEqual(defaultUrls, categories.flatMap(([, , category]) => {
    const members = entries.filter(e => e.category === category);
    return [...sorted(members, 'name').map(e => e.url), ...creatorGroups(members).filter(g => g.owner).flatMap(g => g.entries.map(e => e.url))];
  }));
  for (let index = 0; index < categories.length; index++) {
    const start = readme.indexOf(`<a id="category-${index + 1}"></a>`);
    const next = readme.indexOf(`<a id="category-${index + 2}"></a>`, start);
    const section = readme.slice(start, next < 0 ? readme.indexOf('## Compatibility notes', start) : next);
    assert.ok(section.includes('### All repositories'));
    if (section.includes('### 👤')) assert.ok(section.indexOf('### All repositories') < section.indexOf('### 👤'));
    assert.ok(!section.includes('### Other creators'));
  }
  assert.match(readme, /### 👤 \[postflows\]\(https:\/\/github.com\/postflows\)/);
  const fixture = ['Beta/z', 'Solo/a', 'alpha/b', 'Beta/a', 'ALPHA/a'].map(repository => ({...entries[0], repository}));
  assert.deepEqual(creatorGroups(fixture).map(g => [g.owner, g.entries.map(e => e.repository)]), [
    ['alpha', ['ALPHA/a', 'alpha/b']], ['Beta', ['Beta/a', 'Beta/z']], [null, ['Solo/a']],
  ]);
  for (const key of Object.keys(sorts)) {
    const file = path.join(root, 'views', key + '.md');
    const text = fs.readFileSync(file, 'utf8');
    const urls = [...text.matchAll(/^\| \[[^\]]+\]\((https:\/\/github.com\/[^)]+)\)/gm)].map(m => m[1]);
    assert.deepEqual(urls, sorted(entries, key).map(e => e.url));
  }
  for (const file of ['CATALOGUE.md', 'TOOL-FINDER.md', 'CHANGELOG.md', 'data/external-tools.md', ...Object.keys(sorts).map(k => `views/${k}.md`)]) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(link)) continue;
      const [target, anchor] = link.split('#');
      const destination = path.resolve(root, path.dirname(file), target || path.basename(file));
      assert.ok(fs.existsSync(destination), `${file}: broken link ${link}`);
      if (anchor) {
        const content = fs.readFileSync(destination, 'utf8');
        assert.ok(content.includes(`id="${anchor}"`) || content.split('\n').some(l => l.startsWith('#') && l.trim().replace(/^#+\s+/, '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-') === anchor), `Missing anchor ${anchor}`);
      }
    }
  }
});

test('web additions have matching catalogue records and traceable upstream evidence', () => {
  assert.equal(discovery.baseline_count + discovery.added_count, discovery.total_count);
  assert.equal(discovery.additions.length, discovery.added_count);
  const additions = new Set(discovery.additions.map(e => e.repository.toLowerCase()));
  assert.equal(additions.size, discovery.added_count);
  for (const added of discovery.additions) {
    const entry = entries.find(e => e.repository === added.repository);
    assert.ok(entry, `Missing addition ${added.repository}`);
    for (const key of ['category', 'url', 'description', 'access', 'platforms', 'platform_notes', 'platform_source', 'platform_checked_at', 'research_snapshot']) assert.equal(entry[key], added[key]);
    assert.ok(added.discovery_sources.length > 0);
    for (const source of [...added.discovery_sources, added.evidence_source]) assert.equal(new URL(source).protocol, 'https:');
    assert.equal(added.evidence_source, entry.platform_source);
  }
  for (const held of discovery.held_candidates) assert.ok(!additions.has(held.repository.toLowerCase()));
  assert.match(entries.find(e => e.repository === 'IgorRidanovic/DaVinciResolve-ExportProjects').description, /DELETE the source projects/);
  assert.match(entries.find(e => e.repository === 'in03/patchwork').description, /unfinished/);
  const readme = fs.readFileSync(path.join(root, 'CATALOGUE.md'), 'utf8');
  assert.ok(readme.includes(`**${entries.length} public GitHub repositories**`));
});
test('marketplace additions are unique, traceable, and present in the external directory', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'data/marketplace-discoveries.json'), 'utf8'));
  const directory = fs.readFileSync(path.join(root, 'data/external-tools.md'), 'utf8');
  const urls = [...directory.matchAll(/^\| \[[^\]]+\]\((https:\/\/[^)]+)\)/gm)].map(m => m[1]);
  assert.equal(ledger.baseline_count + ledger.added_count, ledger.total_count);
  assert.equal(ledger.additions.length, ledger.added_count);
  const community = JSON.parse(fs.readFileSync(path.join(root, 'data/community-discoveries.json'), 'utf8'));
  assert.equal(community.baseline_count, ledger.total_count);
  assert.equal(urls.length, community.total_count);
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(new Set(ledger.additions.map(e => e.url)).size, ledger.added_count);
  for (const e of ledger.additions) {
    assert.ok(urls.includes(e.url), `Missing resource ${e.name}`);
    assert.ok(directory.includes(`#### 👤 ${e.creator}`));
    assert.ok(directory.includes(e.description));
    assert.ok(e.evidence_mode && e.checked_at && e.sources.includes(e.url));
    for (const source of e.sources) {
      const url = new URL(source);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.search, '', 'Evidence URLs must not contain tracking parameters');
    }
  }
});

test('external update dates require valid provider evidence and preserve date scope', () => {
  const record = {kind:'vendor-version', date:'2024-01-01', checked_at:'2026-09-06T12:00:00Z', source:'https://example.com/releases', date_kind:'release'};
  assert.equal(externalUpdated(record), '[2&nbsp;years&nbsp;back](https://example.com/releases "2024-01-01")&nbsp;†<br><sub>release</sub>');
  assert.ok(externalUpdated({...record,date:'2026-08-30'}).startsWith('[1&nbsp;week&nbsp;back]'));
  assert.ok(externalUpdated({...record,date:'2026-09-06'}).startsWith('[Today]'));
  assert.ok(!externalUpdated({...record,date:'2026-01-01'}).includes('†'));
  assert.ok(externalUpdated({...record,kind:'package-version',date_kind:'Reactor manifest date'}).includes('Reactor manifest date'));
  for (const changes of [{date:null},{date:'2026-02-30'},{date:'2027-01-01'},{source:''},{checked_at:'invalid'},{date_kind:'website checked'},{kind:'unverified'}]) assert.equal(externalUpdated({...record,...changes}), 'Unknown');
  assert.equal(externalUpdated(null), 'Unknown');
  assert.match(externalUpdated({...record,date_kind:'devlog',date_platform:'Windows',date_version:'0.3.7'}),/devlog · Windows · 0.3.7/);
});

test('alternate views contain the whole catalogue once with official resources first',()=>{
 const external=parseExternalResources(fs.readFileSync(path.join(root,'data/external-tools.md'),'utf8'));
 const all=[...entries,...external];
 for(const key of Object.keys(sorts)){
  const text=fs.readFileSync(path.join(root,'views',key+'.md'),'utf8');
  const urls=[...text.matchAll(/^\| \[[^\]]+\]\((https:\/\/[^)]+)\)/gm)].map(m=>m[1]);
  assert.deepEqual(urls,sortCatalogue(all,key).map(e=>e.url));
  assert.equal(new Set(urls).size,all.length);
 }
  const directory=fs.readFileSync(path.join(root,'data/external-tools.md'),'utf8');
  assert.ok(directory.indexOf('## 🏢 Official Blackmagic Design resources')<directory.indexOf('## 🎨 Color tools'));
  const official={name:'Z official',url:'https://www.blackmagicdesign.com/support',category:'Reference',access:'Public'};
  const vendor={name:'A vendor',url:'https://example.com/tool',category:'Scripts',access:'Paid'};
  const repo={...entries[0],repository:'example/B-repo',url:'https://github.com/example/B-repo',stars:'0'};
  assert.deepEqual(sortCatalogue([repo,vendor,official],'name').map(e=>e.url),[official.url,vendor.url,repo.url]);
  assert.deepEqual(sortCatalogue([vendor,repo],'stars').map(e=>e.url),[repo.url,vendor.url]);
});

test('official resources precede all other categories and external entries appear once', () => {
  const source = parseExternalResources(fs.readFileSync(path.join(root, 'data/external-tools.md'), 'utf8'));
  const readme = fs.readFileSync(path.join(root, 'CATALOGUE.md'), 'utf8');
  assert.equal(readme.split('## 🌐 External resources').length - 1, 1);
  assert.ok(readme.indexOf('## 🏢 Official Blackmagic Design resources') < readme.indexOf('<a id="category-1">'));
  assert.equal(isOfficialResource({url:'https://forum.blackmagicdesign.com/viewtopic.php?t=175315'}),false);
  for (const [heading, items] of [
    ['## 🏢 Official Blackmagic Design resources',source.filter(isOfficialResource)],
    ['## 🌐 External resources',source.filter(e=>!isOfficialResource(e))]
  ]) {
  const section = readme.split(heading+'\n')[1].split('\n## ')[0];
  const rows = section.split('\n').filter(line => line.startsWith('| ['));
  const expected = [...items].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0);
  assert.deepEqual(rows, expected.map(e => `| [${e.name}](${e.url}) | ${e.description}<br><sub>${versionLabel(e.url)}</sub> | ${e.access} | ${e.platforms} | ${externalUpdated(versionFor(e.url))} |`));
  }
  for(const e of source) assert.equal(readme.split('\n').filter(line=>line.startsWith('| [')&&line.includes(']('+e.url+')')).length,1);
});

test('regeneration is deterministic and preserves CSV', () => {
  const files = ['README.md', 'CATALOGUE.md', 'data/repositories.csv', 'views/legacy.md', ...Object.keys(sorts).map(k => `views/${k}.md`)];
  const before = files.map(f => fs.readFileSync(path.join(root, f), 'utf8'));
  build();
  assert.deepEqual(files.map(f => fs.readFileSync(path.join(root, f), 'utf8')), before);
});
