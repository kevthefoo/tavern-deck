import { access, stat } from "node:fs/promises";
import path from "node:path";
import { effectiveSettings, readState, updateState } from "@/lib/local-store";
import { checkLocalMutation } from "@/lib/local-request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(effectiveSettings(await readState())); }
  catch { return Response.json({error:"Could not read settings."},{status:500}); }
}
export async function POST(request:Request) {
  try { checkLocalMutation(request); } catch { return Response.json({error:"Only local, same-origin JSON requests are allowed."},{status:403}); }
  try {
    const text=await request.text();
    if(text.length>12000) throw new Error("Settings are too long.");
    const body=JSON.parse(text);
    for(const key of ["root","file","playerName"]) if(typeof body[key]!=="string") throw new Error("Invalid settings.");
    const settings={root:body.root.trim(),file:body.file.trim(),playerName:body.playerName.trim()};
    if(settings.playerName.length>128) throw new Error("Player name is too long.");
    for(const [key,value] of [["root",settings.root],["file",settings.file]]) {
      if(!value) continue;
      if(!path.isAbsolute(value)) throw new Error("Use an absolute path readable by this computer.");
      try {
        await access(value);
        const info=await stat(value);
        if(key==="root" ? !info.isDirectory() : !info.isFile()) throw new Error();
      } catch { throw new Error(key==="root" ? "Log folder does not exist or is not readable." : "Log file does not exist or is not readable."); }
      if(key==="file" && path.basename(value).toLowerCase()!=="power.log") throw new Error("Select a file named Power.log.");
    }
    await updateState(state => {state.settings=settings;});
    return Response.json({...settings,saved:true});
  } catch(error) {return Response.json({error:error instanceof Error ? error.message : "Unable to save settings."},{status:400});}
}
