import { identifyPlayer, heroClasses, type IdentityOptions } from "./player-identity";
import { defaultDeck } from "./decks";
export type GameResult = {id:string; opponentClass:string; result:"win"|"loss"|"tie"};
export type WinRateRow = {opponentClass:string;games:number;wins:number;losses:number;ties:number;winRate:number|null};
/** Class history, not inferred exact-deck history: partial logs cannot establish a complete deck. */
export function parseGameResults(logs:Array<{source:string;contents:string}>, options:IdentityOptions={className:defaultDeck.className}):GameResult[] {
  const results:GameResult[]=[];
  for(const log of logs) {
    // Prefer the metadata boundary so the local player's identity accompanies the game.
    const taskStarts=[...log.contents.matchAll(/PowerTaskList\.DebugPrintPower\(\) -\s+CREATE_GAME/g)];
    const metaStarts=[...log.contents.matchAll(/GameState\.DebugPrintPower\(\) -\s+CREATE_GAME/g)];
    const starts=taskStarts.map((task,i)=>{
      const previous=taskStarts[i-1]?.index ?? -1;
      return metaStarts.findLast(meta=>meta.index!>previous && meta.index!<task.index!)?.index ?? task.index!;
    });
    for(let i=0;i<starts.length;i++) {
      const input=log.contents.slice(starts[i],starts[i+1]);
      const player=identifyPlayer(input,options);
      if(!player) continue;
      const heroes=new Map<number,string>();
      for(const m of input.matchAll(/FULL_ENTITY[^\r\n]*cardId=HERO_(\d{2})[^\s\]]* player=(\d+)\]/g)) heroes.set(Number(m[2]),heroClasses[m[1]]);
      if(options.className && heroes.get(player)!==options.className) continue;
      const names=new Map<number,string>();
      for(const m of input.matchAll(/GameState\.DebugPrintGame\(\) - PlayerID=(\d+), PlayerName=([^\r\n]+)/g)) names.set(Number(m[1]),m[2].trim());
      for(const m of input.matchAll(/DebugPrintEntitiesChosen\(\) - id=(\d+) Player=(.*?) EntitiesCount=/g)) names.set(Number(m[1]),m[2].trim());
      const name=names.get(player);
      if(!name) continue;
      const outcomes=[...input.matchAll(/PowerTaskList\.DebugPrintPower\(\)[^\r\n]*TAG_CHANGE Entity=(.*?) tag=PLAYSTATE value=(WON|LOST|TIED)/g)];
      const outcome=outcomes.find(m=>m[1].trim()===name);
      if(!outcome) continue;
      const opponent=[...heroes].find(([id])=>id!==player)?.[1] ?? "Unknown";
      results.push({id:`${log.source}:${i}`,opponentClass:opponent,result:outcome[2]==="WON"?"win":outcome[2]==="LOST"?"loss":"tie"});
    }
  }
  return results;
}
export function summarizeResults(results:GameResult[]) {
  const summarize=(opponentClass:string,rows:GameResult[]):WinRateRow=>{
    const wins=rows.filter(row=>row.result==="win").length;
    const losses=rows.filter(row=>row.result==="loss").length;
    const ties=rows.filter(row=>row.result==="tie").length;
    return {opponentClass,games:rows.length,wins,losses,ties,winRate:wins+losses?Math.round(wins/(wins+losses)*100):null};
  };
  const classes=[...new Set(results.map(row=>row.opponentClass))].sort();
  return {overall:summarize("All",results),byClass:classes.map(name=>summarize(name,results.filter(row=>row.opponentClass===name)))};
}
