export const heroClasses:Record<string,string> = {"01":"Warrior","02":"Shaman","03":"Rogue","04":"Paladin","05":"Hunter","06":"Druid","07":"Warlock","08":"Mage","09":"Priest","10":"Demon Hunter","11":"Death Knight"};
export type IdentityOptions = {className?:string; playerName?:string; playerId?:number};
/** Prefer explicit identity. Class fallback must be unambiguous, including mirrors. */
export function identifyPlayer(input:string, options:IdentityOptions={}):number|undefined {
  if(options.playerId) return options.playerId;
  const names = new Map<number,string>();
  for(const m of input.matchAll(/GameState\.DebugPrintGame\(\) - PlayerID=(\d+), PlayerName=([^\r\n]+)/g)) names.set(Number(m[1]),m[2].trim());
  for(const m of input.matchAll(/DebugPrintEntitiesChosen\(\) - id=(\d+) Player=(.*?) EntitiesCount=/g)) {
    if(options.playerName && m[2].trim()===options.playerName) return Number(m[1]);
  }
  if(options.playerName) return [...names].find(([,name])=>name===options.playerName)?.[0];
  const remote=[...names].filter(([,name])=>name==="UNKNOWN HUMAN PLAYER");
  const local=[...names].filter(([,name])=>name!=="UNKNOWN HUMAN PLAYER");
  if(remote.length===1 && local.length===1) return local[0][0];
  const heroes=new Map<number,string>();
  for(const m of input.matchAll(/FULL_ENTITY[^\r\n]*cardId=HERO_(\d{2})[^\s\]]* player=(\d+)\]/g)) heroes.set(Number(m[2]),heroClasses[m[1]]);
  const matches=[...heroes].filter(([,cls])=>cls===options.className);
  return matches.length===1 ? matches[0][0] : undefined;
}
