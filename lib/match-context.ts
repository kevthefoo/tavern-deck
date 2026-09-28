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
