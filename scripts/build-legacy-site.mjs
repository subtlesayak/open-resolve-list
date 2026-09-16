import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'site'),target=path.join(root,'.legacy-site');
const destination='https://subtlesayak.github.io/open-resolve-list/';
const notice=`<aside aria-label="Website move" style="padding:16px 20px;margin:16px;border:2px solid currentColor;border-radius:8px;line-height:1.6"><strong>We're moving to Open Resolve List.</strong> Your saved app or bookmark still works here. <a href="${destination}" style="color:inherit;text-decoration:underline;font-weight:700">Open the new website</a> for the latest catalogue updates. Save or install the new address when you're ready.</aside>`;

export function legacyHtml(html){
 // Keep the app at its saved URL; only an explicit click takes visitors away.
 return html.replace(/(<body\b[^>]*>)/i,`$1\n${notice}`);
}
export function buildLegacySite(){
 fs.mkdirSync(target,{recursive:true});
 let pages=0;
 function copy(directory,relative=''){
  for(const item of fs.readdirSync(directory,{withFileTypes:true})){
   const rel=path.join(relative,item.name),input=path.join(source,rel),output=path.join(target,rel);
   if(item.isDirectory()){fs.mkdirSync(output,{recursive:true});copy(input,rel);continue;}
   if(item.name.endsWith('.html')){fs.writeFileSync(output,legacyHtml(fs.readFileSync(input,'utf8')));pages++;}
   else fs.copyFileSync(input,output);
  }
 }
 copy(source);
 fs.writeFileSync(path.join(target,'.nojekyll'),'');
 fs.writeFileSync(path.join(target,'README.md'),'# Open Resolve List — previous website address\n\nCompatibility copy for saved apps and bookmarks at https://subtlesayak.github.io/subtle-resolve-list/.\n\nThe maintained project and latest catalogue are at https://github.com/subtlesayak/open-resolve-list and https://subtlesayak.github.io/open-resolve-list/. This copy keeps the catalogue usable and displays a move notice; it does not redirect automatically.\n');
 for(const name of ['LICENSE','NOTICE.md'])if(fs.existsSync(path.join(root,name)))fs.copyFileSync(path.join(root,name),path.join(target,name));
 console.log(`Built compatibility site with ${pages} pages and a migration notice.`);
 return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildLegacySite();
