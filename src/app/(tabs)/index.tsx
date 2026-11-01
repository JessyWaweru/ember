import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DaySwitcher } from '@/components/day-switcher';
import { MealRow } from '@/components/meal-row';
import { Button, Card, Icon, Ring, Row, Screen, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useMeals, useProfile, useWorkouts } from '@/lib/data';
import { MEAL_TYPES } from '@/lib/catalog';
import { todayKey } from '@/lib/dates';

function MacroRing({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const left = Math.round(goal - value);
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: Space.sm, padding: Space.md }}>
      <Ring size={64} stroke={7} progress={goal ? value / goal : 0} color={color}>
        <Txt variant="caption" style={{ fontWeight: '700' }}>{Math.round(value)}g</Txt>
      </Ring>
      <View style={{ alignItems: 'center' }}>
        <Txt variant="caption" style={{ fontWeight: '700' }}>{label}</Txt>
        <Txt variant="caption" color={left < 0 ? C.danger : C.textDim}>
          {left >= 0 ? `${left}g left` : `${-left}g over`}
        </Txt>
      </View>
    </Card>
  );
}

export default function Today() {
  const [date, setDate] = useState(todayKey());
  const profile = useProfile().data!;
  const { data: meals = [] } = useMeals(date);
  const { data: workouts = [] } = useWorkouts();

  const eaten = meals.reduce((s, m) => s + m.calories, 0);
  const burned = workouts.filter((w) => w.log_date === date).reduce((s, w) => s + w.calories_burned, 0);
  const budget = profile.calorie_goal + burned;
  const left = budget - eaten;
  const macro = (k: 'protein' | 'carbs' | 'fat') => meals.reduce((s, m) => s + m[k], 0);

  return (
    <Screen tabs>
      <DaySwitcher date={date} onChange={setDate} />

      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Space.xl }}>
        <View style={{ gap: Space.xs }}>
          <Txt variant="hero" color={left < 0 ? C.danger : C.text}>{Math.abs(left)}</Txt>
          <Txt color={C.textDim}>{left < 0 ? 'Calories over' : 'Calories left'}</Txt>
          <Row style={{ marginTop: Space.sm }} gap={Space.lg}>
            <View>
              <Txt variant="label">{eaten}</Txt>
              <Txt variant="caption" color={C.textDim}>eaten</Txt>
            </View>
            <View>
              <Txt variant="label" color={C.burn}>+{burned}</Txt>
              <Txt variant="caption" color={C.textDim}>burned</Txt>
            </View>
            <View>
              <Txt variant="label">{profile.calorie_goal}</Txt>
              <Txt variant="caption" color={C.textDim}>goal</Txt>
            </View>
          </Row>
        </View>
        <Ring size={110} stroke={11} progress={budget ? eaten / budget : 0} color={left < 0 ? C.danger : C.accent}>
          <Icon name="flame" size={30} color={left < 0 ? C.danger : C.accent} />
        </Ring>
      </Card>

      <Row gap={Space.md}>
        <MacroRing label="Protein" value={macro('protein')} goal={profile.protein_goal} color={C.protein} />
        <MacroRing label="Carbs" value={macro('carbs')} goal={profile.carbs_goal} color={C.carbs} />
        <MacroRing label="Fat" value={macro('fat')} goal={profile.fat_goal} color={C.fat} />
      </Row>

      {MEAL_TYPES.map(({ type, label, emoji }) => {
        const items = meals.filter((m) => m.meal_type === type);
        const kcal = items.reduce((s, m) => s + m.calories, 0);
        return (
          <Card key={type} style={{ gap: Space.xs }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="heading">{`${emoji}  ${label}`}</Txt>
              <Row gap={Space.md}>
                {kcal ? <Txt color={C.textDim}>{kcal} kcal</Txt> : null}
                <Txt
                  color={C.accent}
                  style={{ fontWeight: '700' }}
                  onPress={() => router.push({ pathname: '/add-meal', params: { date, type } })}>
                  + Add
                </Txt>
              </Row>
            </Row>
            {items.map((m) => <MealRow key={m.id} meal={m} />)}
          </Card>
        );
      })}

      <Button title="Log food" onPress={() => router.push({ pathname: '/add-meal', params: { date } })} />
      <Txt variant="caption" color={C.textFaint} style={{ textAlign: 'center' }}>Tap an entry to delete it.</Txt>
    </Screen>
  );
}
