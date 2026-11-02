import { BASIC_FOODS } from '@/lib/basic-foods';

// Photo → meal estimate. The image goes to Gemini (vision) on the server so the API key never reaches the app.
// Gemini identifies each item and its portion in grams; nutrition comes from Ember's USDA-based foods wherever an
// item matches one, since models judge portions far better than they recall nutrition tables.
// Key: GEMINI_API_KEY, an EAS environment variable (sensitive) deployed with `eas deploy --environment production`.

const MODEL = 'gemini-3.8-flash';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAX_IMAGE_B64 = 8_000_000; // ~6 MB of JPEG; the app sends ~0.3 MB

const BY_NAME = new Map(BASIC_FOODS.map((f) => [f.name.toLowerCase(), f]));

const INSTRUCTIONS = `You estimate the calories in a meal from one photo, as accurately as a careful dietitian would.

How to work:
- List every distinct food and drink separately: each main, side, sauce, dressing, topping and drink.
- Estimate each item's edible weight in grams as served (cooked weight for cooked food).
- Judge size from references in the photo: dinner plate ≈ 26 cm across, side plate ≈ 20 cm, bowl ≈ 15 cm,
  fork ≈ 19 cm, tablespoon ≈ 17 cm, adult palm ≈ 9 cm wide, mug ≈ 250 ml, can 330 ml. Use the height of piles,
  not only the area they cover.
- Count discrete pieces (eggs, chapatis, slices, nuggets, biscuits) and weigh them all.
- Include hidden calories: oil absorbed by fried or glossy sautéed food (add it as its own "Vegetable / cooking oil"
  item in grams), butter, ghee, mayonnaise, dressings, cream, sugar in drinks.
- If an item is one of the reference foods below, set matched_food to that exact name. Otherwise leave
  matched_food empty and give realistic per-100 g values for the item as prepared.
- Be accurate, not cautious: don't shade portions up or down.
- The user's note, if given, overrides what you see (for example "no sugar", "half eaten", "shared by two").
- If the photo shows no food or drink, set not_food to true and return no items.

Reference foods: ${BASIC_FOODS.map((f) => f.name).join('; ')}.`;

const SCHEMA = {
  type: 'object',
  properties: {
    not_food: { type: 'boolean' },
    meal_name: { type: 'string', description: 'Short name for the whole meal, e.g. "Chicken, rice & salad"' },
    notes: { type: 'string', description: 'One short sentence on anything uncertain' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          matched_food: { type: 'string', description: 'Exact reference food name, or empty' },
          grams: { type: 'number' },
          kcal_per_100g: { type: 'number' },
          protein_per_100g: { type: 'number' },
          carbs_per_100g: { type: 'number' },
          fat_per_100g: { type: 'number' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['name', 'matched_food', 'grams', 'kcal_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'confidence'],
      },
    },
  },
  required: ['not_food', 'meal_name', 'notes', 'items'],
};

type ModelItem = {
  name: string;
  matched_food: string;
  grams: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  confidence: 'high' | 'medium' | 'low';
};
type ModelOutput = { not_food: boolean; meal_name: string; notes: string; items: ModelItem[] };

/** The JSON text from an Interactions response, wherever this API version puts it. */
function outputText(body: Record<string, unknown>): string | null {
  if (typeof body.output_text === 'string') return body.output_text;
  for (const key of ['steps', 'outputs']) {
    const list = body[key];
    if (!Array.isArray(list)) continue;
    for (const step of [...list].reverse()) {
      if (typeof step?.text === 'string') return step.text;
      const content = Array.isArray(step?.content) ? step.content : [];
      const text = content.find((c: { type?: string; text?: unknown }) => typeof c?.text === 'string');
      if (text) return text.text;
    }
  }
  return null;
}

const fail = (status: number, error: string) => Response.json({ error }, { status });
const clamp = (n: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(n) || 0));

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail(503, 'Photo logging isn’t set up yet: the AI key is missing on the server.');

  const { image, hint } = (await request.json().catch(() => ({}))) as { image?: string; hint?: string };
  if (!image || typeof image !== 'string') return fail(400, 'No photo received.');
  if (image.length > MAX_IMAGE_B64) return fail(413, 'That photo is too large.');

  const note = typeof hint === 'string' && hint.trim() ? `User's note: ${hint.trim().slice(0, 300)}` : 'No note from the user.';
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model: MODEL,
        system_instruction: INSTRUCTIONS,
        input: [
          { type: 'text', text: `Estimate this meal. ${note}` },
          { type: 'image', data: image, mime_type: 'image/jpeg' },
        ],
        response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
      }),
    });
  } catch {
    return fail(504, 'The AI took too long to answer. Try again.');
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 429) return fail(429, 'Today’s free AI limit is used up. Try again later, or log it by search.');
    const detail = (body.error as { message?: string } | undefined)?.message;
    console.error('Gemini error', res.status, detail);
    return fail(502, 'The AI couldn’t read that photo. Try again.');
  }

  let out: ModelOutput;
  try {
    out = JSON.parse(outputText(body) ?? '');
  } catch {
    console.error('Gemini unparsable output', JSON.stringify(body).slice(0, 500));
    return fail(502, 'The AI’s answer came back garbled. Try again.');
  }
  if (out.not_food || !out.items?.length) return fail(422, 'No food spotted in that photo.');

  const items = out.items.map((it) => {
    const basic = BY_NAME.get(it.matched_food?.toLowerCase() ?? '');
    return {
      name: it.name,
      grams: Math.round(clamp(it.grams, 1, 3000)),
      confidence: it.confidence,
      // USDA values when the item matched a built-in food; the model's estimate otherwise.
      source: basic ? ('usda' as const) : ('ai' as const),
      per100g: basic
        ? basic.per100g
        : {
            calories: clamp(it.kcal_per_100g, 0, 900),
            protein: clamp(it.protein_per_100g, 0, 100),
            carbs: clamp(it.carbs_per_100g, 0, 100),
            fat: clamp(it.fat_per_100g, 0, 100),
          },
    };
  });

  return Response.json({ mealName: out.meal_name, notes: out.notes, items });
}
