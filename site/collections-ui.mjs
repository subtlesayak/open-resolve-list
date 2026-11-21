import {loadCatalogue} from './catalogue-loader.mjs?v=1';
import {COLLECTION_KEY,readCollection,importCollection} from './collections.mjs';
const root=document.querySelector('.catalogue-content');
if(root)loadCatalogue().then(data=>{
 const ids=new Set(data.entries.map(e=>e.id)),panel=document.createElement('details');
 panel.innerHTML='<summary>My collections</summary><p>Bookmarks, shortlists and installed status stay on this device.</p><div class="collection-controls"><label>Show<select id="collection-view"><option value="">All resources</option><option value="bookmark">Bookmarked</option><option value="shortlist">Shortlisted</option><option value="installed">Installed</option></select></label><button type="button" id="collection-export" class="outline">Export collection</button><label>Import and merge JSON<input id="collection-import" type="file" accept=".json,application/json"></label></div><p role="status" id="collection-message"></p>';
 root.prepend(panel);const message=panel.querySelector('#collection-message');
 const refreshFilter=()=>document.dispatchEvent(new CustomEvent('resolve:collection-filter',{detail:{ids:read().items.filter(item=>item.statuses.includes(panel.querySelector('select').value)).map(i=>i.id),active:!!panel.querySelector('select').value}}));
 const read=()=>{try{return readCollection(localStorage,ids);}catch{return {schema_version:1,items:[]};}};
 const statuses = [
  ['bookmark', 'Bookmark', 'Bookmarked', 'Bookmark removed'],
  ['shortlist', 'Shortlist', 'Shortlisted', 'Removed from shortlist'],
  ['installed', 'Installed', 'Marked installed', 'Installed status removed'],
 ];
 const report = detail => document.dispatchEvent(new CustomEvent('resolve:notice', {detail}));

 function saveOptions(article, entry) {
  const disclosure = document.createElement('details');
  disclosure.className = 'collection-save';
  const summary = document.createElement('summary');
  summary.className = 'outline';
  summary.innerHTML = '<span class="save-mark" aria-hidden="true" hidden>✓</span><span>Save</span>';
  const options = document.createElement('div');
  options.className = 'collection-save-options';
  for (const [status, label, addedMessage, removedMessage] of statuses) {
   const button = document.createElement('button');
   button.type = 'button';
   button.dataset.collectionStatus = status;
   button.className = 'outline';
   const check = document.createElement('span');
   check.className = 'save-mark';
   check.setAttribute('aria-hidden', 'true');
   check.textContent = '✓';
   button.append(check, document.createTextNode(label));
   button.setAttribute('aria-label', label + ' ' + entry.name);
   button.addEventListener('click', () => {
    const restoreFocus = document.activeElement === button;
    try {
     const current = read();
     const item = current.items.find(record => record.id === entry.id) || {id:entry.id, statuses:[]};
     const added = !item.statuses.includes(status);
     item.statuses = added ? [...item.statuses, status] : item.statuses.filter(value => value !== status);
     current.items = current.items.filter(record => record.id !== entry.id);
     if (item.statuses.length) current.items.push(item);
     localStorage.setItem(COLLECTION_KEY, JSON.stringify(current));
     if (panel.querySelector('#collection-view').value) refreshFilter();
     decorate();
     if (restoreFocus && !article.isConnected) {
      const replacement = root.querySelector('[data-resource-id="' + entry.id + '"] .collection-save');
      if (replacement) {
       replacement.open = true;
       replacement.querySelector('[data-collection-status="' + status + '"]').focus();
      } else {
       (panel.open ? panel.querySelector('#collection-view') : panel.querySelector('summary')).focus();
      }
     }
     report((added ? addedMessage : removedMessage) + ' · ' + entry.name);
    } catch {
     report('Storage is unavailable. Collection was not saved.');
    }
   });
   options.append(button);
  }
  disclosure.append(summary, options);
  disclosure.addEventListener('keydown', event => {
   if (event.key !== 'Escape' || !disclosure.open) return;
   event.preventDefault();
   disclosure.open = false;
   summary.focus();
  });
  article.querySelector('.row-actions').append(disclosure);
  return disclosure;
 }

 function decorate() {
  const saved = new Map(read().items.map(item => [item.id, item.statuses]));
  const view = panel.querySelector('#collection-view').value;
  const entries = new Map(data.entries.map(entry => [entry.id, entry]));
  for (const article of root.querySelectorAll('#results article.resource')) {
   const entry = entries.get(article.dataset.resourceId);
   if (!entry) continue;
   const selected = saved.get(entry.id) || [];
   article.hidden = !!view && !selected.includes(view);
   const disclosure = article.querySelector('.collection-save') || saveOptions(article, entry);
   const summary = disclosure.querySelector('summary');
   const count = selected.length;
   summary.setAttribute('aria-label', 'Save options for ' + entry.name + (count ? ', ' + count + ' selected' : ''));
   summary.dataset.saved = String(count > 0);
   summary.querySelector('.save-mark').hidden = count === 0;
   for (const button of disclosure.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(selected.includes(button.dataset.collectionStatus)));
   }
  }
 }

 document.addEventListener('click', event => {
  for (const disclosure of root.querySelectorAll('.collection-save[open]')) {
   if (!disclosure.contains(event.target)) disclosure.open = false;
  }
 });
 root.addEventListener('focusout', event => {
  const disclosure = event.target.closest('.collection-save[open]');
  if (disclosure && event.relatedTarget && !disclosure.contains(event.relatedTarget)) disclosure.open = false;
 });
 new MutationObserver(decorate).observe(document.querySelector('#results'), {childList:true});
 decorate();
 panel.querySelector('#collection-view').addEventListener('change', () => {
  refreshFilter();
  decorate();
 });
 panel.querySelector('#collection-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(read(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='resolve-collection-v1.json';a.click();URL.revokeObjectURL(url);});
 panel.querySelector('#collection-import').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>500000)throw Error('File exceeds 500 KB.');const next=importCollection(await file.text(),read(),ids);localStorage.setItem(COLLECTION_KEY,JSON.stringify(next));if(panel.querySelector('select').value)refreshFilter();decorate();message.textContent='Imported and merged. Existing saved tools were preserved.';}catch{message.textContent='Import failed. Your existing collection is unchanged.';}event.target.value='';});
}).catch(()=>{});
