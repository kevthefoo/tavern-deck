export type MatchContext = { format: "standard" | "wild" | "unknown"; opponentClass: string | null };
const heroClasses = ["", "WARRIOR", "SHAMAN", "ROGUE", "PALADIN", "HUNTER", "DRUID", "WARLOCK", "MAGE", "PRIEST", "DEMONHUNTER", "DEATHKNIGHT"];

/** Keep pre-CREATE_GAME metadata, but never borrow it from a previous match. */
export function contextStart(input: string) {
  const task = input.lastIndexOf("PowerTaskList.DebugPrintPower() -     CREATE_GAME");
  if (task < 0) return -1;
  const before = input.slice(0, task);
  const starts = [...before.matchAll(/GameState\.DebugPrintPower\(\) -\s+CREATE_GAME/g)];
  const start = starts.at(-1)?.index ?? -1;
  const previousTask = before.lastIndexOf("PowerTaskList.DebugPrintPower() -     CREATE_GAME");
  return start > previousTask ? start : -1;
}

export function parseMatchContext(input: string): MatchContext {
  const start = contextStart(input);
  if (start < 0) return { format: "unknown", opponentClass: null };
  const match = input.slice(start);
  const gameType = match.match(/GameState\.DebugPrintGame\(\) - GameType=(\w+)/)?.[1];
  const mode = match.match(/GameState\.DebugPrintGame\(\) - FormatType=(\w+)/)?.[1];
  const supported = ["GT_RANKED", "GT_CASUAL", "GT_VS_FRIEND"].includes(gameType ?? "");
  const format = supported && mode === "FT_STANDARD" ? "standard" : supported && mode === "FT_WILD" ? "wild" : "unknown";
  // The log marks the remote player UNKNOWN HUMAN PLAYER. Never infer the local
  // player from their class: Hunter mirrors and changing decks make that unsafe.
  const players = [...match.matchAll(/GameState\.DebugPrintGame\(\) - PlayerID=(\d+), PlayerName=([^\r\n]+)/g)];
  const remote = players.filter(p => p[2].trim() === "UNKNOWN HUMAN PLAYER");
  if (remote.length !== 1) return { format, opponentClass: null };
  const id = remote[0][1];
  const hero = [...match.matchAll(/FULL_ENTITY[^\r\n]*cardId=HERO_(\d{2})\w* player=(\d+)\]/g)].find(h => h[2] === id);
  return { format, opponentClass: hero ? heroClasses[Number(hero[1])] || null : null };
}
