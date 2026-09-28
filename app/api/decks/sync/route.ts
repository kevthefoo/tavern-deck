import { checkLocalMutation } from "@/lib/local-request";
import { syncDeckFromLog } from "@/lib/deck-sync";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  try{checkLocalMutation(request);}catch{return Response.json({error:"Only local, same-origin JSON requests are allowed."},{status:403});}
  try{return Response.json(await syncDeckFromLog());}
  catch{return Response.json({error:"Could not load saved settings."},{status:500});}
}
