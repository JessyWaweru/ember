// Everyday foods built into the app: instant, offline, and accurate where crowd-sourced product data often isn't
// (the top "Sugar" product online claims 30 kcal/100 g; it's 387).
// Values per 100 g from USDA FoodData Central (SR Legacy / Foundation); cooked where marked.
// Dishes marked "approx." are typical home recipes and vary.

type Row = [name: string, aliases: string, kcal: number, protein: number, carbs: number, fat: number, portions: [string, number][]];

const ROWS: Row[] = [
  // sugars & spreads
  ['Sugar (white)', 'table sugar granulated cane', 387, 0, 100, 0, [['1 tsp', 4], ['1 tbsp', 12.5], ['1 cube', 3]]],
  ['Brown sugar', 'sugar', 380, 0.1, 98.1, 0, [['1 tsp', 4.6], ['1 tbsp', 13.8]]],
  ['Honey', 'sweetener', 304, 0.3, 82.4, 0, [['1 tsp', 7], ['1 tbsp', 21]]],
  ['Jam', 'jelly preserves', 278, 0.4, 68.9, 0.1, [['1 tbsp', 20]]],
  // grains & starches
  ['White rice (cooked)', 'rice boiled', 130, 2.7, 28.2, 0.3, [['1 cup', 158], ['1 plate', 250]]],
  ['Brown rice (cooked)', 'rice', 123, 2.7, 25.6, 1, [['1 cup', 195]]],
  ['Pilau (approx.)', 'pilau rice spiced', 175, 4.5, 27, 5.5, [['1 cup', 180], ['1 plate', 300]]],
  ['Pasta / spaghetti (cooked)', 'macaroni noodles', 158, 5.8, 30.9, 0.9, [['1 cup', 140]]],
  ['Instant noodles (cooked)', 'ramen indomie', 138, 3, 19.6, 5.3, [['1 pack cooked', 240]]],
  ['White bread', 'bread toast loaf', 265, 9, 49, 3.2, [['1 slice', 28]]],
  ['Whole wheat bread', 'brown bread toast', 252, 12.4, 42.7, 3.5, [['1 slice', 32]]],
  ['Chapati (approx.)', 'chapo roti paratha flatbread', 300, 7.5, 46, 9.5, [['1 chapati', 70]]],
  ['Mandazi (approx.)', 'mandasi doughnut fried dough', 395, 6.5, 50, 19, [['1 mandazi', 45]]],
  ['Ugali (approx.)', 'sima nshima posho maize stiff porridge', 124, 2.8, 26.5, 1, [['1 piece/serving', 250]]],
  ['Maize flour', 'cornmeal unga', 370, 8.1, 76.9, 3.6, [['1 cup', 125]]],
  ['Wheat flour (all-purpose)', 'flour', 364, 10.3, 76.3, 1, [['1 cup', 125], ['1 tbsp', 8]]],
  ['Oats (dry)', 'oatmeal rolled oats porridge', 389, 16.9, 66.3, 6.9, [['½ cup', 40], ['1 cup', 81]]],
  ['Porridge / oatmeal (cooked, water)', 'oats uji', 71, 2.5, 12, 1.5, [['1 bowl', 234]]],
  ['Corn flakes', 'cereal', 357, 7.5, 84.1, 0.4, [['1 cup', 28]]],
  ['Granola', 'cereal muesli', 471, 10, 64, 20, [['½ cup', 60]]],
  ['Potato (boiled)', 'potatoes', 87, 1.9, 20.1, 0.1, [['1 medium', 150]]],
  ['Sweet potato (baked)', 'sweet potatoes', 90, 2, 20.7, 0.2, [['1 medium', 130]]],
  ['French fries', 'chips fries', 312, 3.4, 41.4, 14.7, [['small', 80], ['medium', 117], ['large', 154]]],
  ['Cassava (boiled)', 'yuca manioc', 160, 1.4, 38.1, 0.3, [['1 cup', 103]]],
  ['Plantain (cooked)', 'matoke green banana', 116, 0.8, 31.2, 0.2, [['1 cup', 154]]],
  ['Corn on the cob (boiled)', 'maize sweetcorn mahindi', 96, 3.4, 21, 1.5, [['1 ear', 100]]],
  ['Popcorn (air-popped)', 'popcorn', 387, 12.9, 77.8, 4.5, [['1 cup', 8]]],
  // meat, fish, eggs
  ['Egg (whole)', 'eggs boiled', 143, 12.6, 0.7, 9.5, [['1 large', 50], ['2 large', 100]]],
  ['Egg (fried)', 'eggs', 196, 13.6, 0.8, 14.8, [['1 large', 46]]],
  ['Egg white', 'eggs', 52, 10.9, 0.7, 0.2, [['1 large', 33]]],
  ['Chicken breast (cooked)', 'chicken grilled', 165, 31, 0, 3.6, [['½ breast', 86], ['1 breast', 172]]],
  ['Chicken thigh (cooked, skin)', 'chicken', 229, 23.3, 0, 14.7, [['1 thigh', 70]]],
  ['Fried chicken (with skin)', 'kfc chicken', 290, 24, 9, 17.5, [['1 piece', 120]]],
  ['Beef mince (cooked, 85% lean)', 'ground beef', 250, 25.9, 0, 15.4, [['100 g', 100]]],
  ['Beef steak (cooked)', 'sirloin', 206, 29, 0, 9, [['1 steak', 200]]],
  ['Beef stew (approx.)', 'meat stew nyama', 145, 12, 8, 7, [['1 cup', 245]]],
  ['Goat meat (roasted)', 'nyama choma mutton', 143, 27.1, 0, 3, [['¼ kg', 250]]],
  ['Pork chop (cooked)', 'pork', 231, 25.7, 0, 13.6, [['1 chop', 145]]],
  ['Bacon (cooked)', 'pork', 541, 37, 1.4, 41.8, [['1 slice', 8]]],
  ['Sausage (beef/pork, cooked)', 'smokie hot dog', 301, 12, 2, 27, [['1 sausage', 50]]],
  ['Salmon (cooked)', 'fish', 206, 22.1, 0, 12.4, [['1 fillet', 154]]],
  ['Tilapia (cooked)', 'fish', 128, 26.2, 0, 2.7, [['1 fillet', 87]]],
  ['Tuna (canned in water)', 'fish', 116, 25.5, 0, 0.8, [['1 can drained', 142]]],
  ['Omena / sardines (dried)', 'dagaa silverfish', 335, 63, 0, 9, [['1 cup', 60]]],
  ['Shrimp / prawns (cooked)', 'seafood', 99, 24, 0.2, 0.3, [['100 g', 100]]],
  // dairy
  ['Milk (whole)', 'maziwa', 61, 3.2, 4.8, 3.3, [['1 cup', 244], ['1 glass', 250]]],
  ['Milk (low fat 2%)', 'milk', 50, 3.3, 4.8, 2, [['1 cup', 244]]],
  ['Milk (skim)', 'milk', 34, 3.4, 5, 0.1, [['1 cup', 245]]],
  ['Tea with milk & sugar (approx.)', 'chai', 50, 1.6, 7.6, 1.6, [['1 cup', 250]]],
  ['Mala / fermented milk', 'maziwa lala kefir', 63, 3.3, 4.5, 3.5, [['1 cup', 250]]],
  ['Yogurt (plain, whole)', 'yoghurt', 61, 3.5, 4.7, 3.3, [['1 cup', 245]]],
  ['Greek yogurt (nonfat)', 'yoghurt', 59, 10.2, 3.6, 0.4, [['1 cup', 227], ['1 pot', 170]]],
  ['Cheddar cheese', 'cheese', 403, 24.9, 1.3, 33.1, [['1 slice', 28]]],
  ['Mozzarella', 'cheese', 280, 27.5, 3.1, 17.1, [['1 oz', 28]]],
  ['Butter', 'margarine blue band', 717, 0.9, 0.1, 81.1, [['1 tsp', 5], ['1 tbsp', 14]]],
  ['Whey protein powder', 'protein shake scoop', 400, 80, 8, 6, [['1 scoop', 30]]],
  // oils, nuts, seeds
  ['Olive oil', 'oil', 884, 0, 0, 100, [['1 tsp', 4.5], ['1 tbsp', 13.5]]],
  ['Vegetable / cooking oil', 'oil sunflower canola', 884, 0, 0, 100, [['1 tsp', 4.5], ['1 tbsp', 13.6]]],
  ['Peanut butter', 'nut butter', 588, 25.1, 20, 50.4, [['1 tbsp', 16], ['2 tbsp', 32]]],
  ['Peanuts (roasted)', 'groundnuts njugu', 585, 23.7, 21.5, 49.7, [['handful', 28]]],
  ['Almonds', 'nuts', 579, 21.2, 21.6, 49.9, [['handful (23)', 28]]],
  ['Cashews', 'nuts', 553, 18.2, 30.2, 43.9, [['handful', 28]]],
  ['Chia seeds', 'seeds', 486, 16.5, 42.1, 30.7, [['1 tbsp', 12]]],
  // legumes
  ['Kidney beans (cooked)', 'beans maharagwe', 127, 8.7, 22.8, 0.5, [['1 cup', 177]]],
  ['Black beans (cooked)', 'beans', 132, 8.9, 23.7, 0.5, [['1 cup', 172]]],
  ['Lentils (cooked)', 'dal', 116, 9, 20.1, 0.4, [['1 cup', 198]]],
  ['Green grams / mung beans (cooked)', 'ndengu dengu', 105, 7, 19.2, 0.4, [['1 cup', 202]]],
  ['Chickpeas (cooked)', 'garbanzo', 164, 8.9, 27.4, 2.6, [['1 cup', 164]]],
  ['Githeri (approx.)', 'maize and beans', 135, 6, 24, 1.5, [['1 cup', 200], ['1 plate', 350]]],
  ['Baked beans (canned)', 'beans', 94, 4.8, 21.4, 0.4, [['½ can', 210]]],
  // vegetables
  ['Broccoli', 'vegetables', 34, 2.8, 6.6, 0.4, [['1 cup chopped', 91]]],
  ['Spinach', 'vegetables', 23, 2.9, 3.6, 0.4, [['1 cup raw', 30], ['1 cup cooked', 180]]],
  ['Kale / sukuma wiki (cooked)', 'collard greens sukuma', 36, 2.9, 5.6, 0.4, [['1 cup', 130]]],
  ['Cabbage', 'vegetables', 25, 1.3, 5.8, 0.1, [['1 cup shredded', 89]]],
  ['Carrot', 'vegetables', 41, 0.9, 9.6, 0.2, [['1 medium', 61]]],
  ['Tomato', 'vegetables', 18, 0.9, 3.9, 0.2, [['1 medium', 123]]],
  ['Onion', 'vegetables', 40, 1.1, 9.3, 0.1, [['1 medium', 110]]],
  ['Cucumber', 'vegetables', 15, 0.7, 3.6, 0.1, [['1 cup sliced', 104]]],
  ['Lettuce', 'salad greens', 15, 1.4, 2.9, 0.2, [['1 cup', 36]]],
  ['Bell pepper', 'capsicum pepper', 31, 1, 6, 0.3, [['1 medium', 119]]],
  ['Green peas (cooked)', 'peas', 84, 5.4, 15.6, 0.2, [['1 cup', 160]]],
  ['Mushrooms', 'vegetables', 22, 3.1, 3.3, 0.3, [['1 cup', 70]]],
  ['Avocado', 'fruit', 160, 2, 8.5, 14.7, [['½ fruit', 100], ['1 fruit', 200]]],
  // fruit
  ['Banana', 'fruit ndizi', 89, 1.1, 22.8, 0.3, [['1 medium', 118], ['1 small', 101]]],
  ['Apple', 'fruit', 52, 0.3, 13.8, 0.2, [['1 medium', 182]]],
  ['Orange', 'fruit', 47, 0.9, 11.8, 0.1, [['1 medium', 131]]],
  ['Mango', 'fruit', 60, 0.8, 15, 0.4, [['1 cup sliced', 165], ['1 fruit', 200]]],
  ['Pineapple', 'fruit', 50, 0.5, 13.1, 0.1, [['1 cup', 165]]],
  ['Watermelon', 'fruit', 30, 0.6, 7.6, 0.2, [['1 cup', 152], ['1 wedge', 286]]],
  ['Pawpaw / papaya', 'fruit', 43, 0.5, 10.8, 0.3, [['1 cup', 145]]],
  ['Passion fruit', 'fruit', 97, 2.2, 23.4, 0.7, [['1 fruit', 18]]],
  ['Grapes', 'fruit', 69, 0.7, 18.1, 0.2, [['1 cup', 151]]],
  ['Strawberries', 'fruit berries', 32, 0.7, 7.7, 0.3, [['1 cup', 152]]],
  ['Dates (dried)', 'fruit', 282, 2.5, 75, 0.4, [['1 date', 7]]],
  // drinks
  ['Coca-Cola / soda', 'coke fanta sprite soft drink', 42, 0, 10.6, 0, [['1 can (330 ml)', 345], ['500 ml bottle', 520]]],
  ['Orange juice', 'juice', 45, 0.7, 10.4, 0.2, [['1 glass', 248]]],
  ['Beer', 'lager tusker', 43, 0.5, 3.6, 0, [['1 bottle (500 ml)', 500], ['1 can (330 ml)', 330]]],
  ['Wine (red)', 'alcohol', 85, 0.1, 2.6, 0, [['1 glass', 150]]],
  ['Spirits (40%)', 'vodka whisky gin rum', 231, 0, 0, 0, [['1 shot', 42]]],
  ['Coffee (black)', 'americano espresso', 1, 0.1, 0, 0, [['1 cup', 240]]],
  ['Latte (whole milk)', 'coffee cappuccino', 56, 3.3, 4.7, 2.9, [['1 cup', 240], ['grande', 470]]],
  // fast food & snacks
  ['Pizza (cheese)', 'pizza', 266, 11.4, 33.3, 9.7, [['1 slice', 107]]],
  ['Burger (single patty)', 'hamburger', 254, 13, 25, 11, [['1 burger', 110]]],
  ['Samosa (beef, approx.)', 'sambusa', 290, 9, 25, 17, [['1 samosa', 60]]],
  ['Potato chips / crisps', 'crisps', 536, 7, 53, 35, [['1 small bag', 28]]],
  ['Biscuits / cookies', 'cookie', 480, 6, 66, 21, [['1 biscuit', 12]]],
  ['Cake (approx.)', 'sponge cake', 380, 5, 55, 16, [['1 slice', 80]]],
  ['Dark chocolate (70–85%)', 'chocolate', 598, 7.8, 45.9, 42.6, [['1 square', 10], ['1 bar', 100]]],
  ['Milk chocolate', 'chocolate bar', 535, 7.7, 59.4, 29.7, [['1 square', 7], ['1 bar', 45]]],
  ['Ice cream (vanilla)', 'icecream', 207, 3.5, 23.6, 11, [['1 scoop', 66], ['1 cup', 132]]],
];

export type BasicFood = {
  id: string;
  name: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  portions: { label: string; grams: number }[];
  search: string;
};

export const BASIC_FOODS: BasicFood[] = ROWS.map(([name, aliases, calories, protein, carbs, fat, portions]) => ({
  id: `basic:${name}`,
  name,
  per100g: { calories, protein, carbs, fat },
  portions: portions.map(([label, grams]) => ({ label, grams })),
  search: `${name} ${aliases}`.toLowerCase(),
}));

/** Basic foods matching every word typed (by word start), best matches first. */
export function searchBasicFoods(query: string, limit = 8): BasicFood[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored = BASIC_FOODS.flatMap((f, i) => {
    const tokens = f.search.split(/[^a-z0-9]+/);
    if (!words.every((w) => tokens.some((t) => t.startsWith(w)))) return [];
    const name = f.name.toLowerCase();
    // Name starts with the query > a name word starts with it > only an alias matches.
    const score = name.startsWith(words[0]) ? 0 : name.split(/[^a-z0-9]+/).some((t) => t.startsWith(words[0])) ? 1 : 2;
    return [{ f, score, i }];
  });
  // Ties keep list order, where the everyday version comes first (whole egg before egg white).
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).slice(0, limit).map((s) => s.f);
}
