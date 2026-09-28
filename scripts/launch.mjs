import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const [major,minor]=process.versions.node.split('.').map(Number);
if(!(major>=24 || (major===22 && minor>=13))){console.error('Install Node.js 24, then run this launcher again.');process.exit(1);}
const windows=process.platform==='win32';
const npm=windows?'npm.cmd':'npm';
function run(args){const result=spawnSync(npm,args,{cwd:root,stdio:'inherit',shell:windows});if(result.status!==0)process.exit(result.status||1);}
await new Promise(resolve=>{
  const probe=net.createServer();
  probe.once('error',()=>{console.error('Port 3080 is already in use. Open http://127.0.0.1:3080 or stop the existing service first.');process.exit(1);});
  probe.listen(3080,'127.0.0.1',()=>probe.close(resolve));
});
console.log('Tavern Deck: installing dependencies and building the tracker…');
run(['ci']);run(['run','build']);
const url='http://127.0.0.1:3080';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3080'],{stdio:'inherit',cwd:root});
let finished=false;
child.on('exit',code=>{finished=true;process.exit(code||0);});
child.on('error',error=>{console.error(error.message);process.exit(1);});
process.on('SIGINT',()=>child.kill('SIGINT'));
process.on('SIGTERM',()=>child.kill('SIGTERM'));
for(let attempt=0;attempt<30 && !finished;attempt++){
  await new Promise(resolve=>setTimeout(resolve,500));
  try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});if(!response.ok)continue;
    console.log(`Open ${url} — keep this window open while playing.`);
    const command=windows?'cmd':process.platform==='darwin'?'open':'xdg-open';
    const args=windows?['/c','start','',url]:[url];
    const opener=spawn(command,args,{stdio:'ignore'});opener.on('error',()=>console.log(`Open ${url} in your browser.`));break;
  }catch{}
}
