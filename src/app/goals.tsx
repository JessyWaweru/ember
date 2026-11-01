import { router } from 'expo-router';

import { GoalsForm } from '@/components/goals-form';
import { Loading, Screen, SheetHeader } from '@/components/ui';
import { useProfile } from '@/lib/data';

export default function Goals() {
  const { data: profile } = useProfile();
  if (!profile) return <Loading />;

  return (
    <Screen>
      <SheetHeader title="Goals" />
      <GoalsForm profile={profile} submitLabel="Save goals" onDone={() => router.back()} />
    </Screen>
  );
}
