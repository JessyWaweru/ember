import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { Button, Card, Chip, Field, Row, Screen, Segmented, SheetHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { MEAL_TYPES } from '@/lib/catalog';
import { useDeleteMeal, useMeals, useRecentFoods, useSaveMeal } from '@/lib/data';
import { todayKey } from '@/lib/dates';
import { searchFoods, type FoodResult } from '@/lib/food-search';
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
  const [tab, setTab] = useState<'manual' | 'search' | 'recent'>('manual');
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
        options={[{ value: 'manual', label: 'Manual' }, { value: 'search', label: 'Search' }, { value: 'recent', label: 'Recent' }]}
      />

      {tab === 'search' ? (
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

function SearchTab({ onPick }: { onPick: (f: Form) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState('100');

  // Debounced search as you type.
  useEffect(() => {
    if (q.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setBusy(true);
      setError(null);
      searchFoods(q.trim(), ctrl.signal)
        .then(setResults)
        .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
        .finally(() => setBusy(false));
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (picked) {
    const g = Number(grams) || 0;
    const f = g / 100;
    const p = picked.per100g;
    return (
      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">{picked.name}</Txt>
        {picked.brand ? <Txt color={C.textDim}>{picked.brand}</Txt> : null}
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="100 g" active={grams === '100'} onPress={() => setGrams('100')} />
          {picked.servingGrams ? (
            <Chip label={`1 serving (${picked.servingGrams} g)`} active={grams === String(picked.servingGrams)} onPress={() => setGrams(String(picked.servingGrams))} />
          ) : null}
        </Row>
        <Field label="Amount" suffix="g" keyboardType="decimal-pad" value={grams} onChangeText={setGrams} />
        <Txt variant="label">{`${Math.round(p.calories * f)} kcal`}</Txt>
        <Txt color={C.textDim}>{`P ${r1(p.protein * f)}g · C ${r1(p.carbs * f)}g · F ${r1(p.fat * f)}g`}</Txt>
        <Button
          title="Use this"
          onPress={() =>
            onPick({
              name: `${picked.name}${picked.brand ? ` (${picked.brand})` : ''} · ${g}g`,
              calories: String(Math.round(p.calories * f)),
              protein: r1(p.protein * f),
              carbs: r1(p.carbs * f),
              fat: r1(p.fat * f),
              servings: '1',
            })
          }
        />
        <Button title="Back to results" variant="ghost" onPress={() => setPicked(null)} />
      </Card>
    );
  }

  return (
    <View style={{ gap: Space.md }}>
      <Field placeholder="Search foods (e.g. greek yogurt)" value={q} onChangeText={setQ} autoFocus returnKeyType="search" />
      {busy ? <ActivityIndicator color={C.accent} /> : null}
      {error ? <Txt color={C.danger}>{error}</Txt> : null}
      {!busy && q.trim().length >= 3 && results.length === 0 && !error ? (
        <Txt color={C.textDim}>No matches — try different words, or add it manually.</Txt>
      ) : null}
      {results.map((r) => (
        <Pressable key={r.id} onPress={() => setPicked(r)}>
          <Card style={{ gap: 2, padding: Space.md }}>
            <Txt numberOfLines={1} style={{ fontWeight: '600' }}>{r.name}</Txt>
            <Txt variant="caption" color={C.textDim}>
              {`${r.brand ? `${r.brand} · ` : ''}${Math.round(r.per100g.calories)} kcal / 100g`}
            </Txt>
          </Card>
        </Pressable>
      ))}
      <Txt variant="caption" color={C.textFaint}>Food data from Open Food Facts (free, community-made).</Txt>
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
