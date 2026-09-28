import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp,readFile,rm,writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { readState,updateState,effectiveSettings } from "../lib/local-store";
import { checkLocalMutation } from "../lib/local-request";
test("settings persist atomically and concurrent deck changes retain settings",async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),"tavern-store-"));const previous=process.env.TAVERN_DATA_DIR;process.env.TAVERN_DATA_DIR=dir;
  try{
    assert.equal((await readState()).activeId,"draw-it");
    await Promise.all([updateState(s=>{s.settings={root:"/logs",file:"",playerName:"Local"};}),updateState(s=>{s.decks[0].name="Renamed";})]);
    const saved=await readState();assert.equal(saved.decks[0].name,"Renamed");assert.equal(effectiveSettings(saved).root,"/logs");
    assert.equal(JSON.parse(await readFile(path.join(dir,"settings.json"),"utf8")).version,1);
    await writeFile(path.join(dir,"settings.json"),"broken");
    await assert.rejects(()=>updateState(s=>{s.activeId="other";}));
    assert.equal(await readFile(path.join(dir,"settings.json"),"utf8"),"broken");
  }finally{if(previous===undefined)delete process.env.TAVERN_DATA_DIR;else process.env.TAVERN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});
test("rejects cross-origin and non-local mutations",()=>{
  assert.throws(()=>checkLocalMutation(new Request("http://localhost:3080/api/settings",{headers:{origin:"https://example.com","content-type":"application/json"}})));
  assert.throws(()=>checkLocalMutation(new Request("http://example.com/api/settings",{headers:{"content-type":"application/json"}})));
  assert.doesNotThrow(()=>checkLocalMutation(new Request("http://localhost:3080/api/settings",{headers:{origin:"http://localhost:3080","content-type":"application/json"}})));
});
