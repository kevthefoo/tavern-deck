import assert from "node:assert/strict";
import test from "node:test";
import { parseGameResults, summarizeResults } from "../lib/game-stats";

const p=(text:string)=>`D 10:00:00.000 PowerTaskList.DebugPrintPower() -     ${text}`;

test("calculates overall and opponent-class win rates from completed games",()=>{
  const contents=[
    p("CREATE_GAME"),
    "D GameState.DebugPrintEntitiesChosen() - id=1 Player=Opponent#1 EntitiesCount=1",
    "D GameState.DebugPrintEntitiesChosen() - id=2 Player=Friendly#1 EntitiesCount=1",
    p("FULL_ENTITY - Updating [entityName=Jaina id=65 zone=PLAY zonePos=0 cardId=HERO_08 player=1] CardID=HERO_08"),
    p("FULL_ENTITY - Updating [entityName=Rexxar id=67 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05"),
    p("SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=MEND_300"),
    p("TAG_CHANGE Entity=Opponent#1 tag=PLAYSTATE value=LOST"),
    p("TAG_CHANGE Entity=Friendly#1 tag=PLAYSTATE value=WON"),
  ].join("\n");
  const summary=summarizeResults(parseGameResults([{source:"fixture",contents}]));
  assert.deepEqual(summary.overall,{opponentClass:"All",games:1,wins:1,losses:0,ties:0,winRate:100});
  assert.equal(summary.byClass[0].opponentClass,"Mage");
  assert.equal(summary.byClass[0].winRate,100);
});

test("does not count an unfinished game",()=>{
  const contents=[p("CREATE_GAME"),p("SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=MEND_300")].join("\n");
  assert.deepEqual(parseGameResults([{source:"fixture",contents}]),[]);
});

test("identifies the updated deck from Glacial Shard",()=>{
  const contents=[
    p("CREATE_GAME"),
    "D GameState.DebugPrintEntitiesChosen() - id=1 Player=Opponent#1 EntitiesCount=1",
    "D GameState.DebugPrintEntitiesChosen() - id=2 Player=Friendly#1 EntitiesCount=1",
    p("FULL_ENTITY - Updating [entityName=Illidan id=65 zone=PLAY zonePos=0 cardId=HERO_10 player=1] CardID=HERO_10"),
    p("FULL_ENTITY - Updating [entityName=Rexxar id=67 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05"),
    p("SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=CORE_UNG_205"),
    p("TAG_CHANGE Entity=Opponent#1 tag=PLAYSTATE value=LOST"),
    p("TAG_CHANGE Entity=Friendly#1 tag=PLAYSTATE value=WON"),
  ].join("\n");
  assert.deepEqual(parseGameResults([{source:"updated-deck",contents}]),[
    {id:"updated-deck:0",opponentClass:"Demon Hunter",result:"win"},
  ]);
});

test("identifies the latest deck from Arrow Retriever, Rockskipper, or Niri",()=>{
  for (const cardId of ["TIME_601", "TLC_427", "TLC_836"]) {
    const contents=[
      p("CREATE_GAME"),
      "D GameState.DebugPrintEntitiesChosen() - id=1 Player=Opponent#1 EntitiesCount=1",
      "D GameState.DebugPrintEntitiesChosen() - id=2 Player=Friendly#1 EntitiesCount=1",
      p("FULL_ENTITY - Updating [entityName=Garrosh id=65 zone=PLAY zonePos=0 cardId=HERO_01 player=1] CardID=HERO_01"),
      p("FULL_ENTITY - Updating [entityName=Rexxar id=67 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05"),
      p(`SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=${cardId}`),
      p("TAG_CHANGE Entity=Opponent#1 tag=PLAYSTATE value=LOST"),
      p("TAG_CHANGE Entity=Friendly#1 tag=PLAYSTATE value=WON"),
    ].join("\n");
    assert.deepEqual(parseGameResults([{source:cardId,contents}]),[
      {id:`${cardId}:0`,opponentClass:"Warrior",result:"win"},
    ]);
  }
});
