import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, appendFile, rm, utimes } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { defaultDeck } from "../lib/decks";
import { parseDeckLog, readLoggedDeck, deckLogFile } from "../lib/deck-log";
const exportText=(name="Draw it",code=defaultDeck.code)=>`D 12:00:00.0000000 ### ${name}\r\nD 12:00:00.0000000 # Standard\r\nD 12:00:00.0000000 ${code}\r\n`;
test("parses timestamped deck exports and the last complete selection",()=>{
 assert.equal(parseDeckLog(exportText())?.code,defaultDeck.code);
 assert.equal(parseDeckLog(exportText()+exportText("Next deck"))?.name,"Next deck");
 assert.equal(parseDeckLog(exportText().replace(/\r\n/g,"\n"))?.name,"Draw it");
 assert.equal(parseDeckLog(`### Bare export\n${defaultDeck.code}\n`)?.name,"Bare export");
});
test("does not accept a partial, malformed, or headerless export",()=>{
 assert.equal(parseDeckLog(exportText().trimEnd()),null);
 assert.equal(parseDeckLog(`${defaultDeck.code}\n`),null);
 assert.equal(parseDeckLog(exportText()+"D 12:01:00.000 ### New deck\nD 12:01:00.000 AAEpartial\n"),null);
 assert.equal(parseDeckLog("### Bad deck\nAAEbrokenbutbase64\n"),null);
});
test("fingerprints ignore unrelated appends but notice a new selection and rotation",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"deck-log-"));const file=path.join(dir,"Decks.log");
 try{
  await writeFile(file,exportText());const first=await readLoggedDeck(file);assert.ok(first);
  await appendFile(file,"D Unrelated debug line\n");assert.equal((await readLoggedDeck(file))?.fingerprint,first.fingerprint);
  await appendFile(file,exportText());assert.notEqual((await readLoggedDeck(file))?.fingerprint,first.fingerprint);
  await writeFile(file,exportText().replaceAll("12:00:00", "12:05:00"));assert.notEqual((await readLoggedDeck(file))?.fingerprint,first.fingerprint);
  await rm(file);await writeFile(file,exportText());assert.notEqual((await readLoggedDeck(file))?.fingerprint,first.fingerprint);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("latest session is selected even if its Decks.log does not exist",async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"deck-session-"));
 try{
  await mkdir(path.join(root,"old"));await writeFile(path.join(root,"old","Decks.log"),exportText());
  await mkdir(path.join(root,"new"));await utimes(path.join(root,"old"),new Date(0),new Date(0));
  assert.equal(await deckLogFile({root,file:"",playerName:""}),path.join(root,"new","Decks.log"));
  assert.equal(await deckLogFile({root,file:path.join(root,"old","Power.log"),playerName:""}),path.join(root,"old","Decks.log"));
 }finally{await rm(root,{recursive:true,force:true});}
});
