const buttons=[...document.querySelectorAll('.quick-task')];
if(buttons.length){
 fetch('catalogue-index.json?v=2',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{
  if(!data)return;
  for(const button of buttons){const task=button.dataset.task;const count=data.entries.filter(entry=>entry.tasks.includes(task)).length;const target=button.querySelector('[data-task-count]');if(target)target.textContent=`${count} tools`;button.addEventListener('click',()=>{const params=new URLSearchParams(location.search);params.set('task',task);params.delete('mode');location.search=params.toString();});}
 }).catch(()=>{});
}
