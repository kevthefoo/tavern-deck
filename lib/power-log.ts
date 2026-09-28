import { identifyPlayer, type IdentityOptions } from "./player-identity";
import { defaultDeck } from "./decks";
export type DeckEvent = { key:string; kind:"draw"|"return"|"game-start"; cardId?:string; name?:string; line:string; lineNumber:number };
let friendlyPlayer:number|undefined;
const entityCards=new Map<number,string>();
const entityPlayers=new Map<number,number>();
const entityZones=new Map<number,string>();

export function resetPowerLogState() {
  friendlyPlayer=undefined;
  entityCards.clear();
  entityPlayers.clear();
  entityZones.clear();
}

export function friendlyDeckCount() {
  if(friendlyPlayer===undefined) return null;
  let count=0;
  for(const [entityId,zone] of entityZones) {
    if(zone==="DECK" && entityPlayers.get(entityId)===friendlyPlayer) count++;
  }
  return count;
}


export function matchStatus(input:string, ageMs:number):"active"|"idle"|"stale" {
  const latest=latestGameSlice(input).contents;
  if(!latest) return "idle";
  const ended=latest.split(/\r?\n/).some(line=>
    line.includes("PowerTaskList.DebugPrintPower()") &&
    /TAG_CHANGE .*tag=(?:PLAYSTATE value=(?:WON|LOST|TIED)|STATE value=COMPLETE|STEP value=FINAL_GAMEOVER)\b/.test(line));
  if(ended) return "idle";
  return ageMs>180_000 ? "stale" : "active";
}

/** Return only the latest game, so reconnecting clients cannot replay an old match. */
export function latestGameSlice(input:string) {
  const markerIndex=[...input.matchAll(/PowerTaskList\.DebugPrintPower\(\) -\s+CREATE_GAME/g)].at(-1)?.index ?? -1;
  if(markerIndex<0) return { contents:"", startOffset:-1 };
  const lineStart=input.lastIndexOf("\n",markerIndex)+1;
  return { contents:input.slice(lineStart), startOffset:lineStart };
}

function entityDetails(line:string) {
  const entity = line.match(/entityName=(.*?)\s+id=\d+.*?cardId=([^\s\]]*)/);
  const revealedId = line.match(/\bCardID=([^\s]+)/)?.[1];
  return { name:entity?.[1]?.trim(), cardId:revealedId || entity?.[2]?.trim() || undefined };
}

export function parsePowerLog(input:string, firstLine=0, identity:IdentityOptions={className:defaultDeck.className}):DeckEvent[] {
  const events:DeckEvent[]=[];
  // A generated card shuffled into the deck is logged as SHOW_ENTITY while it
  // is already in DECK, followed by HIDE_ENTITY ... value=DECK.  Keep that
  // reveal provisional so it is not mistaken for a real draw.
  const pendingDeckReveals=new Map<number,DeckEvent>();
  input.split(/\r?\n/).forEach((line,index)=>{
    const lineNumber=firstLine+index;
    // PowerTaskList mirrors each authoritative event once; GameState contains duplicates.
    if (!line.includes("PowerTaskList.DebugPrintPower()")) return;
    if (line.includes("CREATE_GAME")) { resetPowerLogState(); friendlyPlayer=identifyPlayer(input,identity); events.push({key:`start-${lineNumber}`,kind:"game-start",line,lineNumber}); return; }

    const entityId=Number(line.match(/\bid=(\d+)/)?.[1] || line.match(/Entity=(\d+)/)?.[1]);
    const revealedCardId=line.match(/\bCardID=([^\s]+)/)?.[1];
    if(entityId && revealedCardId) entityCards.set(entityId,revealedCardId);
    const entityPlayer=Number(line.match(/player=(\d+)\]/)?.[1]);
    const entityZone=line.match(/\bzone=([A-Z]+)\b/)?.[1];
    if(entityId && entityPlayer) entityPlayers.set(entityId,entityPlayer);
    if(entityId && entityZone && /FULL_ENTITY/.test(line)) entityZones.set(entityId,entityZone);

    const ourEntity=friendlyPlayer!==undefined && (entityPlayer || entityPlayers.get(entityId))===friendlyPlayer;
    const isDraw=ourEntity && /SHOW_ENTITY/.test(line) && /zone=DECK/.test(line) && /\bCardID=\S+/.test(line);
    const isReturn=ourEntity && /HIDE_ENTITY/.test(line) && /tag=ZONE value=DECK/.test(line);
    const zoneChange=line.match(/tag=ZONE value=(\S+)/)?.[1];
    if(entityId && isDraw) entityZones.set(entityId,"HAND");
    else if(entityId && isReturn) entityZones.set(entityId,"DECK");
    else if(entityId && zoneChange) entityZones.set(entityId,zoneChange);
    if(entityId && zoneChange && zoneChange!=="DECK" && !/HIDE_ENTITY/.test(line)) pendingDeckReveals.delete(entityId);
    if (!isDraw && !isReturn) return;
    const details=entityDetails(line);
    const name=details.name,cardId=details.cardId || entityCards.get(entityId);
    if(isReturn){
      const provisionalDraw=pendingDeckReveals.get(entityId);
      if(provisionalDraw){
        const eventIndex=events.indexOf(provisionalDraw);
        if(eventIndex>=0) events.splice(eventIndex,1);
        pendingDeckReveals.delete(entityId);
      }
    }
    const event:DeckEvent={key:`${isDraw?"draw":"return"}-${lineNumber}`,kind:isDraw?"draw":"return",name:name?.startsWith("UNKNOWN ENTITY")?undefined:name,cardId,line,lineNumber};
    events.push(event);
    if(isDraw && entityId) pendingDeckReveals.set(entityId,event);
  });
  return events;
}
