"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, Radio, Sparkles } from "lucide-react";
import { defaultDeck, type Deck, type Card, type Rarity } from "@/lib/decks";
import Link from "next/link";
type WinRateRow = {
  opponentClass: string;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
};
type WinStats = {
  overall: WinRateRow;
  byClass: WinRateRow[];
  recent10: {
    overall: WinRateRow;
    byClass: WinRateRow[];
  };
  updatedAt: string;
};
type StatsRange = "all" | "recent10";
const rarityByCardId: Record<string, Rarity> = {
  CATA_554: "rare",
  TIME_606: "rare",
  JAIL_380: "rare",
  CORE_DS1_184: "rare",
  JAIL_879: "rare",
  JAIL_879t: "rare",
  TIME_600: "epic",
  TLC_836: "legendary",
  JAIL_881: "epic",
  JAIL_881t: "epic",
  TIME_609: "legendary",
  TIME_609t1: "legendary",
  TIME_609t2: "legendary",
};
const classIconUrl = (name: string) =>
  `https://hearthstone.wiki.gg/images/${name.replaceAll(" ", "_")}_icon.png`;

export function DeckTracker() {
  const [deck, setDeck] = useState<Deck>(defaultDeck);
  const [ready, setReady] = useState(false);
  const [autoStatus,setAutoStatus]=useState("Detecting your Hearthstone deck…");
  const initialCards = deck.cards;
  const deckClass = deck.className;
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [winStats, setWinStats] = useState<WinStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [statsRange, setStatsRange] = useState<StatsRange>("all");
  const [cards, setCards] = useState(initialCards),
    [deckCount, setDeckCount] = useState<number | null>(null),
    [toast, setToast] = useState("");
  const [tracker, setTracker] = useState<
      "connecting" | "connected" | "stale" | "missing" | "idle"
    >("connecting"),
    [logPath, setLogPath] = useState("");
  const activeDeckId=useRef(defaultDeck.id);
  const cursor = useRef(0),
    source = useRef(""),
    gameId = useRef<string | null>(null),
    seen = useRef(new Set<string>());
  useEffect(() => {
    let active=true;
    let timer:number|undefined;
    let currentId="";
    async function refreshDeck(){
      try{
        const response=await fetch("/api/decks/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});
        const data=await response.json();
        if(!response.ok || !data.deck)throw new Error();
        if(!active)return;
        setAutoStatus(data.message);
        if(data.deck.id!==currentId){
          currentId=data.deck.id;activeDeckId.current=data.deck.id;
          gameId.current=null;seen.current.clear();source.current="";cursor.current=0;
          setDeck(data.deck);setCards(data.deck.cards);setDeckCount(null);setWinStats(null);setPreviewCard(null);
        }else setDeck(previous=>previous.name===data.deck.name?previous:{...previous,name:data.deck.name});
        setReady(true);
      }catch{if(active)setAutoStatus("Could not check for decks. Retrying…");}
      if(active)timer=window.setTimeout(refreshDeck,2000);
    }
    // Show saved cards immediately, even if the catalog is slow or offline.
    fetch("/api/decks").then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
      if(!active)return;
      const selected=data.decks.find((d:Deck)=>d.id===data.activeId);
      currentId=selected.id;activeDeckId.current=selected.id;setDeck(selected);setCards(selected.cards);setReady(true);
    }).catch(()=>{if(active)setToast("Could not load saved decks. Reload to retry.");}).finally(()=>{if(active)void refreshDeck();});
    return ()=>{active=false;if(timer!==undefined)window.clearTimeout(timer);};
  }, []);
  const total = cards.reduce((s, c) => s + c.copies, 0),
    trackedRemaining = cards.reduce((s, c) => s + c.copies - c.drawn, 0),
    remaining = deckCount ?? trackedRemaining,
    drawn = Math.max(0, total - remaining);
  const filtered = useMemo(
    () =>
      [...cards].sort((a, b) => {
        const aUsed = a.copies - a.drawn === 0 ? 1 : 0,
          bUsed = b.copies - b.drawn === 0 ? 1 : 0;
        return aUsed - bUsed || a.cost - b.cost || a.name.localeCompare(b.name);
      }),
    [cards],
  );
  const visibleStats = winStats
    ? statsRange === "recent10"
      ? winStats.recent10
      : winStats
    : null;
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    async function archive() {
      try { await fetch("/api/archive", { method:"POST", headers:{"Content-Type":"application/json"}, body:"{}", cache: "no-store" }); } catch {}
      if (active) timer = window.setTimeout(archive, 5000);
    }
    archive();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    const expectedDeck=deck.id;
    function resetDeck() {
      gameId.current=null;
      seen.current.clear();
      setCards(initialCards);
      setDeckCount(null);
      setToast("");
    }
    async function poll() {
      try {
        const response = await fetch(
            `/api/tracker?deck=${encodeURIComponent(deck.id)}&cursor=${cursor.current}&source=${encodeURIComponent(source.current)}`,
            { cache: "no-store" },
          ),
          data = await response.json();
        if (!active || activeDeckId.current!==expectedDeck) return;
        if (!data.connected) {
          setTracker("missing");
          resetDeck();
          return;
        }
        if(data.status==="idle" || data.status==="stale") {
          setTracker(data.status);
          setLogPath(data.path);
          resetDeck();
          return;
        }
        if (data.deckMismatch || data.identityResolved === false) {
          resetDeck();
          setTracker("connected");
          setToast(data.deckMismatch ? `Choose a ${data.localClass} deck to match this game.` : "Player unknown. Set your exact player name in Log settings.");
          return;
        }
        setTracker("connected");
        setLogPath(data.path);
        if (source.current && source.current !== data.source)
          seen.current.clear();
        source.current = data.source;
        cursor.current = data.cursor;
        if (data.gameId !== gameId.current) {
          gameId.current = data.gameId;
          seen.current.clear();
          setCards(initialCards.map((c) => ({ ...c, drawn: 0 })));
        }
        setDeckCount(typeof data.deckCount === "number" ? data.deckCount : null);
        for (const rawEvent of data.events as Array<{
          key: string;
          kind: "draw" | "return" | "game-start";
          name?: string;
          cardId?: string;
        }>) {
          if (seen.current.has(rawEvent.key)) continue;
          seen.current.add(rawEvent.key);
          if (rawEvent.kind === "game-start") {
            setCards(initialCards.map((c) => ({ ...c, drawn: 0 })));
            continue;
          }
          if (!rawEvent.cardId && !rawEvent.name) continue;
          let event: {
            key: string;
            kind: "draw" | "return";
            name?: string;
            cardId?: string;
            cost: number;
            type: Card["type"];
            rarity?: Rarity;
          } = {
            ...rawEvent,
            kind: rawEvent.kind as "draw" | "return",
            cost: 0,
            type: "Spell",
          };
          if (event.kind === "return" && event.cardId && !event.name) {
            try {
              const metadata = await fetch(
                `/api/card?id=${encodeURIComponent(event.cardId)}`,
              ).then((result) => result.json());
              if (metadata.found)
                event = {
                  ...event,
                  name: metadata.name,
                  cost: metadata.cost,
                  type:
                    metadata.type === "MINION"
                      ? "Minion"
                      : metadata.type === "WEAPON"
                        ? "Weapon"
                        : metadata.type === "LOCATION"
                          ? "Location"
                          : "Spell",
                  rarity: String(
                    metadata.rarity ?? "COMMON",
                  ).toLowerCase() as Rarity,
                };
            } catch {}
          }
          if(!active || activeDeckId.current!==expectedDeck) return;
          setCards((list) => {
            const index = list.findIndex(
              (card) =>
                card.cardId === event.cardId ||
                (event.name && card.name === event.name),
            );
            if (index < 0) {
              if (event.kind === "draw") return list;
              return [
                ...list,
                {
                  id: Date.now(),
                  cardId: event.cardId || event.name!,
                  name: event.name || event.cardId!,
                  cost: event.cost,
                  type: event.type,
                  copies: 1,
                  drawn: 0,
                  rarity: event.rarity,
                },
              ];
            }
            return list.map((card, i) => {
              if (i !== index) return card;
              if (event.kind === "draw")
                return {
                  ...card,
                  drawn: Math.min(card.copies, card.drawn + 1),
                };
              return card.drawn > 0
                ? { ...card, drawn: card.drawn - 1 }
                : { ...card, copies: card.copies + 1 };
            });
          });
          setToast(
            event.kind === "draw"
              ? `Removed from deck: ${event.name || event.cardId}`
              : `Added to deck: ${event.name || event.cardId}`,
          );
          window.setTimeout(() => setToast(""), 1800);
        }
      } catch {
        if (active && activeDeckId.current===expectedDeck) { setTracker("missing"); resetDeck(); }
      }
    }
    // Never overlap polls. Large Power.log responses used to arrive out of order
    // and let an older match overwrite the newly-reset deck state.
    let timer:number|undefined;
    async function loop() {
      await poll();
      if(active) timer=window.setTimeout(loop,800);
    }
    loop();
    return () => {
      active = false;
      if(timer!==undefined) window.clearTimeout(timer);
    };
  }, [ready, deck.id, initialCards]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let timer: number | undefined;
    let newestUpdate = "";
    async function refresh() {
      try {
        const data = await fetch(`/api/stats?deck=${encodeURIComponent(deck.id)}`, { cache: "no-store" }).then(
          (response) => { if (!response.ok) throw new Error(); return response.json(); },
        );
        if (active && activeDeckId.current===deck.id && (!newestUpdate || data.updatedAt >= newestUpdate)) {
          newestUpdate = data.updatedAt;
          setWinStats(data);
          setStatsError(false);
        }
      } catch { if (active) setStatsError(true); }
      if (active) timer = window.setTimeout(refresh, 5000);
    }
    refresh();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [ready, deck.id]);
  if (!ready) return <main className="manage-page"><div className="loading-block" role="status">Loading saved deck…</div>{toast && <p role="alert">{toast} <Link href="/decks">Your decks</Link></p>}</main>;
  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>Tavern Deck</strong>
            <span>DECK TRACKER</span>
          </div>
        </div>
        <div className={`match-status ${tracker}`} title={logPath}>
          <i />{" "}
          {tracker === "connected"
            ? "Log connected"
            : tracker === "idle"
              ? "Waiting for next game"
            : tracker === "stale"
              ? "No recent game activity"
              : tracker === "connecting"
                ? "Connecting"
                : "Waiting for game log"}
        </div>
        <Link href="/settings" className="settings-link" aria-label="Log settings" title="Log settings"><Radio size={19} /></Link>
      </header>
      <section className="deck-hero">
        <div
          className="class-sigil"
          role="img"
          aria-label={`${deckClass} class`}
          style={{ backgroundImage: `url(${classIconUrl(deckClass)})` }}
        />
        <div className="deck-title">
          <span>{deckClass.toUpperCase()} · {deck.format.toUpperCase()}</span>
          <h1>{ready ? deck.name : "Loading deck…"}</h1>
          <Link href="/settings" className="auto-deck-status" title={autoStatus}>{autoStatus}</Link>
        </div>
        <Link href="/decks" className="deck-switch">
          Switch deck <ChevronDown size={16} />
        </Link>
      </section>
      <section className="stats compact-stats" aria-label="Deck status">
        <div className="stat primary">
          <span className="stat-label">CARDS LEFT</span>
          <strong>
            {remaining}
            <small> / {total}</small>
          </strong>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (remaining / Math.max(1, total)) * 100)}%` }} />
          </div>
        </div>
        <div className="stat">
          <span className="stat-label">DRAWN</span>
          <strong>
            {drawn}
            <small> cards</small>
          </strong>
        </div>
        <div className="performance">
          <div className="performance-head">
            <span>{deckClass.toUpperCase()} HISTORY</span>
            <div className="performance-controls">
              <small>{visibleStats?.overall.games ?? 0} completed games</small>
              <div className="stats-switcher" role="group" aria-label="Win rate range">
                <button
                  type="button"
                  className={statsRange === "all" ? "active" : ""}
                  aria-pressed={statsRange === "all"}
                  onClick={() => setStatsRange("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={statsRange === "recent10" ? "active" : ""}
                  aria-pressed={statsRange === "recent10"}
                  onClick={() => setStatsRange("recent10")}
                >
                  Last 10
                </button>
              </div>
            </div>
          </div>
          {!visibleStats ? <div className="loading-block" role="status">{statsError ? "History unavailable. Retrying…" : "Loading history…"}</div> : visibleStats.overall.games > 0 ? (
            <>
              <div className="overall-win">
                <strong>{visibleStats.overall.winRate}%</strong>
                <span>
                  {statsRange === "recent10" ? "Last 10" : "Overall"}
                  <small>
                    {visibleStats.overall.wins} W · {visibleStats.overall.losses} L
                    {visibleStats.overall.ties
                      ? ` · ${visibleStats.overall.ties} T`
                      : ""}
                  </small>
                </span>
              </div>
              <div className="matchups">
                {visibleStats.byClass.map((row) => (
                  <div className="matchup" key={row.opponentClass}>
                    <i
                      className="class-icon"
                      aria-label={`${row.opponentClass} class`}
                      style={{
                        backgroundImage: `url(${classIconUrl(row.opponentClass)})`,
                      }}
                    />
                    <span>
                      {row.opponentClass}
                      <small>
                        {row.wins}–{row.losses}
                        {row.ties ? `–${row.ties}` : ""}
                      </small>
                    </span>
                    <strong>
                      {row.winRate === null ? "—" : `${row.winRate}%`}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-games">
              Complete a game to start tracking win rate.
            </div>
          )}
        </div>
      </section>
      <section className="list-head">
        <span>CARD</span>
        <span>REMAINING</span>
      </section>
      <section className="card-list">
        {filtered.map((card) => {
          const left = card.copies - card.drawn;
          return (
            <div
              className={`card-row ${left === 0 ? "used" : ""}`}
              key={card.cardId}
              onMouseEnter={() => setPreviewCard(card)}
              onMouseLeave={() => setPreviewCard(null)}
              onClick={() =>
                setPreviewCard(
                  previewCard?.cardId === card.cardId ? null : card,
                )
              }
            >
              <span
                className={`mana rarity-${card.rarity ?? rarityByCardId[card.cardId] ?? "common"}`}
              >
                {card.cost}
              </span>
              <span
                className="art card-thumbnail"
                style={{
                  backgroundImage: `url(https://art.hearthstonejson.com/v1/tiles/${card.cardId}.jpg)`,
                }}
              >
                <span>
                  {card.legendary ? "✦" : card.type === "Spell" ? "◈" : "♜"}
                </span>
              </span>
              <span className="card-name">
                {card.name}
                <small>{card.type}</small>
              </span>
              {card.legendary && <span className="legendary">LEGENDARY</span>}
              <span className="copies">
                {left}
                <small> / {card.copies}</small>
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty">
            <BookOpen size={32} />
            <strong>No cards found</strong>
            <span>Try another filter</span>
          </div>
        )}
      </section>
      <footer>
        <span>
          {tracker === "connected"
            ? "Draws sync automatically from the game log"
            : "Start Hearthstone or configure HEARTHSTONE_POWER_LOG"}
        </span>
        <span>Syncing every 0.8 seconds</span>
      </footer>
      {previewCard && (
        <div
          className="card-preview"
          role="img"
          aria-label={`${previewCard.name} full card`}
          style={{
            backgroundImage: `url(https://art.hearthstonejson.com/v1/render/latest/enUS/512x/${previewCard.cardId}.png)`,
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </main>
  );
}
