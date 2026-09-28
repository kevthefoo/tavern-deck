import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GET } from "../app/api/stats/route";

const power = (message: string) =>
  `D PowerTaskList.DebugPrintPower() - ${message}`;

function completedGame(result: "WON" | "LOST") {
  return [
    power("CREATE_GAME"),
    "D GameState.DebugPrintEntitiesChosen() - id=1 Player=Opponent#1 EntitiesCount=1",
    "D GameState.DebugPrintEntitiesChosen() - id=2 Player=Friendly#1 EntitiesCount=1",
    power("FULL_ENTITY - Updating [entityName=Garrosh id=65 zone=PLAY zonePos=0 cardId=HERO_01 player=1] CardID=HERO_01"),
    power("FULL_ENTITY - Updating [entityName=Rexxar id=67 zone=PLAY zonePos=0 cardId=HERO_05 player=2] CardID=HERO_05"),
    power("SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY id=20 zone=DECK zonePos=0 cardId= player=2] CardID=TIME_601"),
    power(`TAG_CHANGE Entity=Friendly#1 tag=PLAYSTATE value=${result}`),
  ].join("\n");
}

test("recalculates stats from every Power.log on every request", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hearthstone-stats-"));
  const previousRoot = process.env.HEARTHSTONE_LOG_ROOT;
  const previousData = process.env.TAVERN_DATA_DIR;
  process.env.TAVERN_DATA_DIR = path.join(root,"private-settings");

  try {
    const session = path.join(root, "session-1");
    const log = path.join(session, "Power.log");
    await mkdir(session);
    process.env.HEARTHSTONE_LOG_ROOT = root;

    await writeFile(log, completedGame("WON"));
    const first = await GET().then((response) => response.json());
    assert.deepEqual(first.overall, {
      opponentClass: "All",
      games: 1,
      wins: 1,
      losses: 0,
      ties: 0,
      winRate: 100,
    });
    assert.deepEqual(first.recent10.overall, first.overall);

    await writeFile(log, completedGame("LOST"));
    const second = await GET().then((response) => response.json());
    assert.deepEqual(second.overall, {
      opponentClass: "All",
      games: 1,
      wins: 0,
      losses: 1,
      ties: 0,
      winRate: 0,
    });
    assert.deepEqual(second.recent10.overall, second.overall);

    const finalContents = [
        completedGame("LOST"),
        completedGame("LOST"),
        ...Array.from({ length: 10 }, () => completedGame("WON")),
      ].join("\n");
    await writeFile(log, finalContents);
    const ranged = await GET().then((response) => response.json());
    assert.deepEqual(ranged.overall, {
      opponentClass: "All",
      games: 12,
      wins: 10,
      losses: 2,
      ties: 0,
      winRate: 83,
    });
    assert.deepEqual(ranged.recent10.overall, {
      opponentClass: "All",
      games: 10,
      wins: 10,
      losses: 0,
      ties: 0,
      winRate: 100,
    });
  } finally {
    if (previousRoot === undefined) delete process.env.HEARTHSTONE_LOG_ROOT;
    else process.env.HEARTHSTONE_LOG_ROOT = previousRoot;
    if (previousData === undefined) delete process.env.TAVERN_DATA_DIR;
    else process.env.TAVERN_DATA_DIR = previousData;
    await rm(root, { recursive: true, force: true });
  }
});
