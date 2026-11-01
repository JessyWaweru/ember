import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { Button, Card, Icon, PageHeader, Row, Screen, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/data';
import { supabase } from '@/lib/supabase';

function LinkRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontWeight: '700' }}>{title}</Txt>
        {subtitle ? <Txt variant="caption" color={C.textDim}>{subtitle}</Txt> : null}
      </View>
      <Icon name="chevronRight" size={16} color={C.textFaint} />
    </Card>
  );
}

export default function Me() {
  const { session } = useAuth();
  const profile = useProfile().data!;
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const tables = ['profiles', 'meals', 'weight_logs', 'exercises', 'workout_logs', 'habits', 'habit_logs'] as const;
      const results = await Promise.all(tables.map((t) => supabase.from(t).select('*')));
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      const dump = Object.fromEntries(tables.map((t, i) => [t, results[i].data]));
      await Share.share({ message: JSON.stringify({ exported_at: new Date().toISOString(), ...dump }) });
    } catch (e) {
      dialog('Export failed', (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen tabs>
      <PageHeader kicker="YOU" title="Me" tagline="Goals, weight and settings." color={C.protein} />
      <Card style={{ gap: 2 }}>
        <Txt variant="heading">{profile.display_name ?? 'You'}</Txt>
        <Txt color={C.textDim}>{session?.user.email}</Txt>
        <Row style={{ marginTop: Space.sm }} gap={Space.xs}>
          <Txt variant="caption" color={C.burn}>●</Txt>
          <Txt variant="caption" color={C.textDim}>Synced to your account. Sign in on any phone to pick up where you left off.</Txt>
        </Row>
      </Card>

      <LinkRow
        title="Goals"
        subtitle={`${profile.calorie_goal} kcal · P ${profile.protein_goal}g · C ${profile.carbs_goal}g · F ${profile.fat_goal}g`}
        onPress={() => router.push('/goals')}
      />
      <LinkRow
        title="Log weight"
        subtitle={profile.weight_kg ? `Currently ${profile.weight_kg} kg${profile.goal_weight_kg ? ` · goal ${profile.goal_weight_kg} kg` : ''}` : 'Not set'}
        onPress={() => router.push('/weight')}
      />

      <Card style={{ gap: Space.sm }}>
        <Txt variant="heading">Home-screen widgets</Txt>
        <Txt color={C.textDim}>Ember has three widgets: Calories, Training and Habits. They update whenever you log something in the app.</Txt>
        <Txt variant="caption" color={C.textDim}>• iPhone: long-press the home screen → Edit → Add Widget → Ember.</Txt>
        <Txt variant="caption" color={C.textDim}>• Android: long-press the home screen → Widgets → Ember.</Txt>
      </Card>

      <Button title="Export my data (JSON)" variant="secondary" onPress={exportData} loading={exporting} />
      <Button
        title="Sign out"
        variant="danger"
        onPress={() =>
          dialog('Sign out?', 'Your data stays safe in your account.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
          ])
        }
      />
    </Screen>
  );
}
