import test from "node:test";
import assert from "node:assert/strict";
import { contextStart } from "../lib/match-context";

const stateStart = "GameState.DebugPrintPower() - CREATE_GAME";
const taskStart = "PowerTaskList.DebugPrintPower() -     CREATE_GAME";
test("player identification includes metadata before the current task", () => {
  const prefix = "previous log line\n";
  assert.equal(contextStart(prefix + stateStart + "\nPlayer metadata\n" + taskStart), prefix.length);
});
test("a new game cannot reuse the previous game's player metadata", () => {
  const oldGame = stateStart + "\n" + taskStart + "\n";
  assert.equal(contextStart(oldGame + taskStart), -1);
  assert.equal(contextStart(oldGame + stateStart + "\n" + taskStart), oldGame.length);
  assert.equal(contextStart(stateStart), -1);
});
