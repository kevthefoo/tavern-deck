"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { aoeCards, classNames } from "@/lib/aoe";
import type { MatchContext } from "@/lib/match-context";

export default function AoeReminder({ match }: { match: MatchContext | null }) {
  const cards = aoeCards(match?.opponentClass ?? null, match?.format ?? "unknown");
  const [preview, setPreview] = useState<{ id: string; left: number; top: number } | null>(null);
  const card = cards.find(c => c.id === preview?.id);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest(".aoe-tile, .aoe-tooltip")) setPreview(null);
    }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setPreview(null); }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function show(id: string, target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect();
    const height = Math.min(440, window.innerHeight - 16);
    const fitsBelow = rect.bottom + height + 16 <= window.innerHeight;
    const left = fitsBelow ? rect.left : rect.right + 276 <= window.innerWidth ? rect.right + 8 : rect.left - 268;
    setPreview({ id, left: Math.max(8, Math.min(left, window.innerWidth - 268)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - height - 8)) });
  }

  return <section className="aoe-strip" aria-label="AOE alerts">
    <span className="aoe-label" title={match?.opponentClass ? `${classNames[match.opponentClass]} · ${match.format}` : "AOE alerts"}>AOE</span>
    {cards.length ? <div className="aoe-tiles" onScroll={() => setPreview(null)}>{cards.map(c => <button
      type="button" key={c.id} className="aoe-tile"
      aria-label={`${c.name}, ${c.cost} mana`} aria-describedby={card?.id === c.id ? "aoe-card-info" : undefined}
      onMouseEnter={e => show(c.id, e.currentTarget)} onMouseLeave={e => { if (!(e.relatedTarget instanceof Element) || !e.relatedTarget.closest(".aoe-tooltip")) setPreview(null); }}
      onFocus={e => show(c.id, e.currentTarget)} onBlur={() => setPreview(null)} onClick={e => show(c.id, e.currentTarget)}
    ><span className="aoe-tile-art" style={{ backgroundImage: `url(https://art.hearthstonejson.com/v1/tiles/${c.id}.jpg)` }} /><span className="aoe-tile-mana">{c.cost}</span></button>)}</div> : <span className="aoe-empty">{!match ? "Waiting for a match" : "Opponent / format unknown"}</span>}
    {card && preview && createPortal(<div id="aoe-card-info" className="aoe-tooltip" role="tooltip" onMouseLeave={() => setPreview(null)} style={{ left: preview.left, top: preview.top }}>
      {/* Text remains available if the upstream card render fails. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={card.id} src={`https://art.hearthstonejson.com/v1/render/latest/enUS/512x/${card.id}.png`} alt={`${card.name} card`} onError={e => { e.currentTarget.style.display = "none"; }} />
      <strong>{card.name} · {card.cost} mana</strong><small>{card.timing}</small><p>{card.text}</p><small>Possible clear · Not known in hand · Base mana cost</small>
    </div>, document.body)}
  </section>;
}
