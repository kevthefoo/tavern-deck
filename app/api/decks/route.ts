import { getCatalog } from "@/lib/card-catalog";
import { extractCode, importDeck } from "@/lib/deck-import";
import { readState, updateState } from "@/lib/local-store";
import { checkLocalMutation } from "@/lib/local-request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const view = (state: Awaited<ReturnType<typeof readState>>) => ({decks:state.decks,activeId:state.activeId});
export async function GET() {
  try { return Response.json(view(await readState())); }
  catch { return Response.json({error:"Could not read saved decks."},{status:500}); }
}
export async function POST(request: Request) {
  try { checkLocalMutation(request); } catch { return Response.json({error:"Only local, same-origin JSON requests are allowed."},{status:403}); }
  try {
    const body = await request.text();
    if (body.length > 24000) throw new Error("Request is too large.");
    const data = JSON.parse(body);
    if (data.action === "import") {
      if (typeof data.text !== "string" || (data.name !== undefined && typeof data.name !== "string")) throw new Error("Enter a deck code and name.");
      extractCode(data.text);
      const deck = importDeck(data.text,data.name || "",await getCatalog());
      const state = await updateState(state => {
        const duplicate = state.decks.find(d => d.code === deck.code || d.id === deck.id);
        if (duplicate) { state.activeId=duplicate.id; return; }
        if (state.decks.length >= 100) throw new Error("Remove a deck before adding more (maximum 100).");
        state.decks.push(deck); state.activeId=deck.id;
      });
      return Response.json(view(state));
    }
    const state = await updateState(state => {
      const index = state.decks.findIndex(d => d.id === data.id);
      if (index < 0) throw new Error("Deck not found.");
      if (data.action === "select") state.activeId=data.id;
      else if (data.action === "rename") {
        if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 80) throw new Error("Enter a name between 1 and 80 characters.");
        state.decks[index].name=data.name.trim();
      } else if (data.action === "delete") {
        if (state.decks.length === 1) throw new Error("Keep at least one deck.");
        state.decks.splice(index,1);
        if (state.activeId === data.id) state.activeId=state.decks[0].id;
      } else throw new Error("Unknown action.");
    });
    return Response.json(view(state));
  } catch (error) { return Response.json({error:error instanceof Error ? error.message : "Unable to save deck."},{status:400}); }
}
