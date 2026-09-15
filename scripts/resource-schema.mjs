export const RESOURCE_KINDS = [
  'dctl', 'ofx', 'powergrade', 'fuse', 'fusion-macro', 'reactor-package',
  'lut', 'resolve-script', 'mcp-server', 'workflow-app', 'subtitle-tool',
  'template', 'encoder', 'control-surface', 'reference', 'collection', 'other',
];

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function slugify(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-') || 'resource';
}

export function oldUrlId(url) {
  return createHash('sha256').update(String(url)).digest('hex').slice(0, 12);
}

function assert(condition, message) { if (!condition) throw new Error(message); }
function https(value, label) { assert(typeof value === 'string' && value.startsWith('https://'), `${label} must be an HTTPS URL`); }

export function validateResource(record) {
  assert(record && typeof record === 'object', 'Resource must be an object');
  assert(typeof record.id === 'string' && ID_PATTERN.test(record.id), `Invalid resource ID: ${record.id}`);
  for (const key of ['name', 'creator', 'category', 'kind', 'description', 'access', 'origin']) assert(typeof record[key] === 'string' && record[key].trim(), `${record.id}: missing ${key}`);
  assert(RESOURCE_KINDS.includes(record.kind), `${record.id}: unsupported kind ${record.kind}`);
  assert(['github', 'external'].includes(record.origin), `${record.id}: invalid origin`);
  assert(record.urls && Array.isArray(record.urls.previous), `${record.id}: invalid URLs block`);
  https(record.urls.canonical, `${record.id} canonical URL`);
  for (const url of record.urls.previous) https(url, `${record.id} previous URL`);
  assert(Array.isArray(record.tasks) && record.tasks.every(t => typeof t === 'string'), `${record.id}: invalid tasks`);
  assert(Array.isArray(record.tags) && record.tags.length >= 2 && new Set(record.tags).size === record.tags.length, `${record.id}: invalid tags`);
  assert(record.requirements && record.version && Array.isArray(record.evidence) && Array.isArray(record.history), `${record.id}: missing structured metadata`);
  for (const item of record.evidence) { assert(['documented', 'creator', 'tested'].includes(item.level), `${record.id}: invalid evidence level`); https(item.source, `${record.id} evidence source`); assert(Number.isFinite(Date.parse(item.checked_at)), `${record.id}: invalid evidence date`); }
  if (record.research_snapshot) assert(DATE_PATTERN.test(record.research_snapshot), `${record.id}: invalid research snapshot`);
  const previous = new Set(record.urls.previous);
  assert(!previous.has(record.urls.canonical), `${record.id}: canonical URL is also a previous URL`);
  return record;
}

export function validateResourceSet(records) {
  assert(Array.isArray(records), 'Resources must be an array');
  const ids = new Set(), urls = new Map();
  for (const record of records) {
    validateResource(record);
    assert(!ids.has(record.id), `Duplicate resource ID: ${record.id}`); ids.add(record.id);
    for (const url of [record.urls.canonical, ...record.urls.previous]) {
      assert(!urls.has(url), `Duplicate resource URL/alias: ${url} (${record.id}, ${urls.get(url)})`);
      urls.set(url, record.id);
    }
  }
  return { ids, urls };
}
import { createHash } from 'node:crypto';
