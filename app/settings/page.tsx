"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
type Settings={root:string;file:string;playerName:string};
export default function SettingsPage(){
  const [settings,setSettings]=useState<Settings|null>(null);
  const [error,setError]=useState("");const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    fetch("/api/settings").then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;})
      .then(data=>{if(active)setSettings(data);}).catch(()=>{if(active)setError("Could not load settings. Reload to retry.");});
    return ()=>{active=false;};
  },[]);
  function change(key:keyof Settings,value:string){setSettings(s=>s?{...s,[key]:value}:s);setSaved(false);}
  async function save(){setBusy(true);setError("");setSaved(false);try{const r=await fetch("/api/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});const data=await r.json();if(!r.ok)throw new Error(data.error);setSettings(data);setSaved(true);}catch(e){setError(e instanceof Error?e.message:"Unable to save settings.");}finally{setBusy(false);}}
  return <main className="manage-page settings-page">
    <nav className="manage-nav"><Link href="/"><ArrowLeft size={17}/> Tracker</Link><Link href="/decks">Your decks</Link></nav>
    <div className="manage-heading"><span className="eyebrow">TAVERN DECK</span><h1>Log settings</h1><p>Connect the game logs on this computer.</p></div>
    {error&&<div className="form-error" role="alert">{error}</div>}
    {saved&&<div className="form-success" role="status"><Check size={16}/> Saved. Settings apply immediately. <Link href="/">Open tracker →</Link></div>}
    {!settings?<div className="loading-block" role="status">Loading settings…</div>:<form className="settings-form" onSubmit={e=>{e.preventDefault();void save();}}>
      <label htmlFor="log-root">Logs folder</label><input id="log-root" value={settings.root} onChange={e=>change("root",e.target.value)} placeholder="C:/Program Files (x86)/Hearthstone/Logs"/>
      <p className="field-help">Use the folder containing your game sessions. It powers live tracking, class history, and local log backups.</p>
      <label htmlFor="log-file">Specific Power.log <span className="muted">optional</span></label><input id="log-file" value={settings.file} onChange={e=>change("file",e.target.value)} placeholder="Leave empty to follow the newest session"/>
      <p className="field-help">Overrides the folder for live tracking only. Clear it when you want to follow new sessions automatically.</p>
      <label htmlFor="player-name">Player name <span className="muted">optional</span></label><input id="player-name" value={settings.playerName} maxLength={128} onChange={e=>change("playerName",e.target.value)} placeholder="Exact name shown in your game log"/>
      <p className="field-help">Usually detected automatically. Set this if your player cannot be identified, especially in mirror matches.</p>
      <button className="primary-button" disabled={busy}>{busy?"Checking paths…":"Save & check paths"}</button>
    </form>}
    <details className="setup-help"><summary>How do I enable Hearthstone logs?</summary><p>Close Hearthstone. On Windows, create or update <code>%LOCALAPPDATA%\Blizzard\Hearthstone\log.config</code>:</p><pre>{`[Power]\nLogLevel=1\nFilePrinting=True\nConsolePrinting=False\nScreenPrinting=False\nVerbose=True`}</pre><p>Restart Hearthstone and enter a match. Find the generated Power.log and enter its Logs folder above. Paths must be accessible from the computer running this tracker.</p><p>Backups are stored locally in data/power-log-archive. Class history reads the source folder, not backups.</p></details>
  </main>;
}
