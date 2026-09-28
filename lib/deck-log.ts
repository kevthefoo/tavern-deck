import { decode } from "deckstrings";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { LogSettings } from "./local-store";
export type LoggedDeck = {name:string;code:string;offset:number;record:string};
/** Only consume newline-terminated records: the game can be halfway through a write. */
export function parseDeckLog(input:string, baseOffset=0):LoggedDeck|null {
  let name="";
  let latest:LoggedDeck|null=null;
  for(const match of input.matchAll(/([^\n]*)\n/g)) {
    const line=match[1].replace(/\r$/,"");
    const header=line.match(/###\s+(.+)$/);
    if(header){name=header[1].trim().slice(0,80);latest=null;continue;}
    if(!name)continue;
    const code=line.match(/(?:^|\s)(AA[A-Za-z0-9+/]{10,}={0,2})\s*$/)?.[1];
    if(!code || code.length>4096)continue;
    try {
      const deck=decode(code);
      if(deck.heroes.length!==1 || !deck.cards.length || deck.cards.length>60)continue;
      latest={name,code,record:match[0],offset:baseOffset+Buffer.byteLength(input.slice(0,match.index))+Buffer.byteLength(match[0])};
    } catch { /* Keep waiting for a valid, complete deck export. */ }
  }
  return latest;
}
/** Select the current session first; never fall back to an old session's Decks.log. */
export async function deckLogFile(settings:LogSettings):Promise<string|null> {
  if(settings.file)return path.join(path.dirname(settings.file),"Decks.log");
  if(!settings.root)return null;
  try {
    const entries=await readdir(settings.root,{withFileTypes:true});
    // A root that directly contains logs is itself a session directory.
    if(entries.some(e=>e.isFile() && /^(Power|Decks|Hearthstone)\.log$/i.test(e.name)))return path.join(settings.root,"Decks.log");
    const dirs=await Promise.all(entries.filter(e=>e.isDirectory() && !e.name.startsWith('.')).map(async e=>{
      const dir=path.join(settings.root,e.name);
      try{return {dir,modified:(await stat(dir)).mtimeMs};}catch{return null;}
    }));
    const newest=dirs.filter(d=>d!==null).sort((a,b)=>b.modified-a.modified || b.dir.localeCompare(a.dir))[0];
    return newest ? path.join(newest.dir,"Decks.log") : null;
  }catch{return null;}
}
export async function readLoggedDeck(file:string) {
  const handle=await open(file,"r");
  try {
    const info=await handle.stat();
    const size=Math.min(info.size,1024*1024);
    let base=info.size-size;
    const buffer=Buffer.alloc(size);
    const {bytesRead}=await handle.read(buffer,0,size,base);
    let contents=buffer.subarray(0,bytesRead);
    if(base>0){const first=contents.indexOf(10);if(first<0)return null;base+=first+1;contents=contents.subarray(first+1);}
    const event=parseDeckLog(contents.toString("utf8"),base);
    if(!event)return null;
    const fingerprint=createHash("sha256").update(JSON.stringify([file,info.ino,info.birthtimeMs,event])).digest("hex");
    return {...event,fingerprint};
  }finally{await handle.close();}
}
