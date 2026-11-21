// Install after the production origin and tracker configuration checks.
const workflows=new Set(['automatic-subtitles','film-emulation','action-camera-log']);
const platformValues=new Set(['Windows','macOS','Linux','iPadOS']);
const editionValues=new Set(['Free','Studio']);

export function installDiscoveryEvents({send,page,creatorIds,formats,root=document}){
 const prefix='/open-resolve-list/';
 const creators=new Set(creatorIds);
 const filterValues={kind:new Set(formats),platform:platformValues,edition:editionValues};
 const browseSearch=root.querySelector('#search');
 if(browseSearch){
  let searchTimer;
  const completeSearch=()=>{
   clearTimeout(searchTimer);
   searchTimer=undefined;
   if(browseSearch.value.trim().length>=2)send('search_performed');
  };
  const schedule=()=>{
   clearTimeout(searchTimer);
   searchTimer=setTimeout(completeSearch,650);
  };
  browseSearch.addEventListener('input',event=>{
   if(!event.isComposing)schedule();
  });
  browseSearch.addEventListener('compositionstart',()=>{
   clearTimeout(searchTimer);
   searchTimer=undefined;
  });
  browseSearch.addEventListener('compositionend',schedule);
  browseSearch.addEventListener('keydown',event=>{
   if(event.key==='Enter'&&!event.isComposing&&searchTimer!==undefined)completeSearch();
  });
 }
 root.querySelector('#filters')?.addEventListener('change',event=>{
  const {name,value}=event.target;
  if(Object.hasOwn(filterValues,name)&&filterValues[name].has(value))send('filter_applied',{field:name,value});
 });
 const selectDiscoveryLink=event=>{
  const link=event.target.closest?.('main a[href]');
  if(!link||link.origin!==page.origin||link.pathname===page.pathname||!link.pathname.startsWith(prefix))return;
  const route=link.pathname.slice(prefix.length);
  const creator=/^creator\/([a-z0-9-]+)\/$/.exec(route)?.[1];
  if(creators.has(creator))send('creator_selected',{id:creator});
  const workflow=/^workflow\/([a-z0-9-]+)\/$/.exec(route)?.[1];
  if(workflows.has(workflow))send('workflow_selected',{id:workflow});
 };
 root.addEventListener('click',selectDiscoveryLink);
 root.addEventListener('auxclick',event=>{
  if(event.button===1)selectDiscoveryLink(event);
 });
}
