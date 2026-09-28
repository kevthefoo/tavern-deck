export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Card = {
  id: number;
  cardId: string;
  name: string;
  cost: number;
  type: "Minion" | "Spell" | "Weapon" | "Location" | "Hero";
  copies: number;
  drawn: number;
  rarity?: Rarity;
  legendary?: boolean;
};

export const initialCards: Card[] = [
  {
    id: 1,
    cardId: "CATA_554",
    name: "Earthen Roar",
    cost: 1,
    type: "Spell",
    copies: 1,
    drawn: 0,
  },
  {
    id: 3,
    cardId: "TIME_606",
    name: "Quel'dorei Fletcher",
    cost: 1,
    type: "Minion",
    copies: 2,
    drawn: 0,
  },
  {
    id: 4,
    cardId: "CATA_558",
    name: "Reinforcement Rallier",
    cost: 1,
    type: "Minion",
    copies: 2,
    drawn: 0,
  },
  {
    id: 5,
    cardId: "TLC_249",
    name: "Sizzling Cinder",
    cost: 1,
    type: "Minion",
    copies: 1,
    drawn: 0,
  },
  {
    id: 6,
    cardId: "JAIL_380",
    name: "Smuggled Shovel",
    cost: 1,
    type: "Weapon",
    copies: 2,
    drawn: 0,
  },
  {
    id: 7,
    cardId: "CORE_DS1_184",
    name: "Tracking",
    cost: 1,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
  {
    id: 8,
    cardId: "CORE_BAR_801",
    name: "Wound Prey",
    cost: 1,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
  {
    id: 9,
    cardId: "MEND_300",
    name: "Tame Pet",
    cost: 1,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
  {
    id: 10,
    cardId: "TIME_601",
    name: "Arrow Retriever",
    cost: 2,
    type: "Minion",
    copies: 2,
    drawn: 0,
  },
  {
    id: 11,
    cardId: "TIME_600",
    name: "Precise Shot",
    cost: 2,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
  {
    id: 13,
    cardId: "CATA_557",
    name: "Sylvanas's Triumph",
    cost: 2,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
  {
    id: 14,
    cardId: "JAIL_877",
    name: "Underbelly Network",
    cost: 2,
    type: "Location",
    copies: 2,
    drawn: 0,
  },
  {
    id: 15,
    cardId: "JAIL_881",
    name: "Arcane Tripwire",
    cost: 3,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
  {
    id: 16,
    cardId: "TLC_836",
    name: "Niri of the Crater",
    cost: 3,
    type: "Minion",
    copies: 1,
    drawn: 0,
    legendary: true,
  },
  {
    id: 18,
    cardId: "TIME_609",
    name: "Ranger General Sylvanas",
    cost: 3,
    type: "Minion",
    copies: 1,
    drawn: 0,
    legendary: true,
  },
  {
    id: 19,
    cardId: "TIME_609t1",
    name: "Ranger Captain Alleria",
    cost: 3,
    type: "Minion",
    copies: 1,
    drawn: 0,
    legendary: true,
  },
  {
    id: 20,
    cardId: "TIME_609t2",
    name: "Ranger Initiate Vereesa",
    cost: 3,
    type: "Minion",
    copies: 1,
    drawn: 0,
    legendary: true,
  },
  {
    id: 17,
    cardId: "JAIL_879",
    name: "Beast Tripwire",
    cost: 4,
    type: "Spell",
    copies: 2,
    drawn: 0,
  },
];

export type Deck = { id: string; name: string; code: string; className: string; format: string; sideboardCount?: number; cards: Card[] };
export const defaultDeck: Deck = {
  id: "draw-it", name: "Draw it", className: "Hunter", format: "Standard",
  code: "AAECAR8GzpsHmacHmqcHm6cHxbEHg8AHDKmfBK+SB5CnB5inB9SvB7TAB7nAB97EB6zYB9faB9PbB9fbBwAA",
  cards: initialCards,
};
