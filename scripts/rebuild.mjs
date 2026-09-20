import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const steps=[
 ['validate-resources.mjs'],
 ['export-compatibility.mjs'],
 ['build-catalogue.mjs'],
 ['build-site.mjs'],
];

for(const [script,...args] of steps){
 const result=spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,stdio:'inherit',windowsHide:true});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}

console.log('Local catalogue rebuild completed. No publishing or upload was performed.');
