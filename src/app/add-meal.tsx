import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { Button, Card, Chip, Field, IconButton, Row, Screen, Segmented, SheetHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { MEAL_TYPES } from '@/lib/catalog';
import { useDeleteMeal, useMeals, useRecentFoods, useSaveMeal } from '@/lib/data';
import { todayKey } from '@/lib/dates';
import { searchBasicFoods, type BasicFood } from '@/lib/basic-foods';
import { searchFoods, type FoodResult } from '@/lib/food-search';
import { analyzeMealPhoto, pickMealPhoto, type PhotoItem } from '@/lib/meal-photo';
import type { Meal, MealType } from '@/lib/types';
import { sound } from '@/lib/sound';

function defaultMealType(): MealType {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

type Form = { name: string; calories: string; protein: string; carbs: string; fat: string; servings: string };
const EMPTY: Form = { name: '', calories: '', protein: '', carbs: '', fat: '', servings: '1' };
const r1 = (n: number) => String(Math.round(n * 10) / 10);

// Logged meals store totals; the form works per serving.
function formFromMeal(m: Meal): Form {
  const s = m.servings || 1;
  return {
    name: m.name,
    calories: String(Math.round(m.calories / s)),
    protein: r1(m.protein / s),
    carbs: r1(m.carbs / s),
    fat: r1(m.fat / s),
    servings: String(s),
  };
}

export default function AddMeal() {
  const params = useLocalSearchParams<{ date?: string; type?: MealType; id?: string }>();
  const date = params.date ?? todayKey();
  const meals = useMeals(date);
  const existing = meals.data?.find((m) => m.id === params.id);
  const [mealType, setMealType] = useState<MealType>(params.type ?? defaultMealType());
  const [tab, setTab] = useState<'manual' | 'photo' | 'search' | 'recent'>('manual');
  const [form, setForm] = useState<Form>(EMPTY);
  const save = useSaveMeal();
  const del = useDeleteMeal();

  // The meal may arrive after first render (e.g. opened from History), so prefill once it does.
  const [prefilledId, setPrefilledId] = useState<string>();
  if (existing && prefilledId !== existing.id) {
    setPrefilledId(existing.id);
    setForm(formFromMeal(existing));
    setMealType(existing.meal_type);
  }

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const servings = Number(form.servings) || 1;
    const calories = Number(form.calories);
    if (!form.name.trim() || !Number.isFinite(calories) || calories < 0 || form.calories === '') {
      return dialog('Missing info', 'Add a name and calories.');
    }
    try {
      await save.mutateAsync({
        id: existing?.id,
        log_date: date,
        meal_type: mealType,
        name: form.name.trim(),
        servings,
        calories: Math.round(calories * servings),
        protein: (Number(form.protein) || 0) * servings,
        carbs: (Number(form.carbs) || 0) * servings,
        fat: (Number(form.fat) || 0) * servings,
      });
      sound.success();
      router.back();
    } catch (e) {
      dialog('Could not save', (e as Error).message);
    }
  }

  function remove() {
    if (!existing) return;
    dialog('Delete entry?', existing.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => del.mutate(existing.id, { onSuccess: () => (sound.remove(), router.back()) }),
      },
    ]);
  }

  if (params.id && !existing) {
    return (
      <Screen>
        <SheetHeader title="Edit food" />
        {meals.isPending ? <ActivityIndicator color={C.accent} /> : <Txt color={C.textDim}>This entry no longer exists.</Txt>}
      </Screen>
    );
  }

  return (
    <Screen>
      <SheetHeader title={existing ? 'Edit food' : 'Log food'} />
      <Row style={{ flexWrap: 'wrap' }}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m.type} label={`${m.emoji} ${m.label}`} active={mealType === m.type} onPress={() => setMealType(m.type)} />
        ))}
      </Row>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'manual', label: 'Manual' },
          { value: 'photo', label: '📷 Photo' },
          { value: 'search', label: 'Search' },
          { value: 'recent', label: 'Recent' },
        ]}
      />

      {tab === 'photo' ? (
        <PhotoTab
          onPick={(f) => {
            setForm(f);
            setTab('manual');
          }}
        />
      ) : tab === 'search' ? (
        <SearchTab
          onPick={(f) => {
            setForm(f);
            setTab('manual');
          }}
        />
      ) : tab === 'recent' ? (
        <RecentTab
          onPick={(f) => {
            setForm(f);
            setTab('manual');
          }}
        />
      ) : (
        <Card style={{ gap: Space.md }}>
          <Field label="Food" placeholder="e.g. Chicken & rice" value={form.name} onChangeText={set('name')} />
          <Row gap={Space.md}>
            <Field style={{ flex: 2 }} label="Calories (per serving)" suffix="kcal" keyboardType="decimal-pad" value={form.calories} onChangeText={set('calories')} />
            <Field style={{ flex: 1 }} label="Servings" keyboardType="decimal-pad" value={form.servings} onChangeText={set('servings')} />
          </Row>
          <Row gap={Space.md}>
            <Field style={{ flex: 1 }} label="Protein" suffix="g" keyboardType="decimal-pad" value={form.protein} onChangeText={set('protein')} />
            <Field style={{ flex: 1 }} label="Carbs" suffix="g" keyboardType="decimal-pad" value={form.carbs} onChangeText={set('carbs')} />
            <Field style={{ flex: 1 }} label="Fat" suffix="g" keyboardType="decimal-pad" value={form.fat} onChangeText={set('fat')} />
          </Row>
          <Button title={existing ? 'Save' : 'Add'} onPress={submit} loading={save.isPending} />
          {existing ? <Button title="Delete" variant="danger" onPress={remove} loading={del.isPending} /> : null}
        </Card>
      )}
    </Screen>
  );
}

