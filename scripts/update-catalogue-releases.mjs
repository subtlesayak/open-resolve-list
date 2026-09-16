import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const pages=JSON.parse(execFileSync('gh',['api','repos/subtlesayak/open-resolve-list/releases?per_page=100','--paginate','--slurp'],{encoding:'utf8'}));
const releases=pages.flat().filter(r=>!r.draft).map(r=>({version:r.tag_name,title:r.name,url:r.html_url,date:r.published_at,body:r.body||''})).sort((a,b)=>b.date.localeCompare(a.date));
fs.writeFileSync(new URL('../data/catalogue-releases.json',import.meta.url),JSON.stringify({checked_at:new Date().toISOString().slice(0,10),releases},null,2)+'\n');
console.log('Cached '+releases.length+' public catalogue releases.');
