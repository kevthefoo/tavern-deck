export type CatalogCard = { id: string; dbfId: number; name: string; cost?: number; type?: string; rarity?: string; cardClass?: string };
let catalogPromise: Promise<CatalogCard[]> | null = null;
export function getCatalog() {
  catalogPromise ??= fetch("https://api.hearthstonejson.com/v1/latest/enUS/cards.json", {
    next: { revalidate: 86400 }, signal: AbortSignal.timeout(20000),
  }).then(async response => {
    if (!response.ok) throw new Error("Card catalog unavailable. Check your connection and try again.");
    return response.json() as Promise<CatalogCard[]>;
  }).catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
