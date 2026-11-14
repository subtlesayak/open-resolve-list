import {catalogueVersion} from './catalogue-version.mjs';
let pending;
export function loadCatalogue() {
 return pending ||= fetch(new URL('./catalogue-index.json?v='+catalogueVersion, import.meta.url))
  .then(response => { if (!response.ok) throw new Error('Catalogue unavailable'); return response.json(); })
  .catch(error => { pending = undefined; throw error; });
}
