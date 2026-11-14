export const COLLECTION_KEY='open-resolve-collections-v1';
const statuses=['bookmark','shortlist','installed'];
export function validateCollection(value,knownIds) {
 if(!value||value.schema_version!==1||!Array.isArray(value.items)||value.items.length>1000)throw Error('Use a version 1 collection with at most 1000 items.');
 const ids=new Set();
 const items=value.items.map(item=>{
  if(!item||typeof item.id!=='string'||!knownIds.has(item.id)||ids.has(item.id)||!Array.isArray(item.statuses)||!item.statuses.length||item.statuses.some(s=>!statuses.includes(s))||new Set(item.statuses).size!==item.statuses.length)throw Error('Unknown, duplicate or invalid collection item. Your collection is unchanged.');
  ids.add(item.id);return {id:item.id,statuses:[...item.statuses].sort()};
 });return {schema_version:1,items:items.sort((a,b)=>a.id.localeCompare(b.id))};
}
export function readCollection(storage,ids) {try{return validateCollection(JSON.parse(storage.getItem(COLLECTION_KEY)||'{"schema_version":1,"items":[]}'),ids);}catch{return {schema_version:1,items:[]};}}
export function importCollection(text,current,ids) {
 if(text.length>500000)throw Error('The file is too large. Your collection is unchanged.');
 const incoming=validateCollection(JSON.parse(text),ids),merged=new Map(current.items.map(item=>[item.id,item]));
 for(const item of incoming.items)merged.set(item.id,{id:item.id,statuses:[...new Set([...(merged.get(item.id)?.statuses||[]),...item.statuses])]});
 return validateCollection({schema_version:1,items:[...merged.values()]},ids);
}
