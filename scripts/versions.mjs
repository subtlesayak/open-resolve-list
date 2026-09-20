import {fileURLToPath} from 'node:url';
import {loadCanonicalResources} from './canonical-source.mjs';
let cached=null;
export function resetVersions(){cached=null;}
export function versionFor(url){
 if(!cached)cached=new Map(loadCanonicalResources(fileURLToPath(new URL('..',import.meta.url))).map(r=>[r.urls.canonical,r.version]));
 return cached.get(url)||null;
}
export function versionLabel(url){
  const e=versionFor(url);
  if(e?.kind==='not-applicable')return '🏷️ Version not applicable (reference or collection)';
 if(!e?.version)return '🏷️ Version not established';
 const name=e.kind==='commit'?`Revision ${e.version.slice(0,12)} (no published release)`:e.version+(e.kind==='prerelease'?' (prerelease)':e.kind==='package-version'?' (package)':e.kind==='reference-edition'?' (document edition)':'');
 return `🏷️ [${name.replace(/[\[\]|<>]/g,'').replace(/[\r\n]/g,' ')}](${e.source})`;
}
