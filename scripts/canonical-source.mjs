import fs from 'node:fs';
import path from 'node:path';
import { validateResourceSet } from './resource-schema.mjs';

export function loadCanonicalResources(root) {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'data/resources/index.json'), 'utf8'));
  const records = index.entries.map(entry => JSON.parse(fs.readFileSync(path.join(root, 'data/resources', `${entry.id}.json`), 'utf8')));
  validateResourceSet(records);
  if (records.length !== index.entries.length || records.some(record => !index.entries.some(entry => entry.id === record.id && entry.url === record.urls.canonical))) throw new Error('Canonical resource index mismatch');
  return records;
}

export function findCanonicalResource(records, key) {
  const value = String(key || '');
  return records.find(record => record.id === value || record.urls.canonical === value || record.urls.previous.includes(value)) || null;
}

export function resolveCanonicalResource(root, key) {
  return findCanonicalResource(loadCanonicalResources(root), key);
}

function accessGroup(access) {
  const value = access.replace(/^[^\p{L}\p{N}]+/u, '');
  return /mixed|free.*paid|free.*license|basic.*paid|watermark|first 20/i.test(value) ? 'mixed' : /^free\b/i.test(value) ? 'free' : /^paid|license|membership|business-only/i.test(value) ? 'paid' : 'public';
}

export function toSiteEntry(record) {
  const version = record.version;
  return {
    id: record.id, name: record.name, creator: record.creator, url: record.urls.canonical,
    origin: record.origin, official: record.official, reference: record.reference,
    category: record.category, kind: record.kind, tasks: record.tasks, tags: record.tags, description: record.description,
    access: record.access, accessGroup: record.accessGroup || accessGroup(record.access), platforms: record.platforms,
    platformNotes: record.platform_notes, requirements: record.requirements, evidence: record.evidence,
    unknownFields: record.unknownFields, recommended: record.recommended, recommendation: record.recommendation,
    version, releaseDate: ['stable-release', 'prerelease'].includes(version.kind) || ['release', 'devlog'].includes(version.date_kind) ? version.date : null,
    activityDate: record.last_pushed_at, stars: record.stars, metadataChecked: record.metadata_checked_at,
    history: record.history,
  };
}

export function toCatalogueEntry(record) {
  if (record.origin === 'github') return {
    category: record.category, repository: `${record.creator}/${record.name}`, url: record.urls.canonical,
    description: record.display_description || record.description, access: record.access, research_snapshot: record.research_snapshot,
    platforms: record.display_platforms || (record.platforms.join(';') || 'Unverified'), platform_notes: record.display_platform_notes || '',
    platform_source: record.platform_source, platform_checked_at: record.platform_checked_at,
    stars: String(record.stars ?? 0), last_pushed_at: record.last_pushed_at, metadata_checked_at: record.metadata_checked_at,
  };
  return { name: record.name, url: record.urls.canonical, access: record.access, platforms: record.display_platforms || record.platform_notes || '❔ Unverified', description: record.display_description || record.description, category: record.category };
}
