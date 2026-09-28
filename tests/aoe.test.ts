import test from "node:test";
import assert from "node:assert/strict";
import { aoeCards, classNames } from "../lib/aoe";
import { parseMatchContext } from "../lib/match-context";
function fixture(format = "FT_STANDARD", hero = "08bl", gameType = "GT_RANKED") {
  return `GameState.DebugPrintPower() - CREATE_GAME\nGameState.DebugPrintGame() - GameType=${gameType}\nGameState.DebugPrintGame() - FormatType=${format}\nGameState.DebugPrintGame() - PlayerID=1, PlayerName=UNKNOWN HUMAN PLAYER\nGameState.DebugPrintGame() - PlayerID=2, PlayerName=Local\nPowerTaskList.DebugPrintPower() -     CREATE_GAME\nPowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Hero id=65 zone=PLAY zonePos=0 cardId=HERO_${hero} player=1] CardID=HERO_${hero}\nPowerTaskList.DebugPrintPower() - FULL_ENTITY - Updating [entityName=Hero id=66 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05`;
}
test("metadata preceding task CREATE_GAME identifies mode and remote hero", () => {
  assert.deepEqual(parseMatchContext(fixture()), {format:"standard",opponentClass:"MAGE"});
  assert.deepEqual(parseMatchContext(fixture("FT_WILD", "05")), {format:"wild",opponentClass:"HUNTER"});
});
test("new matches cannot inherit old metadata; unsupported modes remain unknown", () => {
  assert.deepEqual(parseMatchContext(fixture()+"\nPowerTaskList.DebugPrintPower() -     CREATE_GAME"), {format:"unknown",opponentClass:null});
  assert.equal(parseMatchContext(fixture()+"\n"+fixture("FT_WILD", "11" )).opponentClass,"DEATHKNIGHT");
  assert.equal(parseMatchContext(fixture("FT_STANDARD","08","GT_ARENA")).format,"unknown");
  assert.equal(parseMatchContext(fixture().replace("UNKNOWN HUMAN PLAYER","Remote")).opponentClass,null);
});
test("standard excludes rotated cards, wild includes them, copies deduplicate", () => {
  assert.ok(!aoeCards("WARRIOR","standard").some(c=>c.name === "Brawl"));
  assert.ok(aoeCards("WARRIOR","wild").some(c=>c.name === "Brawl"));
  const cards = aoeCards("PALADIN","wild");
  assert.equal(cards.filter(c=>c.name === "Equality").length,1);
  assert.equal(aoeCards("MAGE","unknown").length,0);
  assert.equal(aoeCards(null,"standard").length,0);
});
test("all eleven classes have researched entries, including dual class and neutral", () => {
  for(const cls of Object.keys(classNames)) assert.ok(aoeCards(cls,"standard").some(c=>c.classes.includes(cls)),cls);
  assert.ok(aoeCards("DRUID","standard").some(c=>c.name === "Twilight Timereaver"));
  assert.ok(aoeCards("MAGE","standard").some(c=>c.classes.includes("NEUTRAL")));
  for(const cls of Object.keys(classNames)) for(const c of aoeCards(cls,"wild")) assert.doesNotMatch(c.text,/\{\d+\}/);
});

test("AOE display names, effects and conditions stay in English", () => {
  for (const cls of Object.keys(classNames)) {
    assert.doesNotMatch(classNames[cls], /[\u3400-\u9fff]/);
    for (const card of aoeCards(cls, "wild")) {
      assert.doesNotMatch(`${card.name} ${card.text} ${card.timing}`, /[\u3400-\u9fff]/);
    }
  }
});
