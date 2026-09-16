import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
import {APPROVED_KIND_REVIEW} from './apply-kind-review.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const kind=process.argv[process.argv.indexOf('--kind')+1]||'other';
const records=loadCanonicalResources(root).filter(record=>record.kind===kind).map(record=>({id:record.id,name:record.name,category:record.category,url:record.urls.canonical,review:'manual taxonomy review required'}));
if(process.argv.includes('--write-report')){
  if(kind!=='other')throw new Error('--write-report only supports --kind other');
  const report={schema_version:1,review_date:'2026-09-16',approved_mappings:Object.keys(APPROVED_KIND_REVIEW).length,retained_other:records.map(record=>({...record,decision:'retain-other',reason:'Maintained source evidence does not establish a specific supported package format.'}))};
  fs.writeFileSync(path.join(root,'data/taxonomy-review.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Wrote local taxonomy decision report for ${records.length} retained-other records.`);
}else if(process.argv.includes('--json'))console.log(JSON.stringify({kind,count:records.length,records},null,2));
else {console.log(`Found ${records.length} ${kind} records.`);for(const record of records)console.log(`${record.id}\t${record.name}\t${record.category}\t${record.url}`);}
