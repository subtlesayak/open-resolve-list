const input=document.querySelector('#creator-search');
const cards=[...document.querySelectorAll('.creator-card')].map(card=>({
 card,
 searchable:[...card.querySelectorAll('h3, p:not(.source-link)')].map(node=>node.textContent).join(' ').toLowerCase(),
 topics:card.dataset.topics.split('|'),
}));
const groups=[...document.querySelectorAll('.creator-group')];
const count=document.querySelector('#creator-count');
const empty=document.querySelector('#creator-empty');
const topics=document.querySelectorAll('.topic-chip');
let topic='';

function render(){
 const query=(input?.value||'').trim().toLowerCase();
 let visible=0;
 for(const record of cards){
  const show=record.searchable.includes(query)&&(!topic||record.topics.includes(topic));
  record.card.hidden=!show;
  if(show)visible++;
 }
 for(const group of groups)group.hidden=!group.querySelector('.creator-card:not([hidden])');
 if(count)count.textContent=`${visible} directory entr${visible===1?'y':'ies'}`;
 if(empty)empty.hidden=visible!==0;
}

input?.addEventListener('input',render);
for (const button of topics) {
 button.addEventListener('click', () => {
  topic = button.dataset.topic || '';
  for (const item of topics) item.setAttribute('aria-pressed', String(item === button));
  render();
 });
}
