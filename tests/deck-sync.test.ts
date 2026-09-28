import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp,mkdir,writeFile,appendFile,rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { encode } from "deckstrings";
import { defaultDeck, type Deck } from "../lib/decks";
import { updateState,readState } from "../lib/local-store";
import { syncDeckFromLog } from "../lib/deck-sync";
const otherCode=encode({heroes:[637],format:2,cards:[[315,2]]});
const other:Deck={...defaultDeck,id:"mage",code:otherCode,name:"Mage",className:"Mage"};
const block=(code:string)=>`D 10:00:00.000 ### From game\nD 10:00:00.000 ${code}\n`;
test("auto-import, offline reuse, manual override, new events, disable, and retry",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"deck-sync-"));const before=process.env.TAVERN_DATA_DIR;process.env.TAVERN_DATA_DIR=path.join(dir,"data");
 const logs=path.join(dir,"logs");const file=path.join(logs,"Decks.log");await mkdir(logs);
 try{
  await updateState(s=>{s.settings={root:logs,file:"",playerName:""};});
  assert.equal((await syncDeckFromLog()).status,"missing");
  await writeFile(file,block(otherCode));let requests=0;
  const resolve=async()=>{requests++;return other;};
  assert.equal((await syncDeckFromLog(resolve)).deck.id,"mage");assert.equal(requests,1);
  assert.equal((await readState()).decks.length,2);
  await updateState(s=>{s.activeId=defaultDeck.id;});
  assert.equal((await syncDeckFromLog(resolve)).deck.id,defaultDeck.id,"unchanged log must respect manual selection");
  await appendFile(file,block(otherCode));
  assert.equal((await syncDeckFromLog(resolve)).deck.id,"mage");assert.equal(requests,1,"known decks work offline");
  await updateState(s=>{s.settings!.autoDetect=false;});await appendFile(file,block(defaultDeck.code));
  assert.equal((await syncDeckFromLog(resolve)).status,"disabled");assert.equal((await readState()).activeId,"mage");
  await updateState(s=>{s.settings!.autoDetect=true;});
  assert.equal((await syncDeckFromLog(resolve)).deck.id,defaultDeck.id);
  const unknown=encode({heroes:[637],format:2,cards:[[315,1]]});await appendFile(file,block(unknown));
  assert.equal((await syncDeckFromLog(async()=>{throw new Error("Offline");})).status,"error");
  assert.equal((await readState()).activeId,defaultDeck.id);
  assert.equal((await syncDeckFromLog(async()=>({...other,id:"new",code:unknown}))).deck.id,"new");
  const pending=encode({heroes:[637],format:2,cards:[[315,3]]});await appendFile(file,block(pending));
  const racing=await syncDeckFromLog(async()=>{
    await updateState(s=>{s.activeId=defaultDeck.id;});
    return {...other,id:"late",code:pending};
  });
  assert.equal(racing.deck.id,defaultDeck.id,"manual choice during metadata lookup wins");
  assert.equal((await syncDeckFromLog(resolve)).deck.id,defaultDeck.id);

 }finally{if(before===undefined)delete process.env.TAVERN_DATA_DIR;else process.env.TAVERN_DATA_DIR=before;await rm(dir,{recursive:true,force:true});}
});
