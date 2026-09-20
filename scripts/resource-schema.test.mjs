import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
import { RESOURCE_KINDS, slugify, validateResourceSet } from './resource-schema.mjs';
import { buildSite } from './build-site.mjs';
import { findCanonicalResource, resolveCanonicalResource } from './canonical-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('canonical validation reads the maintained resource files', () => {
  const records = loadCanonicalResources(root);
  assert.equal(records.length, 514);
  validateResourceSet(records);
  assert.equal(new Set(records.map(r => r.urls.canonical)).size, records.length);
  assert.ok(records.every(r => RESOURCE_KINDS.includes(r.kind)));
});

test('IDs are readable, stable-looking and independent of URL hashing', () => {
  assert.equal(slugify('CinePrint35'), 'cineprint35');
  assert.equal(slugify('DaVinci Resolve / Studio'), 'davinci-resolve-studio');
  const records = loadCanonicalResources(root);
  assert.ok(records.every(r => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id)));
  assert.ok(records.every(r => !r.id.startsWith('legacy-')));
});

test('canonical records preserve the current evidence and metadata joins', () => {
  const records = loadCanonicalResources(root);
  const postSync = records.find(r => r.name === 'PostSync');
  assert.ok(postSync);
  assert.equal(postSync.urls.canonical, 'https://chrisroyfilms.com/postsync/');
  assert.ok(postSync.tags.length >= 2);
  assert.ok(postSync.evidence.every(e => e.source.startsWith('https://')));
  assert.ok(Array.isArray(postSync.history));
});

test('generated canonical files, when present, contain one record per index entry', () => {
  const indexPath = path.join(root, 'data/resources/index.json');
  if (!fs.existsSync(indexPath)) return;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assert.equal(index.entries.length, 514);
  for (const entry of index.entries) assert.ok(fs.existsSync(path.join(root, 'data/resources', `${entry.id}.json`)));
});

test('site builder emits permanent canonical IDs', () => {
  const data = buildSite();
  const utility = data.entries.find(entry => entry.url === 'https://github.com/thatcherfreeman/utility-dctls');
  assert.equal(utility.id, 'utility-dctls');
  assert.equal(data.entries.filter(entry => /^[a-f0-9]{12}$/.test(entry.id)).length, 0);
});

test('canonical resolver accepts permanent IDs and documented previous URL aliases', () => {
  const records = loadCanonicalResources(root);
  const original = records.find(record => record.id === 'utility-dctls');
  const renamed = records.map(record => record === original ? { ...record, urls: { ...record.urls, previous: ['https://example.com/old-utility-dctls'] } } : record);
  assert.equal(findCanonicalResource(renamed, 'utility-dctls').urls.canonical, original.urls.canonical);
  assert.equal(findCanonicalResource(renamed, 'https://example.com/old-utility-dctls').id, 'utility-dctls');
  assert.equal(resolveCanonicalResource(root, original.urls.canonical).id, 'utility-dctls');
  assert.equal(findCanonicalResource(records, 'missing-resource'), null);
});

test('canonical validation rejects duplicate previous URL aliases', () => {
  const records = loadCanonicalResources(root);
  const alias = 'https://example.com/shared-alias';
  const invalid = records.map((record, index) => index < 2 ? { ...record, urls: { ...record.urls, previous: [alias] } } : record);
  assert.throws(() => validateResourceSet(invalid), /Duplicate resource URL\/alias/);
});
