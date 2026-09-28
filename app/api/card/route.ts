export const runtime = "nodejs";

import { getCatalog } from "@/lib/card-catalog";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ found: false }, { status: 400 });
  try {
    const catalog = await getCatalog();
    const card = catalog.find((item) => item.id === id);
    if (!card) return Response.json({ found: false, id }, { status: 404 });
    const baseCard = !card.rarity
      ? catalog.find((item) => item.id === id.replace(/t\d*$/, ""))
      : undefined;
    return Response.json({
      found: true,
      id: card.id,
      name: card.name ?? card.id,
      cost: card.cost ?? 0,
      type: card.type ?? "SPELL",
      rarity: card.rarity ?? baseCard?.rarity ?? "COMMON",
    });
  } catch {
    return Response.json({ found: false, id }, { status: 503 });
  }
}
