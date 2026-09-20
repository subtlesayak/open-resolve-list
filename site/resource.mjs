import {resourceView} from './resource-view.mjs?v=1';
import {createDetailLoader} from './detail-loader.mjs?v=1';
const article=document.querySelector('#resource');
article.closest('main').classList.add('resource-page');
async function init(){try{
 const id=new URLSearchParams(location.search).get('id');
 const record=await createDetailLoader()(id);
 let entries=[];try{const response=await fetch('catalogue-index.json',{cache:'no-store'});if(response.ok)entries=(await response.json()).entries;}catch{}
 article.innerHTML=resourceView(record,entries,'');
 document.title=record.name+' — Open Resolve List';
 let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href='https://subtlesayak.github.io/open-resolve-list/resource/'+encodeURIComponent(record.id)+'/';
}catch{article.innerHTML='<h1>Resource unavailable</h1><p>Reload the page or return to the catalogue and choose a current resource.</p>';}}
init();
