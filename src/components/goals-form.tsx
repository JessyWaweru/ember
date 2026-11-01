import { useState } from 'react';
import { View } from 'react-native';

import { dialog } from '@/components/dialog';
import { Button, Card, Chip, Field, Row, Segmented, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useLogWeight, useUpdateProfile } from '@/lib/data';
import { ACTIVITY_LABEL, recommendTargets } from '@/lib/nutrition';
import type { ActivityLevel, GoalType, Profile, Sex } from '@/lib/types';

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

export function GoalsForm({ profile, submitLabel, onDone }: { profile: Profile; submitLabel: string; onDone: () => void }) {
  const [sex, setSex] = useState<Sex>(profile.sex ?? 'male');
  const [birthYear, setBirthYear] = useState(str(profile.birth_year));
  const [height, setHeight] = useState(str(profile.height_cm));
  const [weight, setWeight] = useState(str(profile.weight_kg));
  const [goalWeight, setGoalWeight] = useState(str(profile.goal_weight_kg));
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity_level ?? 'light');
  const [goal, setGoal] = useState<GoalType>(profile.goal_type ?? 'lose');
  const [targets, setTargets] = useState({
    calories: str(profile.calorie_goal),
    protein: str(profile.protein_goal),
    carbs: str(profile.carbs_goal),
    fat: str(profile.fat_goal),
  });

  const update = useUpdateProfile();
  const logWeight = useLogWeight();

  const stats = { birthYear: Number(birthYear), heightCm: Number(height), weightKg: Number(weight) };
  const statsValid = stats.birthYear > 1900 && stats.heightCm > 50 && stats.weightKg > 20;

  function calculate() {
    if (!statsValid) return dialog('Fill in your stats', 'Birth year, height and weight are needed.');
    const t = recommendTargets({ sex, activity, goal, ...stats });
    setTargets({ calories: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) });
  }

  async function save() {
    const calorie_goal = Number(targets.calories);
    if (!calorie_goal) return dialog('Set a calorie goal', 'Tap "Calculate" or type one in.');
    try {
      await update.mutateAsync({
        sex,
        birth_year: stats.birthYear || null,
        height_cm: stats.heightCm || null,
        goal_weight_kg: Number(goalWeight) || null,
        activity_level: activity,
        goal_type: goal,
        calorie_goal,
        protein_goal: Number(targets.protein) || 0,
        carbs_goal: Number(targets.carbs) || 0,
        fat_goal: Number(targets.fat) || 0,
        onboarded: true,
      });
      if (stats.weightKg && stats.weightKg !== profile.weight_kg) await logWeight.mutateAsync(stats.weightKg);
      onDone();
    } catch (e) {
      dialog('Could not save', (e as Error).message);
    }
  }

  return (
    <View style={{ gap: Space.lg }}>
      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">About you</Txt>
        <Segmented value={sex} onChange={setSex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
        <Row gap={Space.md}>
          <Field style={{ flex: 1 }} label="Birth year" keyboardType="number-pad" value={birthYear} onChangeText={setBirthYear} placeholder="2000" />
          <Field style={{ flex: 1 }} label="Height" suffix="cm" keyboardType="decimal-pad" value={height} onChangeText={setHeight} placeholder="175" />
        </Row>
        <Row gap={Space.md}>
          <Field style={{ flex: 1 }} label="Weight" suffix="kg" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="75" />
          <Field style={{ flex: 1 }} label="Goal weight" suffix="kg" keyboardType="decimal-pad" value={goalWeight} onChangeText={setGoalWeight} placeholder="70" />
        </Row>
      </Card>

      <Card style={{ gap: Space.md }}>
        <Txt variant="heading">Activity</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((a) => (
            <Chip key={a} label={ACTIVITY_LABEL[a]} active={activity === a} onPress={() => setActivity(a)} />
          ))}
        </View>
        <Txt variant="heading" style={{ marginTop: Space.sm }}>Goal</Txt>
        <Segmented
          value={goal}
          onChange={setGoal}
          options={[{ value: 'lose', label: 'Lose' }, { value: 'maintain', label: 'Maintain' }, { value: 'gain', label: 'Gain' }]}
        />
      </Card>

      <Card style={{ gap: Space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Daily targets</Txt>
          <Button title="Calculate" variant="secondary" onPress={calculate} style={{ height: 36 }} />
        </Row>
        <Field label="Calories" suffix="kcal" keyboardType="number-pad" value={targets.calories} onChangeText={(v) => setTargets({ ...targets, calories: v })} />
        <Row gap={Space.md}>
          <Field style={{ flex: 1 }} label="Protein" suffix="g" keyboardType="number-pad" value={targets.protein} onChangeText={(v) => setTargets({ ...targets, protein: v })} />
          <Field style={{ flex: 1 }} label="Carbs" suffix="g" keyboardType="number-pad" value={targets.carbs} onChangeText={(v) => setTargets({ ...targets, carbs: v })} />
          <Field style={{ flex: 1 }} label="Fat" suffix="g" keyboardType="number-pad" value={targets.fat} onChangeText={(v) => setTargets({ ...targets, fat: v })} />
        </Row>
        <Txt variant="caption" color={C.textDim}>
          Calculated with the Mifflin-St Jeor formula. Exercise you log is added back on top of this goal.
        </Txt>
      </Card>

      <Button title={submitLabel} onPress={save} loading={update.isPending || logWeight.isPending} />
    </View>
  );
}
