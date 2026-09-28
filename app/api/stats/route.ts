import { effectiveSettings, selectedDeck } from "@/lib/local-store";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseGameResults, summarizeResults } from "@/lib/game-stats";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function emptyPayload() {
  const summary=summarizeResults([]);
  return {...summary,recent10:summary,updatedAt:new Date().toISOString()};
}

export async function GET(request?:Request) {
  const {state,deck}=await selectedDeck(request ? new URL(request.url).searchParams.get("deck") : null);
  const settings=effectiveSettings(state);
  const root=settings.root;
  if(!root) return Response.json(emptyPayload());
  try {
    const entries=await readdir(root,{withFileTypes:true});
    const logs=(await Promise.all(entries.filter(entry=>entry.isDirectory()).map(async entry=>{
      const file=path.join(root,entry.name,"Power.log");
      try { return {source:entry.name,contents:await readFile(file,"utf8")}; } catch { return null; }
    }))).filter(item=>item!==null).sort((a,b)=>a.source.localeCompare(b.source));
    try { logs.push({source:"direct",contents:await readFile(path.join(root,"Power.log"),"utf8")}); } catch {}
    const results=parseGameResults(logs,{className:deck.className,playerName:settings.playerName});
    const payload={
      ...summarizeResults(results),
      recent10:summarizeResults(results.slice(-10)),
      updatedAt:new Date().toISOString(),
    };
    return Response.json(payload);
  } catch {
    return Response.json(emptyPayload(),{status:503});
  }
}
