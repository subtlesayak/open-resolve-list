// Field mappings describe the scope of existing canonical evidence, not new facts.
const reviewedScopes = {
 '3d-cube-dctl-and-cube-slice': {
  'https://mononodes.com/faq/': ['editions', 'resolve'],
 },
 barkted: {
  'https://github.com/TeddieWang/BarkTed#readme': ['editions', 'resolve', 'architectures'],
 },
};
export const SETUP_FIELDS = {platforms:1, editions:2, resolve:4, architectures:8};
const aliases = {
 platforms:['platforms'], editions:['editions','resolve edition','resolve edition and version range'],
 resolve:['resolve','resolve version','resolve edition and version range'],
 architectures:['architectures','architecture'], processing:['processing'],
 version:['version','tool version','repository revision'], installation:['installation'],
};
export function fieldEvidence(entry,key) {
 return (entry.evidence||[]).filter(item => {
  if (!['documented','creator','tested'].includes(item.level) || !/^https:\/\//.test(item.source||'')) return false;
  const field=String(item.field).toLowerCase();
  return aliases[key]?.includes(field) || reviewedScopes[entry.id]?.[item.source]?.includes(key);
 });
}
export function setupEvidenceMask(entry) {
 return Object.entries(SETUP_FIELDS).reduce((mask,[key,bit])=>mask|(fieldEvidence(entry,key).length?bit:0),0);
}
export function setupExclusions(entry) {
 if(entry.setupExclusions)return entry.setupExclusions;
 // This canonical note explicitly excludes these installer targets. A positive
 // platform/build list alone is never treated as an exhaustive exclusion list.
 if(entry.id==='barkted' && (entry.evidence||[]).some(item=>
  item.source==='https://github.com/TeddieWang/BarkTed#readme' &&
  item.note?.includes('Intel Macs, Windows and Linux are not supported by this installer.')))
  return {platforms:['Windows','Linux'],architectures:['x64']};
 return {};
}
export function setupSourceLinks(entry,key) {
 const sources=fieldEvidence(entry,key).map(item=>({url:item.source,label:'Original source',checked_at:item.checked_at}));
 if(sources.length)return sources;
 if((entry.setupEvidence||0)&SETUP_FIELDS[key])return [{url:'resource/'+encodeURIComponent(entry.id)+'/#evidence-'+key,label:'View field sources'}];
 return [];
}
