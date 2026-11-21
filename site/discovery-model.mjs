import {setupSourceLinks,setupExclusions} from './compatibility-evidence.mjs';
import {normalizeSearch,compareVersions,evidenceCoverage} from './model.mjs';

// Discovery labels summarize reviewed catalogue text; they do not add compatibility facts.
const capabilities = [
 ['automatic-subtitles','Automatic subtitles',/\b(transcrib\w*|transcript\w*|speech to text|speech recognition|whisper|auto subs)\b/],
 ['subtitle-import','Subtitle import',/\b(caption import|import caption|import srt|srt import\w*)\b/],
 ['subtitle-translation','Subtitle translation',/\btranslat\w*\b/],
 ['film-emulation','Film emulation',/\b(film emulation|film look|film print|kodak|fuji|film stock|print emulation)\b/],
 ['color-diagnostics','Color diagnostics',/\b(diagnostic|diagnostics|point cloud|color chart|test chart|gamut visualization)\b/],
 ['log-conversion','Log conversion',/\b(d log|dlog|log conversion|log to|log transform|action camera)\b/],
 ['noise-reduction','Noise reduction',/\b(denoise|denoising)\b/],
 ['audio-levels','Audio levels',/\b(loudness|normalization|audio levels|audio meters)\b/],
 ['media-organization','Media organization',/\b(organize|organization|metadata|media management|tagging)\b/],
 ['titles','Titles and typography',/\b(title|titles|typography|text animation)\b/],
 ['transitions','Transitions',/\b(transition|transitions)\b/],
 ['stabilization','Stabilization',/\b(stabilization|stabilize|gyro|gyroflow)\b/],
];
const captionCapabilities=new Set(['automatic-subtitles','subtitle-import','subtitle-translation']);
const capabilityCache=new WeakMap();
export function resourceCapabilities(entry) {
 if(capabilityCache.has(entry))return capabilityCache.get(entry);
 const text=normalizeSearch([entry.name,entry.description,...(entry.tags||[])].join(' '));
 const hasCaptions=/\b(caption|srt)\b/.test(text);
 const result=capabilities.filter(([id, , pattern])=>pattern.test(text)&&(!captionCapabilities.has(id)||hasCaptions))
  .map(([id,label])=>({id,label}));
 capabilityCache.set(entry,result);
 return result;
}
const capabilityTags=new Set(['backup','timecode','reframing','tracking','audio sync','multicam','lens correction','grain','halation','skin retouching','diarization','keyboard shortcuts','media relinking','proxy generation','subtitle translation','retouching','deflicker','debanding','relighting','stereoscopic']);
export function sharedCapabilities(a,b) {
 const ids=new Set(resourceCapabilities(a).map(item=>item.id));
 const explicit=resourceCapabilities(b).filter(item=>ids.has(item.id)).map(item=>item.label);
 if(explicit.length)return explicit;
 // A substantive exact reviewed tag may also establish a shared job.
 const tags=new Set((a.tags||[]).map(normalizeSearch).filter(tag=>capabilityTags.has(tag)));
 return (b.tags||[]).map(normalizeSearch).filter(tag=>tags.has(tag)&&capabilityTags.has(tag));
}
export const SETUP_KEY='open-resolve-my-setup-v1';
export function validateSetup(value={}) {
 const choose=(key,allowed)=>allowed.includes(value?.[key])?value[key]:'';
 return {edition:choose('edition',['','Free','Studio']),version:typeof value?.version==='string'&&/^\d{1,2}(?:\.\d{1,2}){0,2}$/.test(value.version)?value.version:'',platform:choose('platform',['','Windows','macOS','Linux','iPadOS']),architecture:choose('architecture',['','x64','arm64'])};
}
export function readSetup(storage) {try{return validateSetup(JSON.parse(storage.getItem(SETUP_KEY)||'{}'));}catch{return validateSetup();}}
export function assessSetup(entry,setup) {
 const r=entry.requirements,unknown=[],conflicts=[],matched=[],checks=[],notes=[];
 const exclusions=setupExclusions(entry);
 const check=(key,label,selected,status,note='')=>{
  if(!selected)return;
  const sources=setupSourceLinks(entry,key);
  if(!sources.length)status='unknown';
  ({unknown,conflict:conflicts,match:matched})[status].push(label);
  checks.push({key,label,selected,status,sources,note});if(note)notes.push(note);
 };
 const listed=(key,label,selected,values)=>check(key,label,selected,
  exclusions[key]?.includes(selected)?'conflict':values.includes(selected)?'match':'unknown',
  selected&&!values.includes(selected)&&!exclusions[key]?.includes(selected)?'Not listed does not mean unsupported.':'');
 listed('platforms','operating system',setup.platform,entry.platforms);
 const editionStatus=r.editions.includes(setup.edition)?'match':setup.edition==='Free'&&r.editions.includes('Studio')?'conflict':'unknown';
 check('editions','edition',setup.edition,editionStatus,
  setup.edition==='Studio'&&r.editions.includes('Free')&&!r.editions.includes('Studio')?'Free support is documented; Studio support has not been separately established.':'');
 listed('architectures','architecture',setup.architecture,r.architectures);
 if(setup.version){
  const ranges=r.resolve.filter(v=>!v.edition||v.edition===setup.edition);
  const scopedOnly=!setup.edition&&r.resolve.length&&!r.resolve.some(v=>!v.edition);
  const status=!ranges.length||scopedOnly?'unknown':ranges.some(v=>(!v.min||compareVersions(setup.version,v.min)>=0)&&(!v.max||compareVersions(setup.version,v.max)<=0))?'match':'conflict';
  check('resolve','Resolve version',setup.version,status,scopedOnly?'Choose an edition to assess its documented version range.':'');
 }
 return {label:conflicts.length?'Documented incompatibility':unknown.length||!matched.length?'Requirements unknown':'Documented match',kind:conflicts.length?'no':unknown.length||!matched.length?'maybe':'yes',unknown,conflicts,matched,checks,notes:[...new Set(notes)],scope:'Selected fields only; not an installation test.'};
}
const stop=new Set(['i','need','want','a','an','the','for','on','with','to','from','in','into','style','look','automatic','auto','free','paid','windows','macos','mac','linux','ipados','davinci','resolve','studio','and','my','of']);
const resolveVersion=/\b(?:davinci\s+)?resolve(?:\s+(free|studio))?(?:\s+(\d{1,2}(?:\.\d{1,2}){0,2})(?![\w.])(?:\s+(free|studio))?)?/i;