const ANALYSING_LINES = ['Spotting the foods…', 'Judging the portions…', 'Checking for hidden oils…', 'Crunching the numbers…'];

/** Snap a meal → AI breakdown by item → adjust portions → fills the form for a final check. */
function PhotoTab({ onPick }: { onPick: (f: Form) => void }) {
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<(PhotoItem & { gramsText: string })[] | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setLine((l) => (l + 1) % ANALYSING_LINES.length), 1500);
    return () => clearInterval(t);
  }, [busy]);

  async function analyse(p: { uri: string; base64: string }) {
    setBusy(true);
    setError(null);
    setItems(null);
    setLine(0);
    try {
      const est = await analyzeMealPhoto(p.base64, hint);
      setMealName(est.mealName);
      setNotes(est.notes);
      setItems(est.items.map((it) => ({ ...it, gramsText: String(it.grams) })));
      sound.success();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function snap(from: 'camera' | 'library') {
    try {
      const p = await pickMealPhoto(from);
      if (!p) return;
      setPhoto(p);
      await analyse(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const live = (items ?? []).map((it) => {
    const g = Number(it.gramsText) || 0;
    const f = g / 100;
    return { ...it, g, kcal: it.per100g.calories * f, p: it.per100g.protein * f, c: it.per100g.carbs * f, fat: it.per100g.fat * f };
  });
  const total = live.reduce((t, x) => ({ kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.fat }), { kcal: 0, p: 0, c: 0, f: 0 });

  if (!photo) {
    return (
      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">Snap your meal</Txt>
        <Txt color={C.textDim}>
          AI spots each food, estimates its portion, and Ember works out the calories (from USDA data where it can). You check it before saving.
        </Txt>
        <Field label="Note for the AI (optional)" placeholder="e.g. cooked in butter, no sugar, half eaten" value={hint} onChangeText={setHint} />
        <Button title="📷  Take photo" onPress={() => snap('camera')} />
        <Button title="Choose from library" variant="secondary" onPress={() => snap('library')} />
        {error ? <Txt color={C.danger}>{error}</Txt> : null}
        <Txt variant="caption" color={C.textFaint}>Best results: shoot from above, whole plate in frame, a fork or hand in shot for scale.</Txt>
      </Card>
    );
  }

  return (
    <View style={{ gap: Space.md }}>
      <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: C.card }} resizeMode="cover" />

      {busy ? (
        <Card style={{ alignItems: 'center', gap: Space.md, paddingVertical: Space.xl }}>
          <ActivityIndicator color={C.accent} />
          <Txt color={C.textDim}>{ANALYSING_LINES[line]}</Txt>
        </Card>
      ) : null}

      {error && !busy ? (
        <Card style={{ gap: Space.md }}>
          <Txt color={C.danger}>{error}</Txt>
          <Button title="Try again" onPress={() => analyse(photo)} />
        </Card>
      ) : null}

      {items && !busy ? (
        <Card style={{ gap: Space.md }}>
          <Field label="Meal" value={mealName} onChangeText={setMealName} />
          {live.map((it, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Row gap={Space.sm}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontWeight: '700' }} numberOfLines={1}>{it.name}</Txt>
                  <Txt variant="caption" color={C.textDim}>
                    {`${Math.round(it.kcal)} kcal · P ${r1(it.p)} C ${r1(it.c)} F ${r1(it.fat)}`}
                    {it.confidence === 'low' ? ' · unsure' : ''}
                    {it.source === 'usda' ? ' · USDA' : ''}
                  </Txt>
                </View>
                <Field
                  style={{ width: 92 }}
                  suffix="g"
                  keyboardType="decimal-pad"
                  value={it.gramsText}
                  onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, gramsText: v } : x)))}
                />
                <IconButton icon="minus" onPress={() => setItems(items.filter((_, j) => j !== i))} />
              </Row>
            </View>
          ))}
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="label">{`${Math.round(total.kcal)} kcal`}</Txt>
            <Txt color={C.textDim}>{`P ${r1(total.p)}g · C ${r1(total.c)}g · F ${r1(total.f)}g`}</Txt>
          </Row>
          {notes ? <Txt variant="caption" color={C.textFaint}>{notes}</Txt> : null}
          <Button
            title="Use these"
            disabled={live.length === 0}
            onPress={() =>
              onPick({
                name: `📷 ${mealName.trim() || 'Meal'}`,
                calories: String(Math.round(total.kcal)),
                protein: r1(total.p),
                carbs: r1(total.c),
                fat: r1(total.f),
                servings: '1',
              })
            }
          />
          <Txt variant="caption" color={C.textFaint}>Adjust any portion that looks off: the totals update as you type.</Txt>
        </Card>
      ) : null}

      <Row gap={Space.sm}>
        <Button title="Retake" variant="secondary" style={{ flex: 1 }} onPress={() => snap('camera')} />
        <Button title="Pick another" variant="ghost" style={{ flex: 1 }} onPress={() => snap('library')} />
      </Row>
    </View>
  );
}

