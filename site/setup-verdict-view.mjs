// All content comes from structured assessment results and is inserted as text.
export function setupVerdictView(verdict,{heading=false,entryId=''}={}) {
 const box=document.createElement('section');box.className='setup-assessment';
 const title=document.createElement(heading?'h3':'p');title.className='setup-status setup-'+verdict.kind;title.textContent=verdict.label;box.append(title);
 const summary=document.createElement('p');summary.className='muted';summary.textContent=[verdict.matched.length?'Matched: '+verdict.checks.filter(check=>check.status==='match').map(check=>check.label+' ('+check.selected+')').join(', '):'',verdict.conflicts.length?'Conflicting: '+verdict.conflicts.join(', '):'',verdict.unknown.length?'Unknown: '+verdict.unknown.join(', '):'',verdict.scope].filter(Boolean).join(' · ');box.append(summary);
 for(const note of verdict.notes||[]){const p=document.createElement('p');p.className='muted';p.textContent=note;box.append(p);}
 const sources=document.createElement('p');sources.className='source-link';const seen=new Set();
 for(const check of verdict.checks||[])for(const source of check.sources){if(seen.has(check.key+source.url))continue;seen.add(check.key+source.url);const a=document.createElement('a');try{const url=new URL(source.url,location.href);if(url.protocol!=='https:'&&url.origin!==location.origin)continue;a.href=url.href;}catch{continue;}a.textContent=check.label+' source';if(source.checked_at)a.title='Recorded '+source.checked_at.slice(0,10);if(sources.childNodes.length)sources.append(document.createTextNode(' · '));sources.append(a);}
 if(!sources.childNodes.length&&entryId){const a=document.createElement('a');a.href='resource/'+encodeURIComponent(entryId)+'/';a.textContent='Review documented requirements';sources.append(a);}
 if(sources.childNodes.length)box.append(sources);return box;
}
