const buttons=[...document.querySelectorAll('.quick-task')];
if(buttons.length){
 fetch('catalogue-index.json?v=2',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{
  if(!data)return;
  const stats=document.querySelector('#site-stats');
  if(stats){const creators=new Set(data.entries.map(entry=>entry.creator).filter(Boolean)).size;const formats=new Set(data.entries.map(entry=>entry.kind).filter(Boolean)).size;stats.textContent=`${data.entries.length} resources · ${creators} creators · ${formats} formats · source-backed compatibility`;}
  for(const example of document.querySelectorAll('[data-search-example]'))example.addEventListener('click',()=>{const input=document.querySelector('#search');if(!input)return;input.value=example.dataset.searchExample;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();});
  for(const button of buttons){const task=button.dataset.task;const count=data.entries.filter(entry=>entry.tasks.includes(task)).length;const target=button.querySelector('[data-task-count]');if(target)target.textContent=`${count} tools`;button.addEventListener('click',()=>{const params=new URLSearchParams(location.search);params.set('task',task);params.delete('mode');location.search=params.toString();});}
 }).catch(()=>{});
}
