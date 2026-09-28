import { effectiveSettings, selectedDeck, type LogSettings } from "@/lib/local-store";
import { identifyPlayer, heroClasses } from "@/lib/player-identity";
import { access, open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { contextStart, parseMatchContext } from "@/lib/match-context";
import { friendlyDeckCount, latestGameSlice, matchStatus, parsePowerLog, resetPowerLogState } from "@/lib/power-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fixedCandidates(settings:LogSettings) {
  const home = os.homedir();
  return [
    settings.file,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Blizzard", "Hearthstone", "Logs", "Power.log"),
    path.join(home, "AppData", "Local", "Blizzard", "Hearthstone", "Logs", "Power.log"),
    `/mnt/c/Users/${path.basename(home)}/AppData/Local/Blizzard/Hearthstone/Logs/Power.log`,
  ].filter((value): value is string => Boolean(value));
}

async function latestPowerLog(root: string) {
  try {
    const direct=path.join(root,"Power.log");
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => {
      const file = path.join(root, entry.name, "Power.log");
      try { return { file, modified: (await stat(file)).mtimeMs }; } catch { return null; }
    }));
    try { files.push({file:direct,modified:(await stat(direct)).mtimeMs}); } catch {}
    return files.filter((item): item is {file:string;modified:number} => Boolean(item)).sort((a,b) => b.modified-a.modified)[0]?.file ?? null;
  } catch { return null; }
}

async function findLog(settings:LogSettings) {
  if (settings.file) { try { await access(settings.file); return settings.file; } catch { return null; } }
  if (settings.root) return latestPowerLog(settings.root);
  for (const file of fixedCandidates(settings)) { try { await access(file); return file; } catch {} }
  return null;
}

export async function GET(request: Request) {
  const {state,deck} = await selectedDeck(new URL(request.url).searchParams.get("deck"));
  const settings=effectiveSettings(state);
  const file = await findLog(settings);
  if (!file) return Response.json({ connected:false, cursor:0, events:[], searched:fixedCandidates(settings), root:settings.root });
  const info = await stat(file);
  // Power.log can grow past 100 MB. Read backwards until the newest CREATE_GAME is
  // present instead of reparsing every previous match on every 800 ms poll.
  let windowSize=Math.min(info.size,4*1024*1024), latest={contents:"",startOffset:-1};
  let contextInput = "";
  const handle=await open(file,"r");
  try {
    while(windowSize>0) {
      const buffer=Buffer.alloc(windowSize);
      await handle.read(buffer,0,windowSize,info.size-windowSize);
      const windowStart=info.size-windowSize;
      const sliced=latestGameSlice(buffer.toString("utf8"));
      if(sliced.startOffset>=0) {
        latest={contents:sliced.contents,startOffset:windowStart+sliced.startOffset};
        contextInput = buffer.toString("utf8");
        if (contextStart(contextInput) >= 0 || windowSize === info.size) break;
      }
      if(windowSize===info.size) break;
      windowSize=Math.min(info.size,windowSize*2);
    }
  } finally { await handle.close(); }
  resetPowerLogState();
  const status=matchStatus(latest.contents,Date.now()-info.mtimeMs);
  const identityStart=contextStart(contextInput);
  const playerId=identifyPlayer(identityStart>=0 ? contextInput.slice(identityStart) : latest.contents,{className:deck.className,playerName:settings.playerName});
  const hero=[...latest.contents.matchAll(/FULL_ENTITY[^\r\n]*cardId=HERO_(\d{2})[^\s\]]* player=(\d+)\]/g)].find(m=>Number(m[2])===playerId);
  const localClass=hero ? heroClasses[hero[1]] : undefined;
  const deckMismatch=Boolean(localClass && localClass!==deck.className);
  const events = status==="active" && playerId && !deckMismatch ? parsePowerLog(latest.contents,0,{playerId}) : [];
  const deckCount=friendlyDeckCount();
  const stale = Date.now() - info.mtimeMs > 30_000;
  // Use the CREATE_GAME line itself as the identity. A byte offset calculated
  // from a decoded UTF-8 string drifts when player names contain non-ASCII text.
  const gameStartLine=latest.contents.split(/\r?\n/,1)[0] || null;
  const gameId=gameStartLine ? `${file}:${gameStartLine}` : null;
  return Response.json({ connected:true, status, stale, identityResolved: Boolean(playerId), deckMismatch, localClass, match:status === "active" ? parseMatchContext(contextInput) : null, cursor:info.size, source:file, gameId:status==="active" ? gameId : null, deckCount, snapshot:true, events, modifiedAt:info.mtime.toISOString(), path:file });
}