export function workflowIntent(query) {
 const specification=resolveVersion.exec(query);
 const editionWord=(specification?.[1]||specification?.[3]||'').toLowerCase();
 const edition=editionWord==='free'?'Free':editionWord==='studio'?'Studio':'';
 const version=specification?.[2]||'';
 const text=normalizeSearch(query.replace(resolveVersion,' '));
 const hasCaptions=/\b(caption|srt)\b/.test(text);
 const importing=hasCaptions&&/\bimport\w*\b/.test(text);
 const translating=hasCaptions&&/\btranslat\w*\b/.test(text);
 const automatic=/\b(transcri\w*|speech to text|speech recognition|whisper)\b/.test(text)||
  (/\bcaption\b/.test(text)&&!importing&&!translating);
 const candidates=[];
 if(automatic)candidates.push('automatic-subtitles');
 if(importing)candidates.push('subtitle-import');
 if(translating)candidates.push('subtitle-translation');
 if(/\b(kodak|fuji|film|emulation)\b/.test(text))candidates.push('film-emulation');
 if(/\b(d log|action camera|dlog)\b/.test(text))candidates.push('log-conversion');
 const access=/\bfree\b/.test(text)?'free':/\bpaid\b/.test(text)?'paid':'';
 const platform=/\bwindows\b/.test(text)?'Windows':/\b(mac|macos)\b/.test(text)?'macOS':/\blinux\b/.test(text)?'Linux':/\bipados\b/.test(text)?'iPadOS':'';
 let terms=text;
 if(importing)terms=terms.replace(/\b(import\w*|files?)\b/g,' ');
 if(translating)terms=terms.replace(/\btranslat\w*\b/g,' ');
 if(automatic)terms=terms.replace(/\b(speech to text|speech recognition|transcri\w*)\b/g,' ');
 const words=terms.split(' ').filter(word=>word&&!stop.has(word)&&!['caption','film','emulation'].includes(word));
 return {capability:candidates.length===1?candidates[0]:'',ambiguous:candidates.length>1,candidates,access,platform,edition,version,words};
}

export function findWorkflow(entries,query,setup={}) {
 const nameQuery=normalizeSearch(query).replaceAll(' ','');
 if(!nameQuery)return [];
 const intent=workflowIntent(query);
 if(intent.ambiguous)return [];
 const requestedSetup=validateSetup({
  ...setup,
  platform:intent.platform||setup.platform,
  edition:intent.edition||setup.edition,
  version:intent.version||setup.version,
 });
 return entries.filter(e=>!e.official).flatMap(entry=>{
  const exact=normalizeSearch(entry.name).replaceAll(' ','')===nameQuery;
  const caps=resourceCapabilities(entry),text=normalizeSearch([entry.name,entry.description,...(entry.tags||[])].join(' '));
  if(!exact&&intent.capability&&!caps.some(c=>c.id===intent.capability))return [];
  if(!exact&&!intent.words.every(word=>text.includes(word)))return [];
  if(intent.access&&entry.accessGroup!==intent.access)return [];
  const verdict=assessSetup(entry,requestedSetup);
  if(intent.platform&&verdict.conflicts.includes('operating system'))return [];
  const reasons=[...(exact?['Exact tool name']:[]),...caps.filter(c=>!intent.capability||c.id===intent.capability).map(c=>c.label),...(intent.access?['Catalogue access: '+intent.access]:[])];
  if(!reasons.length)reasons.push('Reviewed catalogue text matches your terms');
  return [{entry,reasons,verdict,score:(exact?100:0)+(verdict.kind==='yes'?10:verdict.kind==='maybe'?3:-10)+(entry.accessGroup==='free'?2:0)+evidenceCoverage(entry).established}];
 }).sort((a,b)=>b.score-a.score||a.entry.name.localeCompare(b.entry.name));
}
