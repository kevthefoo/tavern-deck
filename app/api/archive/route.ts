import { checkLocalMutation } from "@/lib/local-request";
import { effectiveSettings, readState } from "@/lib/local-store";
import path from "node:path";
import { archivePowerLogs } from "@/lib/log-archive";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request) {
  try { checkLocalMutation(request); } catch { return Response.json({error:"Forbidden"},{status:403}); }
  const sourceRoot=effectiveSettings(await readState()).root;
  const archiveRoot=process.env.HEARTHSTONE_LOG_ARCHIVE || path.join(process.cwd(),"data","power-log-archive");
  if(!sourceRoot) return Response.json({archived:false,files:0,root:archiveRoot},{status:503});
  try {
    const files=await archivePowerLogs(sourceRoot,archiveRoot);
    return Response.json({archived:true,files,root:archiveRoot,updatedAt:new Date().toISOString()});
  } catch {
    return Response.json({archived:false,files:0,root:archiveRoot},{status:503});
  }
}
