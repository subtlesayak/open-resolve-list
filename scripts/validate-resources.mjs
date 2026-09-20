import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const records=loadCanonicalResources(root);
if(!records.length)throw Error('Empty canonical catalogue');
console.log(`Validated ${records.length} canonical resource files; ${new Set(records.map(record=>record.kind)).size} formats.`);
