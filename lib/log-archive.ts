import { appendFile, copyFile, mkdir, open, readdir, stat } from "node:fs/promises";
import path from "node:path";

let archiveQueue:Promise<void>=Promise.resolve();

async function fileSize(file:string) {
  try { return (await stat(file)).size; } catch { return null; }
}

async function syncPowerLog(source:string,destination:string) {
  const sourceSize=await fileSize(source);
  if(sourceSize===null) return false;
  const destinationSize=await fileSize(destination);
  if(destinationSize===null || destinationSize>sourceSize) {
    await copyFile(source,destination);
    return true;
  }
  if(destinationSize===sourceSize) return true;

  const length=sourceSize-destinationSize;
  const data=Buffer.alloc(length);
  const handle=await open(source,"r");
  try {
    await handle.read(data,0,length,destinationSize);
  } finally {
    await handle.close();
  }
  await appendFile(destination,data);
  return true;
}

export async function archivePowerLogs(sourceRoot:string,archiveRoot:string) {
  const task=archiveQueue.then(async()=>{
    const entries=await readdir(sourceRoot,{withFileTypes:true});
    let files=0;
    for(const entry of entries.filter(item=>item.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))) {
      const directory=path.join(archiveRoot,entry.name);
      await mkdir(directory,{recursive:true});
      if(await syncPowerLog(path.join(sourceRoot,entry.name,"Power.log"),path.join(directory,"Power.log"))) files++;
    }
    const direct=path.join(sourceRoot,"Power.log");
    if(await fileSize(direct)!==null) {
      const directory=path.join(archiveRoot,"direct");
      await mkdir(directory,{recursive:true});
      if(await syncPowerLog(direct,path.join(directory,"Power.log"))) files++;
    }
    return files;
  });
  archiveQueue=task.then(()=>undefined,()=>undefined);
  return task;
}
