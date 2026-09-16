import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','site');
const port=Number(process.env.RESOLVE_SITE_PORT||8765);
const types={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url||'/',`http://${request.headers.host||'localhost'}`).pathname);
    const requested=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
    const candidate=path.resolve(root,requested);
    if(candidate!==root&&!candidate.startsWith(root+path.sep)){response.writeHead(400);response.end('Bad path');return;}
    let file=candidate;
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(response);
  }catch(error){response.writeHead(400);response.end('Bad request');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
