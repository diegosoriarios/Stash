/**
 * Open Food Facts barcode lookup. This is the ONLY network call in the app;
 * everything must gracefully fall back to manual entry when it fails.
 */

export interface OffProduct {
  name: string;
  category: string;
}

/** Ordered: first match wins (more specific categories first). */
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/dairies|milk|cheese|yogurt|yoghurt|cream|butter/, 'Dairy'],
  [/meats|seafood|fishes|poultry|beef|pork|chicken|salmon/, 'Meat & Fish'],
  [/frozen/, 'Frozen'],
  [/breads|bakeries|pastries|cakes|buns/, 'Bakery'],
  [/beverages|drinks|juices|sodas|waters|teas|coffees/, 'Beverages'],
  [/snacks|chips|crisps|candies|chocolates|confectioneries|biscuits/, 'Snacks'],
  [/fruits|vegetables|fresh-foods|produce/, 'Produce'],
  [/canned|cereals|pastas|rice|condiments|sauces|spices|oils|flours|sugars|legumes|nuts|seeds|meals|soups|spreads/, 'Pantry'],
];

function mapCategory(categoriesTags: unknown): string {
  if (!Array.isArray(categoriesTags)) return 'Other';
  const joined = categoriesTags.join(' ').toLowerCase();
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(joined)) return category;
  }
  return 'Other';
}

const TIMEOUT_MS = 8_000;

export async function lookupBarcode(barcode: string): Promise<OffProduct | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Stash/1.0 - offline food inventory app' },
      },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as {
      status?: number;
      product?: { product_name?: string; generic_name?: string; categories_tags?: unknown };
    };
    if (json.status !== 1 || !json.product) return null;
    const name = json.product.product_name || json.product.generic_name || '';
    if (!name.trim()) return null;
    return { name: name.trim(), category: mapCategory(json.product.categories_tags) };
  } catch {
    // Offline, timeout, malformed response — caller falls back to manual entry.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