type Pickable = {
  name: string;
  brand: string | null;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  portions: { label: string; grams: number }[];
};

const fromBasic = (b: BasicFood): Pickable => ({ name: b.name, brand: null, per100g: b.per100g, portions: b.portions });
const fromProduct = (r: FoodResult): Pickable => ({
  name: r.name,
  brand: r.brand,
  per100g: r.per100g,
  portions: r.servingGrams ? [{ label: '1 serving', grams: r.servingGrams }] : [],
});

function SearchTab({ onPick }: { onPick: (f: Form) => void }) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<FoodResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Pickable | null>(null);
  const [grams, setGrams] = useState('100');

  // Everyday foods are built in, so they appear as you type; branded products load underneath.
  const basics = searchBasicFoods(q);
  const productQuery = q.trim().length >= 3 ? q.trim() : '';

  useEffect(() => {
    if (!productQuery) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setBusy(true);
      setError(null);
      searchFoods(productQuery, ctrl.signal)
        .then(setProducts)
        .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
        .finally(() => setBusy(false));
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [productQuery]);

  function pick(p: Pickable) {
    setPicked(p);
    setGrams(String(p.portions[0]?.grams ?? 100));
  }

  if (picked) {
    const g = Number(grams) || 0;
    const f = g / 100;
    const p = picked.per100g;
    const portion = picked.portions.find((x) => x.grams === g);
    return (
      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">{picked.name}</Txt>
        {picked.brand ? <Txt color={C.textDim}>{picked.brand}</Txt> : null}
        <Row style={{ flexWrap: 'wrap' }}>
          {picked.portions.map((x) => (
            <Chip key={x.label} label={`${x.label} (${x.grams} g)`} active={g === x.grams} onPress={() => setGrams(String(x.grams))} />
          ))}
          <Chip label="100 g" active={g === 100 && !portion} onPress={() => setGrams('100')} />
        </Row>
        <Field label="Amount" suffix="g" keyboardType="decimal-pad" value={grams} onChangeText={setGrams} />
        <Txt variant="label">{`${Math.round(p.calories * f)} kcal`}</Txt>
        <Txt color={C.textDim}>{`P ${r1(p.protein * f)}g · C ${r1(p.carbs * f)}g · F ${r1(p.fat * f)}g`}</Txt>
        <Button
          title="Use this"
          onPress={() =>
            onPick({
              name: `${picked.name}${picked.brand ? ` (${picked.brand})` : ''} · ${portion ? portion.label : `${g}g`}`,
              calories: String(Math.round(p.calories * f)),
              protein: r1(p.protein * f),
              carbs: r1(p.carbs * f),
              fat: r1(p.fat * f),
              servings: '1',
            })
          }
        />
        <Txt variant="caption" color={C.textFaint}>Had more than one? Set Servings on the next screen (e.g. 3 × 1 tsp).</Txt>
        <Button title="Back to results" variant="ghost" onPress={() => setPicked(null)} />
      </Card>
    );
  }

  const row = (key: string, name: string, sub: string, onPress: () => void) => (
    <Pressable key={key} onPress={onPress}>
      <Card style={{ gap: 2, padding: Space.md }}>
        <Txt numberOfLines={1} style={{ fontWeight: '600' }}>{name}</Txt>
        <Txt variant="caption" color={C.textDim}>{sub}</Txt>
      </Card>
    </Pressable>
  );

  return (
    <View style={{ gap: Space.md }}>
      <Field placeholder="Search foods (e.g. sugar, eggs, greek yogurt)" value={q} onChangeText={setQ} autoFocus returnKeyType="search" />

      {basics.length ? (
        <View style={{ gap: Space.sm }}>
          <Txt variant="caption" color={C.textDim} style={{ fontWeight: '700', letterSpacing: 1 }}>EVERYDAY FOODS</Txt>
          {basics.map((b) =>
            row(b.id, b.name, `${Math.round(b.per100g.calories)} kcal / 100g · ${b.portions.map((x) => x.label).join(', ')}`, () => pick(fromBasic(b)))
          )}
        </View>
      ) : null}

      {productQuery ? (
        <View style={{ gap: Space.sm }}>
          <Txt variant="caption" color={C.textDim} style={{ fontWeight: '700', letterSpacing: 1 }}>PRODUCTS</Txt>
          {busy ? <ActivityIndicator color={C.accent} /> : null}
          {error && !busy ? <Txt color={C.textDim}>{`${error} Everyday foods above still work.`}</Txt> : null}
          {!busy && !error && products.length === 0 ? (
            <Txt color={C.textDim}>{basics.length ? 'No branded products for that.' : 'No matches — try different words, or add it manually.'}</Txt>
          ) : null}
          {!busy
            ? products.map((r) =>
                row(r.id, r.name, `${r.brand ? `${r.brand} · ` : ''}${Math.round(r.per100g.calories)} kcal / 100g`, () => pick(fromProduct(r)))
              )
            : null}
        </View>
      ) : null}
      <Txt variant="caption" color={C.textFaint}>Everyday foods: USDA data, built in. Products: Open Food Facts (free, community-made).</Txt>
    </View>
  );
}

function RecentTab({ onPick }: { onPick: (f: Form) => void }) {
  const { data = [], isPending } = useRecentFoods();
  if (isPending) return <ActivityIndicator color={C.accent} />;
  if (data.length === 0) return <Txt color={C.textDim}>Foods you log will show up here for one-tap re-logging.</Txt>;
  return (
    <View style={{ gap: Space.sm }}>
      {data.map((m) => (
        <Pressable key={m.id} onPress={() => onPick(formFromMeal(m))}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', padding: Space.md }}>
            <Txt numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>{m.name}</Txt>
            <Txt color={C.textDim}>{m.calories} kcal</Txt>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
