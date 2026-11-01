import { router } from 'expo-router';
import { useState } from 'react';

import { dialog } from '@/components/dialog';
import { Button, Field, Screen, SheetHeader, Txt } from '@/components/ui';
import { C } from '@/constants/theme';
import { useLogWeight, useProfile } from '@/lib/data';
import { sound } from '@/lib/sound';

export default function Weight() {
  const profile = useProfile().data;
  const [kg, setKg] = useState(profile?.weight_kg ? String(profile.weight_kg) : '');
  const log = useLogWeight();

  async function save() {
    const w = Number(kg);
    if (!(w > 20 && w < 400)) return dialog('Enter a valid weight in kg');
    try {
      await log.mutateAsync(w);
      sound.success();
      router.back();
    } catch (e) {
      dialog('Could not save', (e as Error).message);
    }
  }

  return (
    <Screen>
      <SheetHeader title="Log weight" />
      <Txt color={C.textDim}>One entry per day; logging again today replaces it. Your weight also scales strength ranks.</Txt>
      <Field label="Weight" suffix="kg" keyboardType="decimal-pad" value={kg} onChangeText={setKg} autoFocus />
      <Button title="Save" onPress={save} loading={log.isPending} />
    </Screen>
  );
}
