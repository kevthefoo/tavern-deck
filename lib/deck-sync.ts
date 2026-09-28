import { getCatalog } from "./card-catalog";
import { importDeck } from "./deck-import";
import { deckLogFile, readLoggedDeck } from "./deck-log";
import { effectiveSettings, readState, updateState } from "./local-store";
import type { Deck } from "./decks";
export type AutoDeckStatus = "disabled"|"missing"|"waiting"|"synced"|"error";
type Result={status:AutoDeckStatus;message:string;deck:Deck};
let queue:Promise<unknown>=Promise.resolve();
export function syncDeckFromLog(resolveDeck=(code:string,name:string)=>getCatalog().then(catalog=>importDeck(code,name,catalog))):Promise<Result> {
  const task=queue.then(async()=>{
    const state=await readState();
    const current=state.decks.find(d=>d.id===state.activeId)!;
    const settings=effectiveSettings(state);
    const result=(status:AutoDeckStatus,message:string):Result=>({status,message,deck:current});
    if(settings.autoDetect===false)return result("disabled","Automatic deck detection is off.");
    const file=await deckLogFile(settings);
    if(!file)return result("missing","Set your Logs folder to detect decks automatically.");
    try {
      const event=await readLoggedDeck(file);
      if(!event)return result("waiting","Waiting for a deck. Select your deck in Hearthstone.");
      if(state.autoDeck?.fingerprint===event.fingerprint)return result("synced","Watching for deck changes.");
      // Already imported decks also work offline.
      const known=state.decks.find(d=>d.code===event.code);
      const deck=known ?? await resolveDeck(event.code,event.name);
      const confirmation=await readLoggedDeck(file);
      if(confirmation?.fingerprint!==event.fingerprint)return result("waiting","A newer deck is being logged. Checking again…");
      const updated=await updateState(latest=>{
        // Recheck settings after a potentially slow catalog request.
        if(JSON.stringify(effectiveSettings(latest))!==JSON.stringify(settings))return;
        if(latest.autoDeck?.fingerprint===event.fingerprint)return;
        if(latest.activeId!==state.activeId){latest.autoDeck={fingerprint:event.fingerprint};return;}
        const existing=latest.decks.find(d=>d.id===deck.id || d.code===deck.code);
        if(!existing){
          if(latest.decks.length>=100)throw new Error("Deck library is full. Delete a deck to enable automatic importing.");
          latest.decks.push(deck);
        }
        latest.activeId=existing?.id ?? deck.id;
        latest.autoDeck={fingerprint:event.fingerprint};
      });
      return {status:"synced" as const,message:"Watching for deck changes.",deck:updated.decks.find(d=>d.id===updated.activeId)!};
    }catch(error){
      if((error as NodeJS.ErrnoException).code==="ENOENT")return result("missing","No Decks.log in the current session. Enable Decks logging and restart Hearthstone.");
      return result("error",error instanceof Error ? error.message : "Could not read the deck log. Retrying automatically.");
    }
  });
  queue=task.catch(()=>{});
  return task;
}
