import {siteHeader,siteHeaderAssets} from './site-header.mjs';
import {supportButton} from './site-footer.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {escapeHtml as esc} from '../site/resource-view.mjs';
export function buildWorkflowPages(root,entries){
 const {recipes}=JSON.parse(fs.readFileSync(path.join(root,'data/workflows.json'),'utf8'));
 const base='https://subtlesayak.github.io/open-resolve-list/';
 const page=(title,body,prefix='')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Open Resolve List</title><link rel="canonical" href="${base}${prefix?'workflow/'+recipes.find(r=>r.title===title).id+'/':'workflows.html'}">${siteHeaderAssets(prefix)}<script type="module" src="${prefix}analytics.mjs?v=1"></script>${prefix?'':`<script type="module" src="setup-ui.mjs?v=1"></script><script type="module" src="workflow-ui.mjs?v=2"></script>`}</head><body><a class="skip" href="#main-content">Skip to content</a>${siteHeader(prefix,prefix ? '' : 'workflows')}<main id="main-content" class="information-page" tabindex="-1"><h1>${esc(title)}</h1>${body}</main><footer class="site-footer">${supportButton(prefix)}</footer></body></html>\n`;
 const cards=recipes.map(r=>`<article class="workflow-result"><h3><a href="workflow/${r.id}/">${esc(r.title)}</a></h3><p>${esc(r.result)}</p></article>`).join('');
 fs.writeFileSync(path.join(root,'site/workflows.html'),page('Solve a workflow',`<p>Find tools by the job you need to do. Matches use curated capabilities, synonyms and reviewed catalogue text.</p><div id="setup-slot"></div><form id="workflow-form"><label for="workflow-query">Describe your workflow</label><input id="workflow-query" name="query" type="search" placeholder="Free automatic subtitles on Windows"><button>Find tools</button></form><p><button type="button" class="outline" data-workflow-query="free automatic subtitles on Windows">Automatic subtitles</button> <button type="button" class="outline" data-workflow-query="import an SRT subtitle file">Import SRT subtitles</button> <button type="button" class="outline" data-workflow-query="Kodak-style film look">Kodak-style film look</button></p><p id="workflow-count" role="status"></p><div id="workflow-results"></div><section><h2>Starter recipes</h2><p>Source-backed editorial guides. Read the limitations and original instructions before applying a workflow.</p>${cards}</section>`));
 for(const recipe of recipes){
  for(const id of recipe.resources)if(!entries.some(e=>e.id===id))throw Error('Unknown workflow resource: '+id);
  const links=recipe.resources.map(id=>entries.find(e=>e.id===id)).map(e=>`<li><a href="../../resource/${e.id}/">${esc(e.name)}</a></li>`).join('');
  if(!recipe.alternatives?.length)throw Error('Workflow needs an alternative or an explicit limitation: '+recipe.id);
  const alternatives=recipe.alternatives.map(alternative=>{
   const entry=alternative.resource_id?entries.find(e=>e.id===alternative.resource_id):null;
   if(alternative.resource_id&&!entry)throw Error('Unknown workflow alternative: '+alternative.resource_id);
   if(!entry&&(!/^https:\/\//.test(alternative.url||'')||!/^https:\/\//.test(alternative.source||'')))throw Error('An external alternative needs an original source');
   const url=entry?'../../resource/'+entry.id+'/':alternative.url;
   return `<li><a href="${esc(url)}">${esc(entry?.name||alternative.title)}</a><p>${esc(alternative.description)}</p><a href="${esc(entry?.url||alternative.source)}">Original source</a></li>`;
  }).join('');
  const sources=recipe.sources.map(s=>`<li><a href="${esc(s.url)}">${esc(s.label)}</a></li>`).join('');
  const dir=path.join(root,'site/workflow',recipe.id);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),page(recipe.title,`<p><a href="../../workflows.html">All workflows</a></p><h2>Expected result</h2><p>${esc(recipe.result)}</p><h2>Setup</h2><p>${esc(recipe.setup)}</p><h2>Steps</h2><ol>${recipe.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>${links ? '<h2>Tools and references</h2><ul>'+links+'</ul>' : ''}<h2>Alternatives</h2><ul>${alternatives}</ul><h2>Limitations</h2><p>${esc(recipe.limitations)}</p><h2>Original sources</h2><ul>${sources}</ul>`,'../../'));
 }
 return ['workflows.html',...recipes.map(r=>'workflow/'+r.id+'/')];
}
