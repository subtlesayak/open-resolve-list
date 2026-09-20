import fs from 'node:fs';
import path from 'node:path';
import { validateResourceSet } from './resource-schema.mjs';

export function loadCanonicalResources(root) {
  const directory=path.join(root,'data/resources');
  const records=fs.readdirSync(directory).filter(name=>name.endsWith('.json')&&name!=='index.json').sort().map(name=>{
    const record=JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
    if(name!==record.id+'.json')throw new Error('Canonical filename does not match resource ID: '+name);
    return record;
  });
  validateResourceSet(records);
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
    unknownFields: [...(!record.platforms.length?['platforms']:[]),...(!record.requirements.editions.length?['Resolve edition']:[]),...(!record.requirements.resolve.length?['Resolve version']:[]),...(!record.requirements.architectures.length?['architecture']:[]),...(record.requirements.processing==='unknown'?['processing']:[]),...(!record.version.version&&record.version.kind!=='not-applicable'?['tool version']:[])], recommended: record.recommended, recommendation: record.recommendation,
    previousUrls: record.urls.previous,
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
