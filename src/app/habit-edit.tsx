import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ColorPicker } from '@/components/color-picker';
import { dialog } from '@/components/dialog';
import { Button, Card, Chip, Field, IconButton, Row, Screen, Segmented, SheetHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useHabits, useSaveHabit } from '@/lib/data';
import { WEEKDAY_LETTERS } from '@/lib/dates';
import { AUTO_OPTIONS, HABIT_COLORS, HABIT_EMOJIS, HABIT_TEMPLATES, SECTIONS } from '@/lib/habits';
import type { HabitKind, HabitSection, NewHabit } from '@/lib/types';
import { sound } from '@/lib/sound';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function HabitEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useHabits().data?.find((h) => h.id === id);
  const save = useSaveHabit();

  const [form, setForm] = useState<NewHabit>(
    existing
      ? { name: existing.name, emoji: existing.emoji, color: existing.color, days: existing.days, target_count: existing.target_count, kind: existing.kind, section: existing.section, auto: existing.auto ?? null }
      : { name: '', emoji: '✅', color: HABIT_COLORS[1], days: ALL_DAYS, target_count: 1, kind: 'good', section: 'anytime', auto: null }
  );
  const [showTemplates, setShowTemplates] = useState(!existing);
  const isCustom = !HABIT_COLORS.includes(form.color);
  const [customColor, setCustomColor] = useState(false);
  const set = <K extends keyof NewHabit>(k: K, v: NewHabit[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim()) return dialog('Give your habit a name');
    if (form.days.length === 0) return dialog('Pick at least one day');
    try {
      // Only send `auto` when it's on or being switched off.
      const auto = form.auto ?? (existing?.auto ? null : undefined);
      await save.mutateAsync({ ...form, auto, name: form.name.trim(), emoji: form.emoji || '✅', id: existing?.id });
      sound.success();
      router.back();
    } catch (e) {
      dialog('Could not save', (e as Error).message);
    }
  }

  return (
    <Screen>
      <SheetHeader title={existing ? 'Edit habit' : 'New habit'} />

      {showTemplates ? (
        <Card style={{ gap: Space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading">Start from a template</Txt>
            <Txt color={C.textDim} onPress={() => setShowTemplates(false)}>Custom</Txt>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
            {HABIT_TEMPLATES.map((t) => (
              <Chip
                key={t.name}
                label={`${t.emoji} ${t.name}`}
                onPress={() => {
                  setForm((f) => ({ ...f, ...t, color: t.color ?? f.color, auto: t.auto ?? null }));
                  setShowTemplates(false);
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {/* live preview */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md, borderColor: form.color + '55', borderWidth: 1 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: form.color + '26', alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 22 }}>{form.emoji}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }}>{form.name || 'Habit name'}</Txt>
          <Txt variant="caption" color={C.textDim}>
            {form.kind === 'bad' ? 'Quit · clean by default' : form.target_count > 1 ? `${form.target_count}× per day` : 'Once per day'}
            {form.days.length === 7 ? ' · every day' : ` · ${form.days.length} days/week`}
          </Txt>
        </View>
      </Card>

      <Card style={{ gap: Space.md }}>
        <Field label="Name" placeholder="e.g. Walk after dinner" value={form.name} onChangeText={(v) => set('name', v)} />

        <Txt variant="caption" color={C.textDim}>Track automatically</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          <Chip label="Off — I check it off" active={!form.auto} color={form.color} onPress={() => set('auto', null)} />
          {AUTO_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={`⚡ ${o.label}`}
              active={form.auto === o.value}
              color={form.color}
              onPress={() => setForm((f) => ({ ...f, auto: o.value, kind: o.kind, target_count: 1 }))}
            />
          ))}
        </View>
        {form.auto ? (
          <Txt variant="caption" color={C.textFaint}>{AUTO_OPTIONS.find((o) => o.value === form.auto)!.detail}</Txt>
        ) : null}

        {/* Auto habits set their own type. */}
        {!form.auto ? (
          <>
            <Txt variant="caption" color={C.textDim}>Type</Txt>
            <Segmented<HabitKind>
              value={form.kind}
              onChange={(v) => set('kind', v)}
              color={form.color}
              options={[{ value: 'good', label: '✅ Build' }, { value: 'bad', label: '🛡️ Quit' }]}
            />
          </>
        ) : null}
        {form.auto ? null : form.kind === 'bad' ? (
          <Txt variant="caption" color={C.textFaint}>Every day counts as clean unless you log a slip.</Txt>
        ) : (
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt color={C.textDim}>Times per day</Txt>
            <Row gap={Space.md}>
              <IconButton icon="minus" onPress={() => set('target_count', Math.max(1, form.target_count - 1))} />
              <Txt variant="label" style={{ minWidth: 24, textAlign: 'center' }}>{form.target_count}</Txt>
              <IconButton icon="plus" onPress={() => set('target_count', Math.min(50, form.target_count + 1))} />
            </Row>
          </Row>
        )}

        <Txt variant="caption" color={C.textDim}>Repeat on</Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          {ALL_DAYS.map((d) => {
            const on = form.days.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => set('days', on ? form.days.filter((x) => x !== d) : [...form.days, d].sort())}
                style={{
                  width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? form.color : C.cardHigh,
                }}>
                <Txt style={{ fontWeight: '700' }} color={on ? '#0B0B0D' : C.textDim}>{WEEKDAY_LETTERS[d]}</Txt>
              </Pressable>
            );
          })}
        </Row>

        <Txt variant="caption" color={C.textDim}>Time of day</Txt>
        <Segmented<HabitSection>
          value={form.section}
          onChange={(v) => set('section', v)}
          color={form.color}
          options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))}
        />
      </Card>

      <Card style={{ gap: Space.md }}>
        <Txt variant="caption" color={C.textDim}>Icon</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          {HABIT_EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => set('emoji', e)}
              style={{
                width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: form.emoji === e ? form.color + '40' : C.cardHigh,
              }}>
              <Txt style={{ fontSize: 20 }}>{e}</Txt>
            </Pressable>
          ))}
        </View>
        <Field label="…or type any emoji" value={form.emoji} maxLength={8} onChangeText={(v) => set('emoji', v.trim())} />

        <Txt variant="caption" color={C.textDim}>Color</Txt>
        {/* Swatches share the row, so the custom one always fits. */}
        <Row gap={6}>
          {HABIT_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                set('color', c);
                setCustomColor(false);
              }}
              style={{ flex: 1, aspectRatio: 1, maxWidth: 36, borderRadius: 18, backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: C.text }}
            />
          ))}
          {/* Any colour: shows your custom pick, or a palette icon until you have one. */}
          <Pressable
            onPress={() => setCustomColor(!customColor)}
            style={{
              flex: 1, aspectRatio: 1, maxWidth: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
              backgroundColor: isCustom ? form.color : C.cardHigh,
              borderWidth: isCustom || customColor ? 3 : 0, borderColor: C.text,
            }}>
            {isCustom ? null : <Txt style={{ fontSize: 16 }}>🎨</Txt>}
          </Pressable>
        </Row>
        {customColor ? <ColorPicker value={form.color} onChange={(c) => set('color', c)} /> : null}
      </Card>

      <Button title={existing ? 'Save' : 'Create habit'} color={form.color} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
