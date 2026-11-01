import { Pressable, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { C, Space } from '@/constants/theme';
import { useDeleteMeal } from '@/lib/data';
import type { Meal } from '@/lib/types';

import { Row, Txt } from './ui';

export function MealRow({ meal }: { meal: Meal }) {
  const del = useDeleteMeal();
  const confirm = () =>
    dialog('Delete entry?', meal.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(meal.id) },
    ]);

  return (
    <Pressable onPress={confirm} onLongPress={confirm} style={({ pressed }) => ({ opacity: pressed || del.isPending ? 0.6 : 1 })}>
      <Row style={{ justifyContent: 'space-between', paddingVertical: Space.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt numberOfLines={1} style={{ fontWeight: '600' }}>{meal.name}</Txt>
          <Txt variant="caption" color={C.textDim}>
            {`P ${Math.round(meal.protein)}g · C ${Math.round(meal.carbs)}g · F ${Math.round(meal.fat)}g`}
            {meal.servings !== 1 ? ` · ×${meal.servings}` : ''}
          </Txt>
        </View>
        <Txt style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{meal.calories}</Txt>
      </Row>
    </Pressable>
  );
}
