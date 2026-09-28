import catalogue from "./aoe-catalog.json";
export const classNames: Record<string, string> = { DEATHKNIGHT: "Death Knight", DEMONHUNTER: "Demon Hunter", DRUID: "Druid", HUNTER: "Hunter", MAGE: "Mage", PALADIN: "Paladin", PRIEST: "Priest", ROGUE: "Rogue", SHAMAN: "Shaman", WARLOCK: "Warlock", WARRIOR: "Warrior" };
export const verifiedAt = catalogue.verifiedAt;
const excluded = new Set(["Spreading Plague", "Sickly Grimewalker"]);
const overrides: Record<string, string> = {
  CATA_489: "Shatter. Deal 4 damage. Deal 2 damage to all enemies.",
  FIR_916: "Deal damage to all enemy minions. Upgrades each turn while held, but is discarded when its timer expires. Damage depends on turns held.",
  SCH_703: "Battlecry: Summon a 3/3 Soul with Rush for each Soul Fragment in your deck. Requires Soul Fragments and board space.",
};
export function aoeCards(opponentClass: string | null, format: string) {
  if (!opponentClass || !classNames[opponentClass] || !["standard", "wild"].includes(format)) return [];
  const cards = catalogue.cards.filter(c => !excluded.has(c.name) && c.set !== "CORE_HIDDEN" && (c.classes.includes(opponentClass) || c.classes.includes("NEUTRAL")) && (format === "wild" || catalogue.standardSets.includes(c.set)));
  const unique = new Map<string, typeof cards[number]>();
  for (const card of cards) if (!unique.has(card.name) || card.set === "CORE") unique.set(card.name, card);
  return [...unique.values()].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)).map(c => ({ ...c, text: overrides[c.id] ?? c.textEn.replace(/\{\d+\}/g, ""), timing: /Deathrattle/.test(c.textEn) ? "Deathrattle" : /Secret:/.test(c.textEn) ? "Secret trigger" : /end of|start of/i.test(c.textEn) ? "Delayed / turn trigger" : "Effect & conditions" }));
}
