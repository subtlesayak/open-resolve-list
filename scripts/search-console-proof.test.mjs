import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('./stage-search-console-proof.mjs', import.meta.url));
const name = 'google-test-only.html';
const bytes = Buffer.from(`google-site-verification: ${name}\r\n`);

test('Pages verification staging is optional, byte-exact and refuses filename collisions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pages-verification-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const site = join(root, 'site');
  const target = join(site, name);
  await mkdir(site);

  const run = proof => spawnSync(process.execPath, [script], {
    cwd: root,
    env: {...process.env, PAGES_VERIFICATION_HTML: proof},
    encoding: 'utf8',
  });

  assert.equal(run('').status, 0);
  assert.deepEqual(await readdir(site), []);

  for (const invalid of ['invalid base64', Buffer.from('google-site-verification: ../index.html').toString('base64')]) {
    assert.notEqual(run(invalid).status, 0);
    assert.deepEqual(await readdir(site), []);
  }

  const proof = bytes.toString('base64');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = run(proof);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.deepEqual(await readdir(site), [name]);
    assert.deepEqual(await readFile(target), bytes);
  }

  await writeFile(target, 'existing file');
  assert.notEqual(run(proof).status, 0);
  assert.equal(await readFile(target, 'utf8'), 'existing file');
});
