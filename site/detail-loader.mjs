export function createDetailLoader(request=fetch){
 const cache=new Map();
 return async id=>{
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))throw Error('Invalid resource ID');
  if(!cache.has(id)){
   const pending=(async()=>{
    const response=await request(`api/v1/resources/${encodeURIComponent(id)}.json`,{cache:'no-store'});
    if(!response.ok)throw Error('Could not load resource details');
    const data=await response.json();
    if(data.resource?.id!==id)throw Error('Resource ID mismatch');
    return data.resource;
   })();
   cache.set(id,pending);
   pending.catch(()=>{if(cache.get(id)===pending)cache.delete(id);});
  }
  return cache.get(id);
 };
}
