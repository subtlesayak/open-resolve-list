import {loadCatalogue} from './catalogue-loader.mjs?v=1';
const buttons=[...document.querySelectorAll('.quick-task')];
if(buttons.length){
 loadCatalogue().then(data=>{
  if(!data)return;
  const input=document.querySelector('#search');
  for(const example of document.querySelectorAll('[data-search-example]')){
   example.addEventListener('click',()=>{
    input.focus();
    input.value=example.dataset.searchExample;
    input.dispatchEvent(new Event('input',{bubbles:true}));
   });
  }
  for(const button of buttons){const task=button.dataset.task;const count=data.entries.filter(entry=>entry.tasks.includes(task)).length;const target=button.querySelector('[data-task-count]');if(target)target.textContent=`${count} tools`;button.addEventListener('click',()=>{const params=new URLSearchParams(location.search);params.set('task',task);params.delete('mode');location.search=params.toString();});}
 }).catch(()=>{});
}
