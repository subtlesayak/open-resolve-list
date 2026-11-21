import {setupVerdictView} from './setup-verdict-view.mjs';
import {loadCatalogue} from './catalogue-loader.mjs?v=1';
import {findWorkflow,readSetup,workflowIntent} from './discovery-model.mjs';
const form=document.querySelector('#workflow-form');
if(form){let data;const output=document.querySelector('#workflow-results'),status=document.querySelector('#workflow-count');
 const render=()=>{if(!data)return;const query=form.elements.query.value;let setup={};try{setup=readSetup(localStorage);}catch{}const intent=workflowIntent(query),matches=findWorkflow(data.entries,query,setup);
 const specified=[intent.platform,intent.edition,intent.version&&'Resolve '+intent.version].filter(Boolean);
 const context=specified.length?' Using '+specified.join(' · ')+' from your search.':'';
 output.replaceChildren();
 status.textContent=intent.ambiguous?'Your query spans more than one workflow. Search for one task at a time.':query.trim()?`${matches.length} ${matches.length===1?'result':'results'}.${context}`:'Describe a task to find tools.';
 for(const {entry,reasons,verdict} of matches.slice(0,30)){const article=document.createElement('article');article.className='workflow-result';const h=document.createElement('h3'),a=document.createElement('a');a.href='resource/'+encodeURIComponent(entry.id)+'/';a.textContent=entry.name;h.append(a);const desc=document.createElement('p');desc.textContent=entry.description;const why=document.createElement('p');why.textContent='Why it matched: '+reasons.join(' · ');const compatibility=setupVerdictView(verdict,{entryId:entry.id});const source=document.createElement('a');source.href=entry.url;source.textContent='Original source ↗';source.dataset.analyticsEvent='tool_outbound_click';source.dataset.analyticsId=entry.id;source.dataset.analyticsPlacement='workflow';article.append(h,desc,why,compatibility,source);output.append(article);}
 if(query.trim()&&!matches.length&&!intent.ambiguous){const p=document.createElement('p');p.textContent='No matches. Try a capability such as subtitles or film emulation, or remove a brand or access constraint. Unknown requirements can still be reviewed in Find a tool.';output.append(p);}};
 form.addEventListener('submit',event=>{event.preventDefault();render();});document.addEventListener('resolve:setup-changed',render);for(const button of document.querySelectorAll('[data-workflow-query]'))button.addEventListener('click',()=>{form.elements.query.value=button.dataset.workflowQuery;render();});loadCatalogue().then(value=>{data=value;render();}).catch(()=>{status.textContent='The catalogue could not load. Reload or open the browse directory.';});
}
