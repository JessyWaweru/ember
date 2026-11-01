// Free food database search via Open Food Facts (no API key needed).
// Values are per 100 g; the add-food screen scales them by the grams you enter.

export type FoodResult = {
  id: string;
  name: string;
  brand: string | null;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  servingGrams: number | null;
};

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: 'code,product_name,brands,serving_quantity,nutriments',
  });
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
    signal,
    headers: { 'User-Agent': 'Ember/1.0 (personal calorie tracker)' },
  });
  if (!res.ok) throw new Error(`Food search failed (${res.status})`);
  const body: { products?: OffProduct[] } = await res.json();

  return (body.products ?? [])
    .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map((p) => ({
      id: p.code ?? p.product_name!,
      name: p.product_name!.trim(),
      brand: p.brands?.split(',')[0]?.trim() || null,
      per100g: {
        calories: num(p.nutriments!['energy-kcal_100g']),
        protein: num(p.nutriments!.proteins_100g),
        carbs: num(p.nutriments!.carbohydrates_100g),
        fat: num(p.nutriments!.fat_100g),
      },
      servingGrams: num(p.serving_quantity) || null,
    }));
}
