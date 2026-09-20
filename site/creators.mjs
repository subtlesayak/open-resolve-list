const input=document.querySelector('#creator-search');
const cards=[...document.querySelectorAll('.creator-card')];
const count=document.querySelector('#creator-count');
const empty=document.querySelector('#creator-empty');
let topic='';
function render(){const query=(input?.value||'').trim().toLowerCase();let visible=0;for(const card of cards){const show=(!query||card.dataset.search.includes(query))&&(!topic||card.dataset.topics.split('|').includes(topic));card.hidden=!show;if(show)visible++;}if(count)count.textContent=`${visible} creator${visible===1?'':'s'}`;if(empty)empty.hidden=visible!==0;}
input?.addEventListener('input',render);
document.querySelectorAll('.topic-chip').forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.topic||'';document.querySelectorAll('.topic-chip').forEach(item=>item.classList.toggle('is-active',item===button));render();}));
