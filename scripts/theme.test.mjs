import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../site/style.css',import.meta.url),'utf8');
const tokens=block=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]+);/g)].map(m=>[m[1],m[2]]));
const luminance=hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');const rgb=h.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const ratio=(a,b)=>{const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(l[0]+.05)/(l[1]+.05);};
test('light and dark semantic colors meet WCAG AA text and control contrast',()=>{
 const light=tokens(css.match(/:root \{([^}]+)/)[1]);
 const dark={...light,...tokens(css.match(/:root\[data-theme="dark"\] \{([^}]+)/)[1])};
 for(const [name,p]of Object.entries({light,dark})){
  for(const bg of ['paper','wash']){
   for(const fg of ['ink','muted','accent'])assert.ok(ratio(p[fg],p[bg])>=4.5,`${name}: ${fg}/${bg}`);
   for(const fg of ['control-border','focus'])assert.ok(ratio(p[fg],p[bg])>=3,`${name}: ${fg}/${bg}`);
  }
  assert.ok(ratio(p['on-accent'],p['button-bg'])>=4.5,name+' primary button');
 }
});
test('latest update count is tied to unique current catalogue additions',()=>{
 const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
 const latest=read('data/latest-update.json'),data=read('site/catalogue.json');
 assert.equal(latest.added_urls.length,38);
 assert.equal(new Set(latest.added_urls).size,38);
 assert.equal(data.latestUpdate.addedCount,38);
 assert.ok(latest.added_urls.every(url=>data.entries.some(e=>e.url===url)));
});
