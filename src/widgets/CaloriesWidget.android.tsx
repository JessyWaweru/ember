import { Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { CaloriesWidgetProps } from './types';

const CaloriesWidget = (props: CaloriesWidgetProps) => {
  'widget';
  const remaining = props.goal - props.eaten + props.burned;
  const over = remaining < 0;
  const used = Math.min(1, Math.max(0, props.eaten / Math.max(1, props.goal + props.burned)));
  return (
    <Column
      verticalArrangement="spaceBetween"
      modifiers={[fillMaxSize(), cornerRadius(24), background('#0B0B0D'), paddingAll(16)]}>
      <Text color="#9A9AA3" style={{ fontSize: 12, fontWeight: '600' }}>
        {over ? '🔥 Over by' : '🔥 Calories left'}
      </Text>
      <Text color={over ? '#EF4444' : '#F5F5F7'} style={{ fontSize: 34, fontWeight: '800' }}>
        {`${Math.abs(remaining)}`}
      </Text>
      <Text color="#9A9AA3" style={{ fontSize: 11 }}>{`${props.eaten} eaten · ${props.burned} burned`}</Text>
      <Spacer modifiers={[height(6)]} />
      <LinearProgressIndicator
        progress={used}
        color={over ? '#EF4444' : '#FF6B2C'}
        trackColor="#1F1F25"
        modifiers={[fillMaxWidth(), height(6)]}
      />
      <Spacer modifiers={[height(6)]} />
      <Row horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text color="#F25F5C" style={{ fontSize: 11, fontWeight: '600' }}>{`P ${Math.round(props.protein)}/${props.proteinGoal}g`}</Text>
        <Text color="#F2B33D" style={{ fontSize: 11, fontWeight: '600' }}>{`C ${Math.round(props.carbs)}/${props.carbsGoal}g`}</Text>
        <Text color="#4D9DE0" style={{ fontSize: 11, fontWeight: '600' }}>{`F ${Math.round(props.fat)}/${props.fatGoal}g`}</Text>
      </Row>
    </Column>
  );
};

export default createWidget('CaloriesWidget', CaloriesWidget, {
  eaten: 0, burned: 0, goal: 2000, protein: 0, carbs: 0, fat: 0, proteinGoal: 150, carbsGoal: 200, fatGoal: 65,
});
