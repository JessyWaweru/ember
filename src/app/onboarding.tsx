import { router } from 'expo-router';
import { View } from 'react-native';

import { GoalsForm } from '@/components/goals-form';
import { Loading, Screen, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useProfile } from '@/lib/data';

export default function Onboarding() {
  const { data: profile } = useProfile();
  if (!profile) return <Loading />;

  return (
    <Screen tabs>
      <View style={{ gap: Space.xs, marginTop: Space.lg }}>
        <Txt variant="title">Let&apos;s set your goals</Txt>
        <Txt color={C.textDim}>You can change any of this later under Me → Goals.</Txt>
      </View>
      <GoalsForm profile={profile} submitLabel="Start tracking" onDone={() => router.replace('/')} />
    </Screen>
  );
}
