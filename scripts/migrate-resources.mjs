import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, parseExternalResources, isOfficialResource } from './build-catalogue.mjs';
import { TASKS } from '../site/model.mjs';
import { RESOURCE_KINDS, oldUrlId, slugify, validateResourceSet } from './resource-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const plain = value => String(value || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').replace(/\*\*/g, '').trim();
const safeUrl = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
const normalize = value => String(value || '').toLowerCase();

function inferTasks(category, description) {
  const text = `${category} ${description}`.toLowerCase();
  const rules = [[/color|dctl|grade|film looks/, 'color'], [/fusion|animation|motion|visual effects/, 'fusion'], [/subtit|transcrip|dialogue|caption|editing/, 'captions'], [/workflow|script|productivity|automation|ai assistant/, 'workflow'], [/encoding|media|deliver|proxy|render|servers/, 'media'], [/audio|fairlight/, 'audio'], [/develop|scripting reference/, 'development'], [/train|learn|reference|director/, 'learning'], [/hardware|midi|control surface/, 'hardware'], [/linux/, 'linux']];
  return [...new Set(rules.filter(([pattern]) => pattern.test(text)).map(([, task]) => task))].filter(task => TASKS[task]);
}

function inferKind(entry) {
  const text = normalize(`${entry.name} ${entry.category} ${entry.description}`);
  const rules = [[/mcp/, 'mcp-server'], [/reactor/, 'reactor-package'], [/powergrade|power grade/, 'powergrade'], [/dctl/, 'dctl'], [/\bofx\b|openfx/, 'ofx'], [/fuse/, 'fuse'], [/macro|drfx/, 'fusion-macro'], [/\blut\b/, 'lut'], [/subtitle|caption/, 'subtitle-tool'], [/encoder|encoding|ffmpeg/, 'encoder'], [/control surface|speed editor|midi|hui/, 'control-surface'], [/template|generator/, 'template'], [/script|workflow|app|cli|toolkit|bridge/, 'workflow-app']];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || (entry.platforms.includes('📖') ? 'reference' : 'other');
}

function accessGroup(entry, details) {
  if (details?.accessGroup) return details.accessGroup;
  const value = entry.access.replace(/^[^\p{L}\p{N}]+/u, '');
  return /mixed|free.*paid|free.*license|basic.*paid|watermark|first 20/i.test(value) ? 'mixed' : /^free\b/i.test(value) ? 'free' : /^paid|license|membership|business-only/i.test(value) ? 'paid' : 'public';
}

function documentedPlatforms(entry, details) {
  if (details?.platforms) return details.platforms;
  if (entry.origin === 'github') return entry.platforms.split(';').filter(p => ['Windows', 'macOS', 'Linux', 'iPadOS'].includes(p));
  if (/❔|📖|per (product|tool|package)|older|version-specific|varies/i.test(`${entry.platforms} ${entry.description}`)) return [];
  return [['🪟', 'Windows'], ['🍎', 'macOS'], ['🐧', 'Linux']]
    .filter(([icon]) => entry.platforms.includes(icon)).map(([, platform]) => platform);
}

function evidenceFor(entry, version, details, original, platforms) {
  const evidence = [];
  if (platforms.length) evidence.push({ field: 'platforms', level: 'documented', source: entry.platform_source || original?.sources?.[0] || entry.url, checked_at: entry.platform_checked_at || original?.checked_at || version.checked_at, note: 'Provider-listed platforms; see limitations and exact builds.' });
  if (version.version) evidence.push({ field: version.kind === 'commit' ? 'repository revision' : 'version', level: 'documented', source: version.source, checked_at: version.checked_at, note: version.kind === 'commit' ? 'Source revision, not a software release.' : 'Recorded version evidence, not installation testing.' });
  if (details) evidence.push(...details.evidence);
  return evidence;
}

function externalCreators(markdown) {
  const creators = new Map(); let creator = '';
  for (const line of markdown.split('\n')) {
    if (/^#{2,3} |^#### Other/.test(line)) creator = '';
    if (/^#### 👤 /.test(line)) creator = line.replace(/^#### 👤 /, '').trim();
    const match = line.match(/^\| \[[^\]]+\]\((https:[^)]+)\)/);
    if (match && creator) creators.set(match[1], creator);
  }
  return creators;
}

