import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp,rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { POST,GET } from "../app/api/settings/route";
import { POST as decks } from "../app/api/decks/route";
function request(endpoint:string,data:object){return new Request(`http://localhost:3080/api/${endpoint}`,{method:"POST",headers:{"content-type":"application/json",origin:"http://localhost:3080"},body:JSON.stringify(data)});}
test("settings reject bad paths without changing saved values; deck changes preserve settings",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"tavern-route-"));const before=process.env.TAVERN_DATA_DIR;process.env.TAVERN_DATA_DIR=path.join(dir,"data");
 try{
  assert.equal((await POST(request("settings",{root:dir,file:"",playerName:"Local"}))).status,200);
  assert.equal((await POST(request("settings",{root:path.join(dir,"missing"),file:"",playerName:"Other"}))).status,400);
  assert.equal((await GET().then(r=>r.json())).playerName,"Local");
  assert.equal((await decks(request("decks",{action:"rename",id:"draw-it",name:"Renamed"}))).status,200);
  assert.equal((await GET().then(r=>r.json())).root,dir);
  assert.equal((await decks(request("decks",{action:"delete",id:"draw-it"}))).status,400);
  assert.equal((await decks(request("decks",{action:"select",id:"missing"}))).status,400);
 }finally{if(before===undefined)delete process.env.TAVERN_DATA_DIR;else process.env.TAVERN_DATA_DIR=before;await rm(dir,{recursive:true,force:true});}
});
