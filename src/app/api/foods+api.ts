// Branded food search, proxied through Ember's server: Open Food Facts doesn't allow direct browser requests
// (its new search has no CORS headers; the old one is often down), so the app asks here instead.
// Tries the fast search first, falls back to the old endpoint, drops entries whose numbers don't add up,
// and lets the CDN cache answers for a day.

type Hit = {
  code?: string;
  product_name?: string;
  brands?: string | string[];
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

const FIELDS = 'code,product_name,brands,serving_quantity,nutriments';
const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

async function getJson(url: string, ms: number) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: { 'User-Agent': 'Ember/1.0 (personal calorie tracker; https://bryanjessy-ember.expo.app)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function search(q: string): Promise<Hit[]> {
  try {
    const body = await getJson(`https://search.openfoodfacts.org/search?${new URLSearchParams({ q, page_size: '40', fields: FIELDS })}`, 4000);
    return body.hits ?? [];
  } catch {
    const params = new URLSearchParams({ search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '40', fields: FIELDS });
    const body = await getJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, 6000);
    return body.products ?? [];
  }
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < 2) return Response.json({ foods: [] });

  let hits: Hit[];
  try {
    hits = await search(q);
  } catch {
    return Response.json({ foods: [], error: 'Product search is unavailable right now.' }, { status: 502 });
  }

  const seen = new Set<string>();
  const foods = hits.flatMap((h) => {
    const n = h.nutriments ?? {};
    const name = h.product_name?.trim();
    const kcal = num(n['energy-kcal_100g']);
    if (!name || n['energy-kcal_100g'] == null || kcal > 900) return [];
    const protein = num(n.proteins_100g);
    const carbs = num(n.carbohydrates_100g);
    const fat = num(n.fat_100g);
    // Calories should roughly match the macros (4/4/9 kcal per gram); badly entered products don't.
    const fromMacros = protein * 4 + carbs * 4 + fat * 9;
    if (fromMacros > 0 && (kcal < fromMacros * 0.65 - 25 || kcal > fromMacros * 1.4 + 40)) return [];
    const brand = (Array.isArray(h.brands) ? h.brands[0] : h.brands?.split(',')[0])?.trim() || null;
    const key = `${name.toLowerCase()}|${brand?.toLowerCase()}|${Math.round(kcal)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      id: h.code ?? key,
      name,
      brand,
      per100g: { calories: kcal, protein, carbs, fat },
      servingGrams: num(h.serving_quantity) || null,
    }];
  });

  return Response.json(
    { foods: foods.slice(0, 25) },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
  );
}
