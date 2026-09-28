import { decode } from "deckstrings";
import { createHash } from "node:crypto";
import type { Deck, Card, Rarity } from "./decks";
import type { CatalogCard } from "./card-catalog";
export function extractCode(input: string) {
  if (input.length > 20000) throw new Error("Deck text is too long.");
  const code = input.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith("#"));
  if (!code || !/^[A-Za-z0-9+/]+=*$/.test(code) || code.length > 4096) throw new Error("Paste a Hearthstone deck code or the full exported deck text.");
  return code;
}
export function importDeck(input: string, name: string, catalog: CatalogCard[]): Deck {
  const code = extractCode(input);
  let decoded;
  try { decoded = decode(code); } catch { throw new Error("Invalid deck code. Copy the deck from Hearthstone and try again."); }
  if (decoded.heroes.length !== 1 || decoded.cards.length === 0 || decoded.cards.length > 60) throw new Error("This deck format is not supported.");
  const hero = catalog.find(card => card.dbfId === decoded.heroes[0]);
  if (!hero?.cardClass) throw new Error("Hero not found in the card catalog.");
  const classes: Record<string,string> = {DEMONHUNTER:"Demon Hunter",DEATHKNIGHT:"Death Knight"};
  const className = classes[hero.cardClass] ?? hero.cardClass[0] + hero.cardClass.slice(1).toLowerCase();
  const byId = new Map(catalog.map(card => [card.dbfId, card]));
  const unique = new Set<number>();
  const cards: Card[] = decoded.cards.map(([id, copies]) => {
    const card = byId.get(id);
    if (!card || !Number.isInteger(copies) || copies < 1 || copies > 60 || unique.has(id)) throw new Error(`Unknown or invalid card: ${id}. Try again after updating the card catalog.`);
    unique.add(id);
    const type = ({MINION:"Minion",SPELL:"Spell",WEAPON:"Weapon",LOCATION:"Location",HERO:"Hero"} as const)[card.type as "MINION"] ?? "Spell";
    return {id, cardId: card.id, name: card.name, cost: card.cost ?? 0, copies, drawn: 0, type,
      rarity: (card.rarity ?? "COMMON").toLowerCase() as Rarity, legendary: card.rarity === "LEGENDARY"};
  });
  const total = cards.reduce((sum,card) => sum + card.copies,0);
  if (total > 60) throw new Error("Decks with more than 60 cards are not supported.");
  const formats: Record<number,string> = {1:"Wild",2:"Standard",3:"Classic",4:"Twist"};
  if (!formats[decoded.format]) throw new Error("Unknown deck format.");
  const title = name.trim() || input.match(/^###\s+(.+)$/m)?.[1]?.trim() || `${className} deck`;
  if (title.length > 80) throw new Error("Deck name must be 80 characters or fewer.");
  return { id: createHash("sha256").update(JSON.stringify(decoded)).digest("hex").slice(0,24), name: title, code, className, format: formats[decoded.format], cards,
    sideboardCount: decoded.sideboardCards.reduce((sum, entry) => sum + entry[1], 0) };
}
