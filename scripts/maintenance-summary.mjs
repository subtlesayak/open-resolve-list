import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const dir=path.join(root,'.research','update-check');
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>name.endsWith('.json')&&!/-\d+\.json$/.test(name)).sort():[];
const rows=[];
for(const name of files){
 const value=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
 const items=Array.isArray(value)?value:(value&&Array.isArray(value.results)?value.results:[]);
 const counts={};
 for(const item of items){const key=item.status||'unknown';counts[key]=(counts[key]||0)+1;}
 rows.push(`| ${name} | ${items.length} records | ${Object.entries(counts).map(([key,count])=>`${key}: ${count}`).join(', ')||'no records'} |`);
}
console.log('## Weekly catalogue maintenance check');
console.log(`Checked ${new Date().toISOString()} · ${files.length} local research outputs scanned.`);
console.log('');
console.log('| Output | Records | Status summary |');
console.log('| --- | ---: | --- |');
console.log(rows.join('\n')||'| — | 0 | No output was produced |');
console.log('');
console.log('Review candidates locally before changing catalogue facts. Raw research stays on the runner and is not committed or uploaded.');
