import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const kind=process.argv[process.argv.indexOf('--kind')+1]||'other';
const records=loadCanonicalResources(root).filter(record=>record.kind===kind).map(record=>({id:record.id,name:record.name,category:record.category,url:record.urls.canonical,review:'manual taxonomy review required'}));
if(process.argv.includes('--json'))console.log(JSON.stringify({kind,count:records.length,records},null,2));
else {console.log(`Found ${records.length} ${kind} records.`);for(const record of records)console.log(`${record.id}\t${record.name}\t${record.category}\t${record.url}`);}
