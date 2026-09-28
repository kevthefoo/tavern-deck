"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import type { Deck } from "@/lib/decks";
type Library = {decks:Deck[];activeId:string};
export default function DecksPage() {
  const [library,setLibrary]=useState<Library|null>(null);
  const [text,setText]=useState("");
  const [name,setName]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [renamed,setRenamed]=useState("");
  const [deleting,setDeleting]=useState<string|null>(null);
  async function load() {
    setError("");
    try {const r=await fetch("/api/decks");const data=await r.json();if(!r.ok)throw new Error(data.error);setLibrary(data);}
    catch(e){setError(e instanceof Error?e.message:"Unable to load decks.");}
  }
  useEffect(()=>{
    let active=true;
    fetch("/api/decks").then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;})
      .then(data=>{if(active)setLibrary(data);}).catch(e=>{if(active)setError(e.message || "Unable to load decks.");});
    return ()=>{active=false;};
  },[]);
  async function mutate(data:Record<string,string>,success:string) {
    setBusy(true);setError("");setMessage("");
    try {
      const r=await fetch("/api/decks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result=await r.json();if(!r.ok)throw new Error(result.error);
      setLibrary(result);setMessage(success);setDeleting(null);setEditing(null);
      if(data.action==="import"){setText("");setName("");}
    } catch(e){setError(e instanceof Error?e.message:"Could not save your deck.");}
    finally{setBusy(false);}
  }
  return <main className="manage-page">
    <nav className="manage-nav"><Link href="/"><ArrowLeft size={17}/> Tracker</Link><Link href="/settings">Log settings</Link></nav>
    <div className="manage-heading"><span className="eyebrow">TAVERN DECK</span><h1>Your decks</h1><p>Import a deck, choose it, and start tracking.</p></div>
    {error && <div className="form-error" role="alert">{error}{!library && <button onClick={load}>Retry</button>}</div>}
    {message && <div className="form-success" role="status"><Check size={16}/>{message} <Link href="/">Open tracker →</Link></div>}
    <div className="manage-columns">
      <section className="deck-library" aria-label="Saved decks">
        <h2>Saved decks <small>{library?.decks.length ?? "…"}</small></h2>
        {!library && <div className="loading-block" role="status">Loading decks…</div>}
        {library?.decks.map(deck=><article key={deck.id} className={`saved-deck ${deck.id===library.activeId?"selected":""}`}>
          <div className="saved-art" style={{backgroundImage:`url(https://art.hearthstonejson.com/v1/tiles/${deck.cards[0].cardId}.jpg)`}}/>
          <div className="saved-body">
            <span className="eyebrow">{deck.className} · {deck.format} · {deck.cards.reduce((s,c)=>s+c.copies,0)} cards</span>
            {editing===deck.id ? <form onSubmit={e=>{e.preventDefault();void mutate({action:"rename",id:deck.id,name:renamed},"Deck renamed.");}} className="rename-form">
              <label className="sr-only" htmlFor="rename">Deck name</label><input id="rename" value={renamed} maxLength={80} onChange={e=>setRenamed(e.target.value)} autoFocus required/>
              <button disabled={busy}>Save</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button>
            </form> : <h3>{deck.name}</h3>}
            {!!deck.sideboardCount && <p className="muted">{deck.sideboardCount} sideboard cards retained in the code; main deck tracked.</p>}
            <div className="deck-actions">
              <button className="select-deck" disabled={busy || deck.id===library.activeId} onClick={()=>mutate({action:"select",id:deck.id},`${deck.name} selected.`)}>{deck.id===library.activeId?<><Check size={15}/> Selected</>:"Use deck"}</button>
              <button aria-label={`Rename ${deck.name}`} title="Rename" disabled={busy} onClick={()=>{setEditing(deck.id);setRenamed(deck.name);}}><Pencil size={16}/></button>
              <button aria-label={`Copy ${deck.name} code`} title="Copy deck code" onClick={async()=>{try{await navigator.clipboard.writeText(deck.code);setMessage("Deck code copied.");}catch{setError("Clipboard unavailable. Your code is shown below.");setText(deck.code);}}}><Copy size={16}/></button>
              <button aria-label={`Delete ${deck.name}`} title="Delete" disabled={busy || library.decks.length===1} onClick={()=>setDeleting(deck.id)}><Trash2 size={16}/></button>
            </div>
            {deleting===deck.id && <div className="delete-confirm"><span>Delete {deck.name}?</span><button className="danger" disabled={busy} onClick={()=>mutate({action:"delete",id:deck.id},"Deck deleted.")}>Delete deck</button><button onClick={()=>setDeleting(null)}>Cancel</button></div>}
          </div>
        </article>)}
      </section>
      <section className="import-panel" aria-labelledby="import-title"><h2 id="import-title"><Plus size={19}/> Import a deck</h2>
        <form onSubmit={e=>{e.preventDefault();void mutate({action:"import",text,name},"Deck ready. It is now selected.");}}>
          <label htmlFor="deck-name">Name <span className="muted">optional</span></label><input id="deck-name" value={name} maxLength={80} onChange={e=>setName(e.target.value)} placeholder="My deck"/>
          <label htmlFor="deck-code">Deck code</label><textarea id="deck-code" rows={7} value={text} onChange={e=>setText(e.target.value)} maxLength={20000} placeholder="Paste the deck code or the full text copied from Hearthstone" required/>
          <p className="field-help">An internet connection is needed to look up cards. Saved decks stay on this computer.</p>
          <button className="primary-button" disabled={busy || !text.trim()}>{busy?"Saving…":"Import & select"}</button>
        </form>
      </section>
    </div>
  </main>;
}
