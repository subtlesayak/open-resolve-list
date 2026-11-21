import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const proof = process.env.PAGES_VERIFICATION_HTML;
if (proof) {
  // Base64 preserves the bytes of the original download, including its line endings.
  const bytes = Buffer.from(proof, 'base64');
  if (bytes.length > 1024 || bytes.toString('base64') !== proof) {
    throw new Error('Invalid Search Console verification file encoding');
  }
  const name = /^google-site-verification: (google[A-Za-z0-9_-]+\.html)(?:\r?\n)*$/.exec(bytes.toString('utf8'))?.[1];
  if (!name || name.length > 120) {
    throw new Error('Expected the original Google HTML verification file');
  }

  const target = resolve('site', name);
  try {
    await writeFile(target, bytes, {flag: 'wx'});
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (!(await readFile(target)).equals(bytes)) {
      throw new Error('The Search Console verification file would overwrite a different site file');
    }
  }
}
