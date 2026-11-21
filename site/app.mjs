import './table-scroll.mjs?v=1';
import {setupVerdictView} from './setup-verdict-view.mjs';
import {assessSetup,readSetup,sharedCapabilities} from './discovery-model.mjs';
import {loadCatalogue} from './catalogue-loader.mjs?v=1';
import {createDetailLoader} from './detail-loader.mjs?v=1';
const loadDetail=createDetailLoader();
let detailRequest=0;
if(['#updates','#about'].includes(location.hash))location.replace(location.hash.slice(1)+'.html');
import {DEFAULTS,UNFILTERED,TASKS,FORMAT_LABELS,collectResolveVersions,LEVELS,MAX_COMPARE,evidenceCoverage,filterEntries,sortEntries,relativeDate,versionText,stateFromUrl,stateToUrl,comparisonFromUrl,comparisonToUrl,comparisonCompatible,relatedResources,facetCounts,adaptTaskSelection,recoveryOptions} from './model.mjs?v=17';
const $=s=>document.querySelector(s), make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const link=(text,url)=>{if(url==='https://www.blackmagicdesign.com/api/support/us/downloads.json'){url='https://www.blackmagicdesign.com/support/family/davinci-resolve-and-fusion';if(text==='Upstream source')text='Official downloads & release notes';}const a=make('a',text);try{if(new URL(url,location.href).protocol==='https:')a.href=url;}catch{}return a;};
function originalLink(label, entry, placement) {
 const anchor = link(label, entry.url);
 anchor.classList.add('source-cta');
 Object.assign(anchor.dataset, {analyticsEvent: 'tool_outbound_click', analyticsId: entry.id, analyticsPlacement: placement});
 return anchor;
}
let collectionIds=null;
let data,state={...DEFAULTS},comparison=[],limit=30,lastFocus=null,lastCompareFocus=null;
const reqText=(e,k)=>{const r=e.requirements;if(k==='editions')return r.editions.join(' / ')||'Not established';if(k==='resolve')return r.resolve.map(v=>(v.edition?v.edition+' ':'')+(v.min===v.max?v.min:(v.min||'Any')+(v.max?'–'+v.max:'+'))).join('; ')||'Not established';if(k==='architectures')return r.architectures.join(' / ')||'Not established';return ({local:'Local workflow documented',cloud:'Cloud service',hybrid:'Local and online features',free:'Free',mixed:'Mixed options','one-time':'One-time license',subscription:'Subscription',unknown:'Not established'})[r[k]]||r[k]||'Not established';};
function notify(message){$('#notice').textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').textContent='',4500);}
function syncUrl(){const q=stateToUrl(state),compare=comparisonToUrl(comparison),params=[q,compare?'compare='+encodeURIComponent(compare):''].filter(Boolean).join('&');history.replaceState(null,'',location.pathname+(params?'?'+params:'')+location.hash);}
function setState(patch){
  let next={...state,...patch}, cleared=[];
  if(Object.keys(patch).length===1 && patch.task && patch.task!==state.task) {
    const adapted=adaptTaskSelection(data.entries,next);next=adapted.state;cleared=adapted.cleared;
  }
  state=next;limit=30;syncUrl();try{localStorage.setItem('open-resolve-setup',JSON.stringify({platform:state.platform,edition:state.edition,resolve:state.resolve}));}catch{}render();
  if(cleared.length)notify('Task changed. Cleared filters with no matching resources: '+cleared.map(k=>filterNames[k]).join(', ')+'.');
}
function enableBackdropClose(dialog) {
  let startedOutside = false;
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  dialog.addEventListener('pointerdown', event => { startedOutside = event.button === 0 && outside(event); });
  dialog.addEventListener('pointercancel', () => { startedOutside = false; });
  dialog.addEventListener('click', event => {
    if (startedOutside && outside(event)) dialog.close();
    startedOutside = false;
  });
  dialog.addEventListener('close', () => { startedOutside = false; });
}
function openDialog(title){lastFocus=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').replaceChildren();$('#detail-dialog').showModal();$('#dialog-close').focus();}
function reserveCompareSpace() {
 const tray = $('#compare-tray');
 const inset = tray.hidden ? 0 : Math.ceil(innerHeight - tray.getBoundingClientRect().top) + 8;
 document.documentElement.style.setProperty('--compare-inset', inset + 'px');
}
function renderCompareTray() {
 const count = comparison.length;
 const tray = $('#compare-tray');
 tray.hidden = count === 0;
 const selection = count + ' of ' + MAX_COMPARE + ' selected';
 const help = count === 1 ? 'Choose one more similar tool.' : 'Only similar tools can be compared.';
 $('#compare-count').textContent = selection;
 $('#compare-help').textContent = help;
 $('#compare-open').disabled = count < 2;
 const status = count ? selection + '. ' + (count === 1 ? help : 'Compare selected is available.') : '';
 if ($('#compare-status').textContent !== status) $('#compare-status').textContent = status;
 reserveCompareSpace();
}
function toggleCompare(entry, checked) {
 if (checked) {
  const selected = comparison.map(id => data.entries.find(item => item.id === id)).filter(Boolean);
  if (!comparisonCompatible(entry, selected)) {
   notify('Choose alternatives with a shared capability. A shared format alone does not establish similarity.');
   return;
  }
  if (comparison.length >= MAX_COMPARE) {
   notify('Compare up to ' + MAX_COMPARE + ' resources at a time.');
   return;
  }
  if (!comparison.includes(entry.id)) comparison = [...comparison, entry.id];
 } else {
  comparison = comparison.filter(id => id !== entry.id);
 }
 syncUrl();
 render();
 const checkbox = $('#results article[data-resource-id="' + entry.id + '"] .compare-control input');
 checkbox?.focus({preventScroll:true});
 checkbox?.scrollIntoView({block:'nearest'});
}
function showMoreResults() {
 const results = $('#results');
 const previous = results.querySelectorAll('.resource-page-link').length;
 limit += 30;
 render();
 const links = results.querySelectorAll('.resource-page-link');
 const added = links.length - previous;
 if (added <= 0) return;
 const firstNewResult = links[previous];
 firstNewResult.focus({preventScroll:true});
 firstNewResult.scrollIntoView({block:'start', inline:'nearest'});
 const status = $('#pagination-status');
 status.textContent = 'Showing ' + links.length + ' resources. ' + added + ' added.';
}
function csvCell(value){return '"'+String(value??'').replaceAll('"','""')+'"';}
function exportComparison(){const entries=comparison.map(id=>data.entries.find(entry=>entry.id===id)).filter(Boolean);const rows=[['Field',...entries.map(entry=>entry.name)],['Category',...entries.map(entry=>entry.category)],['Format',...entries.map(entry=>entry.kind)],['Access',...entries.map(entry=>entry.access)],['Platforms',...entries.map(entry=>entry.platforms.join(' · ')||'Not established')],['Resolve edition',...entries.map(entry=>reqText(entry,'editions'))],['Resolve version',...entries.map(entry=>reqText(entry,'resolve'))],['Evidence',...entries.map(entry=>{const coverage=evidenceCoverage(entry);return coverage.established+' / '+coverage.total+' fields established';})]];const blob=new Blob([rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=make('a');anchor.href=url;anchor.download='resolve-resource-comparison.csv';anchor.click();URL.revokeObjectURL(url);}
function comparisonTableView(table) {
 const group = make('div', undefined, 'compare-table-group');
 const scroller = make('div', undefined, 'table-scroll compare-table-scroll');
 scroller.tabIndex = 0;
 scroller.setAttribute('role', 'region');
 scroller.setAttribute('aria-label', table.caption.textContent + ' table');
 scroller.append(table);
 group.append(make('p', 'Scroll sideways or use the arrow keys to see more columns.', 'compare-scroll-hint muted'), scroller);
 return group;
}
function openComparison(event){
 const entries=comparison.map(id=>data.entries.find(entry=>entry.id===id)).filter(Boolean);
 if(entries.length<2){notify('Select at least two similar resources to compare.');return;}
 if(entries.some((entry,index)=>entries.slice(index+1).some(other=>!comparisonCompatible(other,[entry])))){notify('These resources are not similar enough to compare.');return;}
 let savedSetup={};try{savedSetup=readSetup(localStorage);}catch{}
 const body=$('#compare-body');body.replaceChildren();
 body.append(make('p','Alternatives share a specific capability. Check each source for requirements and limitations.','compare-note'));
 const rows=[
  ['Category',entry=>entry.category||'Not established'],
  ['Format',entry=>entry.kind||'Not established'],
  ['Access',entry=>entry.access||'Not established',null,'Tool access and pricing are separate from the Resolve licence you need.'],
  ['Platforms',entry=>entry.platforms.join(' · ')||'Not established','platforms','These are recorded platform targets. A platform missing from a list needs further review.'],
  ['Resolve edition',entry=>reqText(entry,'editions'),'editions','A documented Studio requirement can rule out Free. Missing edition evidence remains unknown.'],
  ['Resolve version',entry=>reqText(entry,'resolve'),'resolve','These ranges concern the Resolve host version. Edition-specific ranges need the corresponding edition.'],
  ['Architecture',entry=>reqText(entry,'architectures'),'architectures','Check the build target for your processor. Missing architecture support remains unknown.'],
  ['Processing',entry=>reqText(entry,'processing'),'processing','Review local, cloud or hybrid processing before sending media to a service.'],
  ['Shared capability',entry=>sharedCapabilities(entry,entries.find(e=>e.id!==entry.id)).join(' · ')],
  ['Evidence',entry=>{const coverage=evidenceCoverage(entry);return coverage.established+' / '+coverage.total+' fields established';}],
 ];
 const citation=(entry,key)=>{const a=make('a',entry.name+' sources');a.href='resource/'+encodeURIComponent(entry.id)+'/'+(key?'#evidence-'+key:'');return a;};
 const table=make('table',undefined,'compare-table');table.append(make('caption','Side-by-side comparison'));
 const head=make('thead'),headRow=make('tr');headRow.append(make('th','Resource'));
 for(const entry of entries){const cell=make('th',entry.name);cell.scope='col';headRow.append(cell);}head.append(headRow);table.append(head);
 const tbody=make('tbody'),explanations=make('section');explanations.className='comparison-differences';explanations.append(make('h3','Material differences'));
 let differences=0;
 for(const [label,value,key,explanation]of rows){
  const row=make('tr'),same=new Set(entries.map(value)).size===1,header=make('th',label);header.scope='row';row.append(header);row.dataset.same=String(same);
  for(const entry of entries){const cell=make('td',value(entry));cell.append(document.createTextNode(' '),citation(entry,key));row.append(cell);}
  tbody.append(row);
  if(!same&&explanation){
   differences++;const p=make('p');p.append(make('strong',label+': '),document.createTextNode(explanation+' '));
   entries.forEach((entry,index)=>{if(index)p.append(document.createTextNode(' · '));p.append(document.createTextNode(entry.name+' — '+value(entry)+' '),citation(entry,key));});explanations.append(p);
  }
 }
 if(!differences)explanations.append(make('p','No material differences are recorded in these fields. Review each tool’s sources for limitations that are not captured in the table.'));
 table.append(tbody);const differencesLabel=make('label','Differences only'),toggle=make('input');toggle.type='checkbox';
 toggle.addEventListener('change',()=>{for(const row of tbody.rows)row.hidden=toggle.checked&&row.dataset.same==='true';});differencesLabel.prepend(toggle);
 body.append(differencesLabel,comparisonTableView(table),explanations);
 if(Object.values(savedSetup).some(Boolean))for(const entry of entries){const section=make('section');section.append(make('h3',entry.name),setupVerdictView(assessSetup(entry,savedSetup),{entryId:entry.id}));body.append(section);}
 const related=make('section',undefined,'related-resources');related.append(make('h3','Related resources'));
 for(const entry of entries){
  const item=make('p');item.append(make('strong',entry.name),document.createTextNode(': '));
  const alternatives=relatedResources(entry,data.entries,3,savedSetup);
  alternatives.forEach((other,index)=>{if(index)item.append(document.createTextNode(' · '));const a=make('a',other.name);a.href='resource/'+encodeURIComponent(other.id)+'/';item.append(a);});
  if(alternatives.length)related.append(item);
 }
 body.append(related);
 lastCompareFocus=event?.currentTarget||document.activeElement;
 $('#compare-dialog').showModal();
 body.scrollTop=0;
 document.dispatchEvent(new Event('resolve:compare-opened'));
 $('#compare-dialog-close').focus();
}
function decorateCompareControls(found) {
 const selected = comparison.map(id => data.entries.find(item => item.id === id)).filter(Boolean);
 const cards = document.querySelectorAll('#results article.resource');
 for (const [index, article] of cards.entries()) {
  const entry = found[index];
  const actions = article.querySelector('.row-actions');
  const control = make('label', 'Compare', 'compare-control outline');
  const input = make('input');
  input.type = 'checkbox';
  input.checked = comparison.includes(entry.id);
  input.disabled = !input.checked && (comparison.length >= MAX_COMPARE || !comparisonCompatible(entry, selected));
  input.setAttribute('aria-label', 'Compare ' + entry.name);
  if (input.disabled) input.setAttribute('aria-describedby', 'compare-help');
  input.addEventListener('change', event => toggleCompare(entry, event.target.checked));
  control.prepend(input);
  actions.append(control);
  if (input.checked && comparison.length >= 2) {
   const jump = make('a', 'Go to comparison', 'compare-jump sr-only');
   jump.href = '#compare-open';
   jump.addEventListener('click', event => {
    event.preventDefault();
    $('#compare-open').focus();
   });
   actions.append(jump);
  }
 }
}
function facts(e){const dl=make('dl',undefined,'facts');const fields=[['Creator',e.creator],['Platforms',e.reference?'Reference; see resource requirements':e.platforms.join(' · ')||'Not established'],['Platform caveats',e.platformNotes],['Resolve edition',reqText(e,'editions')],['Resolve version range',reqText(e,'resolve')],['Architecture',reqText(e,'architectures')],['GPU',reqText(e,'gpu')],['Access',e.access],['Payment model',reqText(e,'pricing')],['Processing',reqText(e,'processing')],['Account',reqText(e,'account')],['Dependencies',reqText(e,'dependencies')],['Installation',reqText(e,'installation')],['Tool version',versionText(e.version)],['Product release / update',e.releaseDate?relativeDate(e.releaseDate)+' · '+e.releaseDate:'Not established'],['Repository activity',e.activityDate?relativeDate(e.activityDate)+' · '+e.activityDate:'Not applicable'],['GitHub stars',e.stars===null?'Not applicable':String(e.stars)],['Testing',e.recommendation?.tested_setup]];for(const [k,v]of fields){if(v===null||v===undefined||!String(v).trim()||/^(?:[^\p{L}]*)(?:not established|not applicable|version unknown|unverified|unknown)$/iu.test(String(v).trim()))continue;dl.append(make('dt',k),make('dd',v));}return dl;}
function evidenceCoverageList(e){const coverage=evidenceCoverage(e),ul=make('ul',undefined,'evidence-coverage-list');for(const field of coverage.fields){const li=make('li');li.append(make('strong',field.label),document.createTextNode(field.known?' — Established':' — Unknown'));if(field.evidence.length){const level=field.evidence.some(item=>item.level==='tested')?'tested':field.evidence.some(item=>item.level==='creator')?'creator':'documented';li.append(document.createTextNode(' · '+LEVELS[level]));for(const source of field.evidence)li.append(document.createTextNode(' · '),link('Source',source.source));}ul.append(li);}return ul;}
function evidenceList(e){const ul=make('ul',undefined,'evidence-list');for(const x of e.evidence){const li=make('li');li.append(make('strong',LEVELS[x.level]+' — '+x.field),make('br'),link('Source',x.source),document.createTextNode(' · checked '+x.checked_at.slice(0,10)),make('br'),document.createTextNode(x.note||''));ul.append(li);}if(!e.evidence.length)ul.append(make('li','No field-level evidence established.'));return ul;}
async function details(summary,trigger=document.activeElement){openDialog(summary.name);lastFocus=trigger;const request=++detailRequest;$('#dialog-body').append(make('p','Loading details…'));let e;try{e=await loadDetail(summary.id);}catch{if(request!==detailRequest||!$('#detail-dialog').open)return;const retry=make('button','Retry','outline');retry.addEventListener('click',()=>{const trigger=lastFocus;details(summary);lastFocus=trigger;});$('#dialog-body').replaceChildren(make('p','Details could not load. Your filters are unchanged.'),retry);return;}if(request!==detailRequest||!$('#detail-dialog').open)return;$('#dialog-body').replaceChildren();const b=$('#dialog-body'),coverage=evidenceCoverage(e);b.append(make('p',e.description),originalLink('Open original resource ↗',e,'detail'),facts(e),make('h3','Documentation completeness'),make('p','Established fields: '+coverage.established+' / '+coverage.total+'. This summary describes documented metadata, not blanket compatibility or installation testing.'),evidenceCoverageList(e));const verdict=setupVerdict(e);if(verdict)b.append(setupVerdictView(verdict,{heading:true,entryId:e.id}));if(e.worksTogether?.length){b.append(make('h3','Works well together'));for(const item of e.worksTogether){const p=make('p',item.reason+' ');const a=make('a',item.name);a.href='resource/'+encodeURIComponent(item.resourceId)+'/';p.append(a);for(const source of item.sources)p.append(document.createTextNode(' · '),link('Source',source));b.append(p);}}if(e.evidence.length)b.append(make('h3','Evidence sources and limitations'),evidenceList(e));if(e.history.length)b.append(make('h3','Version history'));if(e.history.length)for(const h of e.history){const p=make('p',h.from+' → '+h.to+' · '+h.summary+' ');p.append(link('Source',h.changelogs?.[0]?.url||h.source));b.append(p);b.append(changelogView(h));}const issue=new URL('https://github.com/subtlesayak/open-resolve-list/issues/new');issue.searchParams.set('template','creator-confirmation.yml');issue.searchParams.set('title','Confirm or correct: '+e.name);b.append(link('Confirm or correct this listing ↗',issue.href));}
function setupVerdict(e){try {const setup=readSetup(localStorage);return Object.values(setup).some(Boolean)?assessSetup(e,setup):null;}catch{return null;}}
function row(entry) {
 const article = make('article', undefined, 'resource');
 article.dataset.resourceId = entry.id;
 const main = make('div');
 const heading = make('h3');
 const titleLink = make('a', entry.name, 'resource-page-link');
 titleLink.href = 'resource/' + encodeURIComponent(entry.id) + '/';
 heading.append(titleLink);

 const creator = make('p', entry.creator, 'creator');
 if (entry.creator) {
  const profile = make('a', entry.creator);
  profile.href = 'creator/' + entry.creator.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/';
  creator.replaceChildren(profile);
 }
 const tags = make('div', undefined, 'resource-tags');
 if (entry.kind) tags.append(make('span', FORMAT_LABELS[entry.kind] || entry.kind, 'resource-tag'));
 for (const task of (entry.tasks || []).slice(0, 2)) {
  if (TASKS[task]) tags.append(make('span', TASKS[task], 'resource-tag'));
 }
 main.append(heading, creator, make('p', entry.description, 'description'), tags);

 const metadata = make('div', undefined, 'metadata');
 metadata.append(
  make('p', entry.reference ? '📖 Reference' : entry.platforms.join(' · ') || 'Platforms not established'),
  make('p', entry.access),
  make('p', versionText(entry.version), 'version'),
  make('p', 'Resolve: ' + reqText(entry, 'editions') + ' · ' + reqText(entry, 'resolve')),
 );
 const coverage = evidenceCoverage(entry);
 const highest = entry.evidence.some(item => item.level === 'tested') ? 'tested'
  : entry.evidence.some(item => item.level === 'creator') ? 'creator' : entry.evidence.length ? 'documented' : 'unknown';
 const evidence = make('p', 'Documentation completeness: ' + coverage.established + '/' + coverage.total, 'evidence-label');
 evidence.title = 'Documented fields; open Details for sources and unknowns.';
 evidence.setAttribute('aria-label', coverage.established + ' of ' + coverage.total + ' evidence fields established; highest source level ' + LEVELS[highest]);
 metadata.append(evidence);
 const setup = setupVerdict(entry);
 if (setup) metadata.append(setupVerdictView(setup, {entryId: entry.id}));
 if (state.edition) {
  let edition = 'Resolve edition: requirements unknown';
  if (entry.requirements.editions.length) {
   edition = state.edition === 'Studio' && !entry.requirements.editions.includes('Studio')
    ? 'Studio: inferred from Free compatibility; not separately verified'
    : 'Resolve edition: ' + entry.requirements.editions.join(' / ');
  }
  metadata.append(make('p', edition, 'edition-status'));
 }
 if (state.sort === 'stars') metadata.append(make('p', entry.stars === null ? 'Stars not applicable' : '⭐ ' + entry.stars));
 if (state.sort === 'updated') metadata.append(make('p', 'Release: ' + relativeDate(entry.releaseDate)));
 if (state.sort === 'activity') metadata.append(make('p', 'Repo activity: ' + relativeDate(entry.activityDate)));

 const actions = make('div', undefined, 'row-actions');
 const source = originalLink(entry.official ? 'Official source ↗' : 'Creator site ↗', entry, 'browse');
 const button = make('button', 'Details', 'outline');
 button.setAttribute('aria-label', 'Details for ' + entry.name + ' by ' + entry.creator);
 button.addEventListener('click', () => details(entry, button));
 actions.append(source, button);
 article.append(main, metadata, actions);
 return article;
}

const filterNames = {kind:'Format',platform:'Operating system',edition:'Resolve edition',resolve:'Resolve version',access:'Access',processing:'Processing',evidence:'Evidence',pricing:'Payment model',architecture:'Processor architecture',q:'Search',official:'Official BMD resources',task:'Task'};
const originalOptions = new Map();

function updateFilterOptions() {
  const omitted = [];
  const taskScope = {...UNFILTERED, task:state.task, official:state.official};
  for(const select of $('#filters').querySelectorAll('select')) {
    if(!originalOptions.has(select.name)) originalOptions.set(select.name,[...select.options].map(o=>({value:o.value,label:o.textContent})));
    const options = originalOptions.get(select.name);
    const scope = select.name==='task' ? {...UNFILTERED,official:state.official} : state;
    const counts = facetCounts(data.entries,scope,select.name,options.map(o=>o.value));
    const taskCounts = facetCounts(data.entries,taskScope,select.name,options.map(o=>o.value));
    let relevant = !state.task || select.name==='task' || options.some(o=>o.value && o.value!=='unknown' && taskCounts[o.value]>0);
    if(select.name==='edition') relevant=true;
    select.parentElement.hidden = !relevant && !state[select.name];
    if(!relevant) omitted.push(filterNames[select.name]);
    for(let i=0;i<options.length;i++) {
      const {value,label} = options[i], option = select.options[i];
      option.value = value;
      option.textContent = label+' ('+counts[value]+')';
      option.hidden = !!state.task && select.name!=='task' && !!value && taskCounts[value]===0 && value!==state[select.name];
      option.disabled = !!value && counts[value]===0 && value!==state[select.name];
    }
  }
  const extra = $('.more-filters');
  extra.hidden = [...extra.querySelectorAll('label')].every(label=>label.hidden);
  $('#task-filter-note').hidden = !omitted.length;
  $('#task-filter-note').textContent = 'Not enough documented requirements for this task to offer: '+omitted.join(', ')+'.';
}

function resultAction(label, patch) {
  const button=make('button',label,'outline');
  button.type='button';
  button.addEventListener('click',()=>{setState(patch);$('#results').focus();});
  return button;
}

function renderVersionNote() {
  const note=$('#version-note');
  note.replaceChildren();
  note.hidden=true;
  if(!state.resolve) return;
  const broader=filterEntries(data.entries,{...state,resolve:''});
  const unknown=broader.filter(e=>!e.requirements.resolve.length).length;
  if(!unknown) return;
  note.hidden=false;
  note.append(make('p',unknown+' other resource'+(unknown===1?' has':'s have')+' no documented Resolve version range and '+(unknown===1?'is':'are')+' excluded. Removing this filter also includes tools documented for other versions; check Details before use.'));
  note.append(resultAction('Remove version filter ('+broader.length+' resources)',{resolve:''}));
}

function renderRecovery(empty) {
  const options=recoveryOptions(data.entries,state).filter(option=>option.key!=='resolve'||$('#version-note').hidden);
  if(!options.length) return;
  const actions=make('div',undefined,'recovery-actions');
  for(const option of options) {
    const label=option.key==='taskOnly'?'Keep task, clear search and other filters':option.key==='clear'?'Clear search and filters':option.key==='edition'?'Show all editions':'Remove '+filterNames[option.key]+' filter';
    actions.append(resultAction(label+' ('+option.count+' resource'+(option.count===1?'':'s')+')',option.patch));
  }
  empty.append(actions);
}

function renderFilterSummary() {
  const group = $('#active-filters');
  group.replaceChildren();
  const active = [...$('#filters').elements].filter(el => el.name && (el.name==='official'?state.official==='show':state[el.name]) && !(el.name==='edition'&&!state.edition));
  $('#filter-label').textContent = 'Filters' + (active.length ? ' · ' + active.length + ' active' : '');
  group.hidden = !active.length;
  for (const el of active) {
    const label = el.type === 'checkbox' ? filterNames[el.name] : el.parentElement.firstChild.textContent.trim();
    const value = el.type === 'checkbox' ? (el.name==='official'?'Show':'Include') : originalOptions.get(el.name)?.find(o=>o.value===state[el.name])?.label || state[el.name];
    const button = make('button', label + ': ' + value + ' ×', 'filter-chip');
    button.type = 'button';
    button.setAttribute('aria-label', 'Remove ' + label + ' filter: ' + value);
    button.addEventListener('click', () => {
      const index = active.indexOf(el);
      setState({[el.name]: ''});
      const remaining = group.querySelectorAll('button');
      (remaining[Math.min(index, remaining.length - 1)] || $('#search')).focus();
    });
    group.append(button);
  }
}

function render() {
 if (!data) return;
 $('#search').value = state.q;
 for (const control of $('#filters').elements) {
  if (!control.name) continue;
  if (control.type === 'checkbox') control.checked = state[control.name] === control.value;
  else control.value = state[control.name] || '';
 }
 const effectiveSort = state.q && state.sort === 'name' ? 'relevance' : state.sort;
 $('#sort').value = effectiveSort;
 updateFilterOptions();
 renderFilterSummary();
 renderVersionNote();
 $('#all-mode').setAttribute('aria-pressed', state.mode === 'all');
 $('#tested-mode').setAttribute('aria-pressed', state.mode === 'tested');
 const found = sortEntries(
  filterEntries(data.entries, state).filter(entry => !collectionIds || collectionIds.has(entry.id)),
  effectiveSort,
  state.q,
 );

 const officialHidden = state.official !== 'show' ? data.entries.filter(entry => entry.official).length : 0;
 const count = found.length + (officialHidden ? ' community' : '') + (found.length === 1 ? ' resource' : ' resources');
 const scope = officialHidden ? ' · ' + officialHidden + (officialHidden === 1 ? ' official resource hidden' : ' official resources hidden') : '';
 const added = data.latestUpdate?.addedCount;
 const update = added ? ' · ' + added + ' new in this update' : '';
 $('#count').textContent = count + scope + update;
 const matches = found.length + (found.length === 1 ? ' match' : ' matches');
 $('#search-result-count').textContent = matches;
 $('#filter-result-count').textContent = matches;
 $('#search-results-link').hidden = false;
 $('#filter-results-footer').hidden = false;

 $('#mode-note').hidden = state.mode !== 'tested';
 $('#mode-note').textContent = 'Starting points require a reviewed test report with an exact setup and limitations. Source documentation alone is not enough.';
 const results = $('#results');
 results.replaceChildren();
 if (!found.length) {
  const tested = state.mode === 'tested';
  const title = tested ? 'No reviewed starting points yet.' : state.q ? 'No matches for “' + state.q + '”.' : 'No documented matches for these filters.';
  const message = tested ? 'Help build this collection by sharing a reproducible workflow and its limitations.'
   : 'Try a different search, remove a filter, or browse the complete catalogue.';
  const catalogueLink = tested ? link('Share a tested workflow ↗', 'https://github.com/subtlesayak/open-resolve-list/issues/new?template=testing.yml')
   : link('Browse the full catalogue ↗', data.catalogue);
  const empty = make('div', undefined, 'empty');
  empty.append(make('h3', title), make('p', message), catalogueLink);
  renderRecovery(empty);
  results.append(empty);
 }
 let group = null;
 for (const entry of found.slice(0, limit)) {
  const next = entry.official ? 'Official resources' : 'Community tools';
  if (group !== next) {
   results.append(make('h2', next, 'group-title'));
   group = next;
  }
  results.append(row(entry));
 }
 $('#more').hidden = found.length <= limit;
 $('#more').textContent = 'Show more resources (' + Math.max(0, found.length - limit) + ' remaining)';
 decorateCompareControls(found);
 renderCompareTray();
}
function changelogView(h){
 const box=make('details',undefined,'release-changelog');
 box.append(make('summary','Changes in '+h.to+' ('+(h.changes?.length||1)+')'));
 box.append(make('p','Recorded changes from the linked source. Open the full changelog for further details.','muted'));
 const ul=make('ul');for(const item of h.changes||[h.summary])ul.append(make('li',item));box.append(ul);
 for(const source of h.changelogs||[{label:"Full source changelog",url:h.source}]){const p=make('p');p.append(link(source.label+' ↗',source.url));box.append(p);}
 return box;
}
async function init(){const controls=[...document.querySelectorAll('#search, .modes button, #filters select, #filters input, #clear, #share, #sort')];controls.forEach(el=>el.disabled=true);try{data=await loadCatalogue();for(const e of data.entries)e.evidence=e.evidenceLevels.map(level=>({level}));for(const [value,label]of Object.entries(FORMAT_LABELS))if(data.entries.some(e=>e.kind===value))$('#filters [name=kind]').append(new Option(label,value));for(const value of collectResolveVersions(data.entries))$('#filters [name=resolve]').append(new Option(value,value));$('.brand').textContent=data.title;document.title=data.title+' — Find tools for your setup';for(const [v,t]of Object.entries(TASKS)){$('#filters [name=task]').append(new Option(t,v));}const restored=stateFromUrl(location.search);state=location.search?restored.state:UNFILTERED;try{if(!location.search){const saved=JSON.parse(localStorage.getItem("open-resolve-setup")||"null");if(saved&&typeof saved==="object")state={...state,platform:["Windows","macOS","Linux","iPadOS"].includes(saved.platform)?saved.platform:"",edition:["","Free","Studio"].includes(saved.edition)?saved.edition:"",resolve:typeof saved.resolve==="string"?saved.resolve:""};}}catch{}for(const el of [...$('#filters').elements,$('#sort')])if(el.tagName==='SELECT'){const key=el.name||'sort';if(![...el.options].some(o=>o.value===state[key]))state[key]=DEFAULTS[key];}if(!['all','tested'].includes(state.mode))state.mode='all';$('#filter-toggle').addEventListener('click',()=>{const closed=$('#filter-controls').dataset.collapsed==='true';$('#filter-controls').dataset.collapsed=String(!closed);$('#filter-toggle').setAttribute('aria-expanded',String(closed));});$('#search').addEventListener('input',e=>setState({q:e.target.value}));$('#filters').addEventListener('submit',e=>e.preventDefault());$('#filters').addEventListener('change',e=>{if(e.target.name)setState({[e.target.name]:e.target.type==='checkbox'?(e.target.name==='official'?(e.target.checked?'show':'hide'):(e.target.checked?e.target.value:'')):e.target.value});});$('#sort').addEventListener('change',e=>setState({sort:e.target.value}));$('#clear').addEventListener('click',()=>{setState({...DEFAULTS,q:state.q,sort:state.sort});notify('Filters cleared.');});$('#all-mode').addEventListener('click',()=>setState({mode:'all'}));$('#tested-mode').addEventListener('click',()=>setState({mode:'tested'}));$('#more').addEventListener('click',showMoreResults);$('#share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);notify('View link copied.');}catch{notify('Copy the address from your browser to share this view.');}});enableBackdropClose($('#detail-dialog'));$('#dialog-close').addEventListener('click',()=>$('#detail-dialog').close());$('#detail-dialog').addEventListener('close',()=>lastFocus?.focus());window.addEventListener('popstate',()=>{state=stateFromUrl(location.search).state;limit=30;render();});controls.forEach(el=>el.disabled=false);render();}catch(error){$('#count').textContent='The catalogue could not load.';$('#search-result-count').textContent='The catalogue could not load. Reload to try again.';$('#results').append(make('p','Reload the page, or use the complete GitHub catalogue. This site needs an HTTP server rather than opening index.html directly.'),link('Open catalogue ↗','https://github.com/subtlesayak/open-resolve-list'));console.error(error);}}
init().then(()=>{
 if(!data)return;
 comparison=comparisonFromUrl(location.search).reduce((ids,id)=>{const e=data.entries.find(e=>e.id===id);return e&&comparisonCompatible(e,ids.map(id=>data.entries.find(e=>e.id===id)))?[...ids,id]:ids;},[]);
 new ResizeObserver(reserveCompareSpace).observe($('#compare-tray'));
 $('#compare-open').addEventListener('click',openComparison);
 $('#compare-export').addEventListener('click',exportComparison);
 $('#compare-clear').addEventListener('click',()=>{comparison=[];syncUrl();render();notify('Comparison cleared.');$('#search').focus();});
 enableBackdropClose($('#compare-dialog'));
 $('#compare-dialog-close').addEventListener('click',()=>$('#compare-dialog').close());
 $('#compare-dialog').addEventListener('close',()=>lastCompareFocus?.focus());
 window.addEventListener('popstate',()=>{comparison=comparisonFromUrl(location.search).reduce((ids,id)=>{const e=data.entries.find(e=>e.id===id);return e&&comparisonCompatible(e,ids.map(id=>data.entries.find(e=>e.id===id)))?[...ids,id]:ids;},[]);render();});
 render();
});

document.addEventListener('resolve:notice',event=>notify(event.detail));
document.addEventListener('resolve:setup-changed',()=>render());
document.addEventListener('resolve:collection-filter',event=>{collectionIds=event.detail.active?new Set(event.detail.ids):null;limit=30;render();});
