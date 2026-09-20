import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';

const allowedKinds=new Set(['dctl','ofx','powergrade','fuse','fusion-macro','reactor-package','lut','resolve-script','mcp-server','workflow-app','subtitle-tool','template','encoder','control-surface','reference','collection','audio-plugin','library','training','other']);
const args=process.argv.slice(2),values={};
for(let index=0;index<args.length;index++){const arg=args[index];if(!arg.startsWith('--'))continue;values[arg.slice(2)]=args[index+1]&&!args[index+1].startsWith('--')?args[++index]:true;}

async function collectInteractive(){
 const rl=createInterface({input,output});
 try { for(const key of ['name','url','creator','category','kind','description','tasks','access']) values[key]=await rl.question(`${key}: `); }
 finally {rl.close();}
}

async function main(){
 if(values.help){console.log('Interactive: node scripts/add-resource.mjs\nNon-interactive: node scripts/add-resource.mjs --name NAME --url HTTPS_URL --creator CREATOR --category CATEGORY --kind KIND --description DESCRIPTION [--tasks task1,task2] [--access free|mixed|paid|public]');return;}
 if(!values.name&&!process.stdin.isTTY){console.error('Provide required fields or run this command from an interactive terminal.');process.exit(2);}
 if(!values.name)await collectInteractive();
 for(const key of ['name','url','creator','category','kind','description'])if(!values[key])throw Error(`Missing required field: ${key}`);
 let url;try{url=new URL(values.url);if(url.protocol!=='https:')throw Error('URL must use HTTPS');}catch(error){throw Error(error.message||'Invalid URL');}
 if(!allowedKinds.has(values.kind))throw Error(`Unsupported kind: ${values.kind}`);
 const tasks=String(values.tasks||'').split(',').map(task=>task.trim()).filter(Boolean);
 const draft={id:null,name:String(values.name),creator:String(values.creator),urls:{canonical:url.href,previous:[]},origin:url.hostname==='github.com'?'github':'external',category:String(values.category),kind:String(values.kind),tasks,description:String(values.description),access:String(values.access||'public'),platforms:[],platform_notes:'',requirements:{editions:[],resolve:[],architectures:[],gpu:null,processing:'unknown',pricing:'unknown',account:'unknown',dependencies:null,installation:null},version:{kind:'unknown',version:null,date:null,date_kind:'unknown',source:url.href,checked_at:null},evidence:[],history:[],review_markers:['Draft requires a permanent ID, reviewed tags and upstream evidence before saving as a canonical record.']};
 console.log(JSON.stringify(draft,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
