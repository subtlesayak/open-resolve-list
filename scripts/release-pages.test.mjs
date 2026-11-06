import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {groupUpdates} from '../site/updates.mjs';
test('release groups retain every provider change under its own catalogue version',()=>{
 const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
 const releases=read('../data/catalogue-releases.json').releases,updates=read('../data/provider-updates.json').entries;
 const groups=groupUpdates(releases,updates);
 assert.ok(groups.findIndex(r=>r.version==='v1.1')<groups.findIndex(r=>r.version==='v1.0'));
 assert.equal(groups.flatMap(r=>r.updates).length,updates.length);
 for(const group of groups)assert.ok(group.updates.every(h=>h.release===group.version));
 assert.equal(groups.find(r=>r.version==='v1.15').updates.length,4);
 assert.deepEqual(groups.find(r=>r.version==='v1.15').updates.slice(0,2).map(h=>h.name),['Fusion Studio','DaVinci Resolve / Studio']);
 assert.equal(groups.find(r=>r.version==='v1.14').updates.length,5);
 for(const page of ['index','updates','about']){const html=fs.readFileSync(new URL('../site/'+page+'.html',import.meta.url),'utf8');assert.match(html,/href="updates.html"/);assert.match(html,/href="about.html"/);assert.equal((html.match(/aria-current="page"/g)||[]).length,1);}
});

test('release Markdown keeps original product links clickable inside bold text',async()=>{
 const {inlineTokens}=await import('../site/updates.mjs');
 const url='https://www.motioncamapp.com/tools';
 assert.deepEqual(inlineTokens('**[MotionCam Tools]('+url+') — 2.0 beta.**'),[{type:'strong',children:[{type:'link',url,children:[{type:'text',text:'MotionCam Tools'}]},{type:'text',text:' — 2.0 beta.'}]}]);
 assert.deepEqual(inlineTokens('[**Tool**]('+url+')'),[{type:'link',url,children:[{type:'strong',children:[{type:'text',text:'Tool'}]}]}]);
 assert.deepEqual(inlineTokens('<script>alert(1)</script>'),[{type:'text',text:'<script>alert(1)</script>'}]);
});

test('creator headings combine repeated creators within a release and keep BMD first', async()=>{
 const {creatorGroups,releaseNoteBlocks}=await import('../site/updates.mjs');
 const data=JSON.parse(fs.readFileSync(new URL('../site/catalogue.json',import.meta.url),'utf8'));
 const current=data.releases.find(r=>r.version==='v1.17');
 const items=releaseNoteBlocks(current.body).filter(b=>b.type==='list').flatMap(b=>b.items);
 const groups=creatorGroups(items,data.entries,line=>line.match(/\]\((https:\/\/[^)]+)\)/)?.[1]);
 assert.equal(groups.find(g=>g.creator==='Veres Deni Alex').items.length,14);
 assert.equal(groups.find(g=>g.creator==='Juan Melara').items.length,3);
 assert.equal(groups.find(g=>g.creator==='tdcat').items.length,2);
 assert.equal(groups.flatMap(g=>g.items).length,items.length);
 const updates=data.updates.filter(h=>h.release==='v1.15');
 const changes=creatorGroups(updates,data.entries);
 assert.equal(changes[0].creator,'Blackmagic Design');
 assert.equal(changes[0].items.length,2);
 assert.equal(changes.flatMap(g=>g.items).length,4);
 assert.equal(creatorGroups([{url:'https://example.com/a'},{url:'https://example.com/b'}],[]).length,2);
});

test('plain source URLs in release notes are clickable without trailing prose punctuation',async()=>{
 const {inlineTokens,creatorGroups}=await import('../site/updates.mjs');
 const url='https://github.com/example/tool/releases/tag/v2';
 assert.deepEqual(inlineTokens('Updated. '+url+'.'),[{type:'text',text:'Updated. '},{type:'link',url,children:[{type:'text',text:url}]},{type:'text',text:'.'}]);
 const balanced='https://example.com/tool_(beta)';
 assert.equal(inlineTokens(balanced)[0].url,balanced);
 assert.equal(inlineTokens('('+url+')')[1].url,url);
 const groups=creatorGroups([{url},{url:'https://github.com/example/other/releases/tag/v1'}],[{url:'https://github.com/example/tool',creator:'Example'},{url:'https://github.com/example/other',creator:'Example'}]);
 assert.equal(groups.length,1);assert.equal(groups[0].items.length,2);
});
