import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';

const port=18765;
const child=spawn(process.execPath,['scripts/serve-site.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,RESOLVE_SITE_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='';
child.stdout.on('data',chunk=>{output+=chunk.toString();});
child.stderr.on('data',chunk=>{output+=chunk.toString();});
const waitForServer=async()=>{for(let i=0;i<50;i++){if(output.includes(`127.0.0.1:${port}`))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error(`Server did not start: ${output}`);};
const get=path=>new Promise((resolve,reject)=>{const request=http.get({hostname:'127.0.0.1',port,path},response=>{let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body}));});request.on('error',reject);});
try{
 await waitForServer();
 const module=await get('/app.mjs');assert.equal(module.status,200);assert.match(module.headers['content-type'],/javascript/);
 const home=await get('/'),feed=await get('/catalogue.json'),apiResource=await get('/api/v1/resources/36-cinematic-film-titles.json'),resource=await get('/resource/36-cinematic-film-titles/'),bad=await get('/%2e%2e/package.json');
 assert.equal(home.status,200);assert.match(home.body,/id="catalogue"/);
 assert.equal(feed.status,200);assert.match(feed.body,/"schema_version": 1/);
 assert.equal(apiResource.status,200);assert.match(apiResource.body,/"id": "36-cinematic-film-titles"/);
 assert.equal(resource.status,200);assert.match(resource.body,/<h1>36 Cinematic Film Titles<\/h1>/);
 assert.equal(bad.status,404);
 console.log('Local site smoke passed: home, catalogue JSON, per-resource API, static resource page, and traversal rejection.');
}finally{child.kill();}
