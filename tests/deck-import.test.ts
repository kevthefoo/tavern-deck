import assert from "node:assert/strict";
import test from "node:test";
import { encode } from "deckstrings";
import { extractCode, importDeck } from "../lib/deck-import";
const catalog=[{id:"HERO_08",dbfId:637,name:"Jaina",cardClass:"MAGE",type:"HERO"},{id:"CS2_029",dbfId:315,name:"Fireball",cost:4,type:"SPELL",rarity:"COMMON"}];
const code=encode({heroes:[637],format:2,cards:[[315,2]]});
test("imports full clipboard text, class and metadata with a stable identity",()=>{
  const deck=importDeck(`### Burn\n# Class: Mage\n${code}\n# instructions`,"",catalog);
  assert.equal(deck.name,"Burn");assert.equal(deck.className,"Mage");assert.equal(deck.format,"Standard");
  assert.equal(deck.cards[0].cardId,"CS2_029");assert.equal(deck.cards[0].copies,2);assert.equal(deck.cards[0].drawn,0);
  assert.equal(importDeck(code,"Renamed",catalog).id,deck.id);
});
test("rejects malformed codes, missing cards and oversized quantities",()=>{
  assert.throws(()=>extractCode("not a code"));assert.throws(()=>importDeck("abc","",catalog));
  assert.throws(()=>importDeck(code,"",[]),/Hero/);
  assert.throws(()=>importDeck(code,"",[catalog[0]]),/Unknown/);
  assert.throws(()=>importDeck(encode({heroes:[637],format:2,cards:[[315,61]]}),"",catalog));
});
test("retains sideboards in the export code without counting them in main deck",()=>{
  const side=encode({heroes:[637],format:1,cards:[[315,2]],sideboardCards:[[315,1,315]]});
  const deck=importDeck(side,"Sideboard",catalog);
  assert.equal(deck.sideboardCount,1);assert.equal(deck.cards.length,1);assert.equal(deck.code,side);
});
