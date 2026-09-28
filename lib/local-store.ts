import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultDeck, type Deck } from "./decks";
export type LogSettings = { root: string; file: string; playerName: string; autoDetect?: boolean };
export type LocalState = { version: 1; decks: Deck[]; activeId: string; settings?: LogSettings; autoDeck?: {fingerprint:string} };
const stateFile = () => path.join(process.env.TAVERN_DATA_DIR || path.join(process.cwd(),"data"),"settings.json");
export async function readState(): Promise<LocalState> {
  try {
    const state = JSON.parse(await readFile(stateFile(),"utf8")) as LocalState;
    if (state.version !== 1 || !Array.isArray(state.decks) || !state.decks.length || !state.decks.some(d => d.id === state.activeId)) throw new Error("Invalid saved settings. Restore data/settings.json from a backup.");
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {version:1, decks:[structuredClone(defaultDeck)], activeId:defaultDeck.id};
  }
}
let queue: Promise<unknown> = Promise.resolve();
export function updateState(update: (state:LocalState) => void | Promise<void>): Promise<LocalState> {
  const task = queue.then(async () => {
    const state = await readState();
    await update(state);
    const file = stateFile();
    await mkdir(path.dirname(file),{recursive:true});
    await writeFile(`${file}.tmp`,JSON.stringify(state,null,2),{mode:0o600});
    await rename(`${file}.tmp`,file);
    return state;
  });
  queue = task.catch(() => {});
  return task;
}
export function effectiveSettings(state:LocalState):LogSettings {
  return state.settings ?? {root:process.env.HEARTHSTONE_LOG_ROOT || "",file:process.env.HEARTHSTONE_POWER_LOG || "",playerName:""};
}
export async function selectedDeck(id?:string|null) {
  const state = await readState();
  const deck = state.decks.find(d => d.id === (id || state.activeId));
  if (!deck) throw new Error("Deck no longer exists. Reload the page.");
  return {state,deck};
}
