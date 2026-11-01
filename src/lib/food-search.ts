import { Platform } from 'react-native';

// Branded product search, via Ember's own /api/foods route (see src/app/api/foods+api.ts), which asks
// Open Food Facts server-side — browsers can't call it directly. Everyday foods come from basic-foods.ts instead.
// Values are per 100 g; the add-food screen scales them by the grams you pick.

export type FoodResult = {
  id: string;
  name: string;
  brand: string | null;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  servingGrams: number | null;
};

// The web app calls its own origin; native builds call the hosted web app.
const API = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL ?? 'https://bryanjessy-ember.expo.app');

// Same query twice (typing then deleting a letter) shouldn't hit the network twice.
const cache = new Map<string, FoodResult[]>();

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const q = query.trim().toLowerCase();
  const hit = cache.get(q);
  if (hit) return hit;
  const res = await fetch(`${API}/api/foods?${new URLSearchParams({ q })}`, { signal });
  const body: { foods?: FoodResult[]; error?: string } = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Product search is unavailable right now.');
  const foods = body.foods ?? [];
  cache.set(q, foods);
  return foods;
}
