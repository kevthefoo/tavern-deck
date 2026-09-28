import assert from "node:assert/strict";
import test from "node:test";
import { friendlyDeckCount, latestGameSlice, matchStatus, parsePowerLog, resetPowerLogState } from "../lib/power-log";

test("finished matches become idle and a new match resumes tracking",()=>{
  const start="D PowerTaskList.DebugPrintPower() -     CREATE_GAME";
  for(const tag of ["PLAYSTATE value=WON","PLAYSTATE value=LOST","PLAYSTATE value=TIED","STATE value=COMPLETE","STEP value=FINAL_GAMEOVER"]) {
    const ended=`${start}\nD PowerTaskList.DebugPrintPower() - TAG_CHANGE Entity=GameEntity tag=${tag}`;
    assert.equal(matchStatus(ended,0),"idle");
    assert.equal(matchStatus(`${ended}\n${start}`,0),"active");
  }
  assert.equal(matchStatus("",0),"idle");
  assert.equal(matchStatus(start,90_000),"active");
  assert.equal(matchStatus(start,180_001),"stale");
});

test("parses current Hearthstone PowerTaskList format without GameState duplicates",()=>{
  resetPowerLogState();
  const log=[
    "D GameState.DebugPrintPower() - CREATE_GAME",
    "D PowerTaskList.DebugPrintPower() -     CREATE_GAME",
    "D GameState.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=21 zone=DECK zonePos=0 cardId= player=1] CardID=TIME_600",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Rexxar id=71 zone=PLAY zonePos=0 cardId=HERO_05 player=1] CardID=HERO_05",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=21 zone=DECK zonePos=0 cardId= player=1] CardID=TIME_600",
    "D PowerTaskList.DebugPrintPower() - TAG_CHANGE Entity=[entityName=Precise Shot id=21 zone=DECK zonePos=0 cardId=TIME_600 player=1] tag=ZONE value=HAND",
    "D PowerTaskList.DebugPrintPower() - HIDE_ENTITY - Entity=[entityName=Precise Shot id=21 zone=HAND zonePos=4 cardId=TIME_600 player=1] tag=ZONE value=DECK",
  ].join("\n");
  const events=parsePowerLog(log);
  assert.deepEqual(events.map(event=>event.kind),["game-start","draw","return"]);
  assert.equal(events[1].cardId,"TIME_600");
  assert.equal(events[1].name,undefined);
  assert.equal(events[2].name,"Precise Shot");
});

test("ignores opponent reveals",()=>{
  resetPowerLogState();
  const line="D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=43 zone=DECK zonePos=0 cardId= player=2] CardID=CAP_107";
  assert.deepEqual(parsePowerLog(line),[]);
});

test("follows the Hunter player when the seat changes between games",()=>{
  resetPowerLogState();
  const log=[
    "D PowerTaskList.DebugPrintPower() - CREATE_GAME",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Anduin id=69 zone=PLAY zonePos=0 cardId=HERO_09 player=1] CardID=HERO_09",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Rexxar id=71 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=44 zone=DECK zonePos=0 cardId= player=2] CardID=CATA_554",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=30 zone=DECK zonePos=0 cardId= player=1] CardID=TIME_601",
  ].join("\n");
  const events=parsePowerLog(log);
  assert.deepEqual(events.map(event=>event.kind),["game-start","draw"]);
  assert.equal(events[1].cardId,"CATA_554");
});

test("tracks a generated card hidden into the deck",()=>{
  resetPowerLogState();
  const log=[
    "D PowerTaskList.DebugPrintPower() - CREATE_GAME",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Rexxar id=71 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=87 zone=SETASIDE zonePos=0 cardId= player=2] CardID=JAIL_881t",
    "D PowerTaskList.DebugPrintPower() - HIDE_ENTITY - Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=87 zone=DECK zonePos=0 cardId= player=2] tag=ZONE value=DECK",
  ].join("\n");
  const events=parsePowerLog(log);
  assert.equal(events.at(-1)?.kind,"return");
  assert.equal(events.at(-1)?.cardId,"JAIL_881t");
});

test("counts both Tripwires shuffled into the deck without treating their reveals as draws",()=>{
  resetPowerLogState();
  const log=[
    "D PowerTaskList.DebugPrintPower() - CREATE_GAME",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Rexxar id=71 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=UNKNOWN ENTITY [cardType=INVALID] id=118 zone=DECK zonePos=0 cardId= player=2] CardID=",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=118 zone=DECK zonePos=0 cardId= player=2] CardID=JAIL_879t",
    "D PowerTaskList.DebugPrintPower() - HIDE_ENTITY - Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=118 zone=DECK zonePos=0 cardId= player=2] tag=ZONE value=DECK",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=UNKNOWN ENTITY [cardType=INVALID] id=119 zone=DECK zonePos=0 cardId= player=2] CardID=",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=119 zone=DECK zonePos=0 cardId= player=2] CardID=JAIL_879t",
    "D PowerTaskList.DebugPrintPower() - HIDE_ENTITY - Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=119 zone=DECK zonePos=0 cardId= player=2] tag=ZONE value=DECK",
  ].join("\n");
  const events=parsePowerLog(log);
  assert.deepEqual(events.map(event=>event.kind),["game-start","return","return"]);
  assert.deepEqual(events.slice(1).map(event=>event.cardId),["JAIL_879t","JAIL_879t"]);
});

test("keeps full-game context while incremental callers filter by line number",()=>{
  resetPowerLogState();
  const log=[
    "D PowerTaskList.DebugPrintPower() - CREATE_GAME",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Rexxar id=71 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05",
    "D PowerTaskList.DebugPrintPower() - TAG_CHANGE Entity=71 tag=TURN value=8",
    "D PowerTaskList.DebugPrintPower() - SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=91 zone=DECK zonePos=0 cardId= player=2] CardID=TIME_601",
  ].join("\n");
  const incremental=parsePowerLog(log).filter(event=>event.lineNumber>=3);
  assert.deepEqual(incremental.map(event=>[event.kind,event.cardId,event.lineNumber]),[["draw","TIME_601",3]]);
});

test("reconnect snapshot contains only the newest game",()=>{
  const first="D PowerTaskList.DebugPrintPower() -     CREATE_GAME\nold match";
  const second="D PowerTaskList.DebugPrintPower() -     CREATE_GAME\nnew match";
  const sliced=latestGameSlice(`${first}\n${second}`);
  assert.equal(sliced.contents,second);
  assert.equal(sliced.startOffset,first.length+1);
});

test("counts friendly deck entities even when cards move without a revealed name",()=>{
  resetPowerLogState();
  const log=[
    "D PowerTaskList.DebugPrintPower() -     CREATE_GAME",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=UNKNOWN ENTITY id=21 zone=DECK zonePos=0 cardId= player=2] CardID=",
    "D PowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Rexxar id=71 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05",
    "D PowerTaskList.DebugPrintPower() - TAG_CHANGE Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] tag=ZONE value=REMOVEDFROMGAME",
  ].join("\n");
  parsePowerLog(log);
  assert.equal(friendlyDeckCount(),1);
});

test("latest game keeps a stable CREATE_GAME line with non-ASCII history",()=>{
  const old="D 14:00:00 玩家 PowerTaskList.DebugPrintPower() -     CREATE_GAME\n舊局";
  const current="D 14:24:00.3775238 PowerTaskList.DebugPrintPower() -     CREATE_GAME\n新局";
  const sliced=latestGameSlice(`${old}\n${current}`);
  assert.equal(sliced.contents.split("\n",1)[0],current.split("\n",1)[0]);
});