function loadLegacy() {
  const markdown = fs.readFileSync(path.join(root, 'data/external-tools.md'), 'utf8');
  const csv = parseCsv(fs.readFileSync(path.join(root, 'data/repositories.csv'), 'utf8'));
  const external = parseExternalResources(markdown);
  const versions = new Map(read('data/versions.json').entries.map(item => [item.url, item]));
  const details = new Map(read('data/resource-details.json').entries.map(item => [item.url, item]));
  const tags = new Map(read('data/search-tags.json').entries.map(item => [item.url, item.tags]));
  const history = read('data/provider-updates.json').entries;
  const discoveries = new Map([...read('data/marketplace-discoveries.json').additions, ...read('data/community-discoveries.json').additions].map(item => [item.url, item]));
  const audit = new Map(read('data/update-audit.json').external.map(item => [item.url, item]));
  const creators = externalCreators(markdown);
  const sources = [...csv.map(item => ({ ...item, name: item.repository.split('/')[1], creator: item.repository.split('/')[0], origin: 'github' })), ...external.map(item => ({ ...item, creator: creators.get(item.url) || new URL(item.url).hostname.replace(/^www\./, ''), origin: 'external' }))];
  return sources.map(entry => {
    const version = versions.get(entry.url); const detail = details.get(entry.url); const original = discoveries.get(entry.url) || audit.get(entry.url);
    if (!version) throw new Error(`Missing version ${entry.url}`);
    if (!tags.has(entry.url)) throw new Error(`Missing search tags ${entry.url}`);
    const requirements = { editions: [], resolve: [], architectures: [], gpu: null, processing: 'unknown', pricing: 'unknown', account: 'unknown', dependencies: null, installation: null, ...detail?.requirements };
    const platforms = documentedPlatforms(entry, detail);
    const idBase = slugify(entry.origin === 'github' ? entry.repository.split('/')[1] : entry.name);
    const evidence = evidenceFor(entry, version, detail, original, platforms);
    const id = idBase;
    return {
      schema_version: 1, id, name: entry.name, creator: entry.creator,
      urls: { canonical: entry.url, previous: [] }, origin: entry.origin,
      official: isOfficialResource(entry), reference: /Reference|📖/.test(entry.platforms),
      category: plain(entry.category), kind: inferKind(entry), tasks: detail?.tasks || inferTasks(entry.category),
      tags: tags.get(entry.url), description: plain(entry.description), display_description: entry.description, access: plain(entry.access), accessGroup: accessGroup(entry, detail),
      platforms, platform_notes: plain(entry.platform_notes || entry.platforms), display_platforms: entry.platforms, display_platform_notes: entry.platform_notes || '', platform_source: entry.platform_source || original?.sources?.[0] || null,
      platform_checked_at: entry.platform_checked_at || original?.checked_at || null, research_snapshot: entry.research_snapshot || null,
      stars: entry.origin === 'github' ? Number(entry.stars) : null, last_pushed_at: entry.last_pushed_at || null,
      metadata_checked_at: entry.metadata_checked_at || null, requirements, version, evidence,
      unknownFields: [...(!platforms.length ? ['platforms'] : []), ...(!requirements.editions.length ? ['Resolve edition'] : []), ...(!requirements.resolve.length ? ['Resolve version'] : []), ...(!requirements.architectures.length ? ['architecture'] : []), ...(requirements.processing === 'unknown' ? ['processing'] : []), ...(!version.version && version.kind !== 'not-applicable' ? ['tool version'] : [])],
      recommended: !!detail?.recommendation, recommendation: detail?.recommendation || null,
      history: history.filter(item => item.url === entry.url), legacy_id: oldUrlId(entry.url),
    };
  });
}

function assignUniqueIds(records, priorMap) {
  const used = new Set();
  for (const record of records) {
    const mapped = priorMap[record.urls.canonical]?.id;
    let base = mapped || record.id; let id = base; let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    record.id = id; used.add(id);
  }
}

function buildMap(records) {
  return Object.fromEntries(records.map(record => [record.urls.canonical, { id: record.id, legacy_id: record.legacy_id, name: record.name, origin: record.origin, previous: record.urls.previous }]));
}

export function migrate({ check = false } = {}) {
  const mapPath = path.join(root, 'data/resource-id-map.json');
  const previous = fs.existsSync(mapPath) ? read('data/resource-id-map.json').entries || {} : {};
  const records = loadLegacy(); assignUniqueIds(records, previous); validateResourceSet(records);
  const map = buildMap(records);
  const directory = path.join(root, 'data/resources');
  if (!check) {
    fs.mkdirSync(directory, { recursive: true });
    for (const record of records) fs.writeFileSync(path.join(directory, `${record.id}.json`), JSON.stringify(record, null, 2) + '\n');
    fs.writeFileSync(path.join(directory, 'index.json'), JSON.stringify({ schema_version: 1, generated_from: 'legacy catalogue sources', entries: records.map(({ id, name, creator, urls, origin, category, kind }) => ({ id, name, creator, url: urls.canonical, origin, category, kind })) }, null, 2) + '\n');
    fs.writeFileSync(mapPath, JSON.stringify({ schema_version: 1, policy: 'Permanent IDs are stable; URLs are aliases and never identity.', entries: map }, null, 2) + '\n');
  }
  return records;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const records = migrate({ check });
  console.log(`${check ? 'Validated' : 'Migrated'} ${records.length} canonical resources; ${new Set(records.map(r => r.kind)).size} kinds.`);
}
