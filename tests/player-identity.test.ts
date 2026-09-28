import assert from "node:assert/strict";
import test from "node:test";
import { identifyPlayer } from "../lib/player-identity";
import { parsePowerLog, resetPowerLogState } from "../lib/power-log";
import { parseGameResults } from "../lib/game-stats";
const p=(s:string)=>`PowerTaskList.DebugPrintPower() -     ${s}`;
const hero=(cls:string,player:number)=>p(`FULL_ENTITY - Updating [entityName=Hero id=${60+player} zone=PLAY zonePos=0 cardId=HERO_${cls} player=${player}] CardID=HERO_${cls}`);
const meta="GameState.DebugPrintPower() - CREATE_GAME\nGameState.DebugPrintGame() - PlayerID=1, PlayerName=UNKNOWN HUMAN PLAYER\nGameState.DebugPrintGame() - PlayerID=2, PlayerName=Local";
test("identifies local player in a mirror from metadata; ambiguous class alone is unknown",()=>{
  const mirrors=hero("08",1)+"\n"+hero("08",2);
  assert.equal(identifyPlayer(mirrors,{className:"Mage"}),undefined);
  assert.equal(identifyPlayer(meta+"\n"+mirrors,{className:"Mage"}),2);
  assert.equal(identifyPlayer(meta+"\n"+mirrors,{playerName:"Wrong"}),undefined);
  assert.equal(identifyPlayer(meta+"\n"+mirrors,{playerName:"Local"}),2);
});
test("tracks a non-Hunter and ignores the opponent's draws",()=>{
  resetPowerLogState();
  const input=[p("CREATE_GAME"),hero("01",1),hero("08",2),p("SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=CS2_029"),p("SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=21 zone=DECK zonePos=0 cardId= player=1] CardID=CS2_029")].join("\n");
  assert.equal(parsePowerLog(input,0,{className:"Mage"}).filter(e=>e.kind==="draw").length,1);
});
test("class history handles metadata, mirrors, mixed classes and multiple games",()=>{
  const game=(cls:string)=>[meta,p("CREATE_GAME"),hero("08",1),hero(cls,2),"GameState.DebugPrintEntitiesChosen() - id=2 Player=Local EntitiesCount=1",p("TAG_CHANGE Entity=Local tag=PLAYSTATE value=WON")].join("\n");
  const logs=[{source:"fixture",contents:game("08")+"\n"+game("01")}];
  assert.equal(parseGameResults(logs,{className:"Mage"}).length,1);
  assert.equal(parseGameResults(logs,{className:"Warrior"}).length,1);
  assert.equal(parseGameResults(logs,{className:"Hunter"}).length,0);
});
