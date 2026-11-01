import { Gauge, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  monospacedDigit,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CaloriesWidgetProps } from './types';

const CaloriesWidget = (props: CaloriesWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const remaining = props.goal - props.eaten + props.burned;
  const over = remaining < 0;
  const used = Math.min(1, Math.max(0, props.eaten / Math.max(1, props.goal + props.burned)));
  const macro = (label: string, value: number, goal: number, color: string) => (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(color)]}>{label}</Text>
      <Text modifiers={[font({ size: 13, weight: 'bold' }), monospacedDigit(), foregroundStyle('#F5F5F7')]}>
        {`${Math.round(value)}/${goal}g`}
      </Text>
    </VStack>
  );

  const ring = (
    <Gauge value={used} min={0} max={1} modifiers={[gaugeStyle('circularCapacity'), tint(over ? '#EF4444' : '#FF6B2C')]}>
      <Text>{''}</Text>
    </Gauge>
  );

  if (env.widgetFamily === 'systemMedium') {
    return (
      <HStack
        spacing={16}
        modifiers={[containerBackground('#0B0B0D', 'widget'), widgetURL('ember://'), padding({ all: 4 })]}>
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#9A9AA3')]}>
            {over ? '🔥 Over by' : '🔥 Remaining'}
          </Text>
          <Text modifiers={[font({ size: 34, weight: 'heavy', design: 'rounded' }), monospacedDigit(), foregroundStyle(over ? '#EF4444' : '#F5F5F7')]}>
            {`${Math.abs(remaining)}`}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#9A9AA3')]}>
            {`${props.eaten} eaten · ${props.burned} burned`}
          </Text>
          <Spacer />
          <HStack spacing={12}>
            {macro('Protein', props.protein, props.proteinGoal, '#F25F5C')}
            {macro('Carbs', props.carbs, props.carbsGoal, '#F2B33D')}
            {macro('Fat', props.fat, props.fatGoal, '#4D9DE0')}
          </HStack>
        </VStack>
        <Spacer />
        <VStack modifiers={[frame({ width: 70, height: 70 })]}>{ring}</VStack>
      </HStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[containerBackground('#0B0B0D', 'widget'), widgetURL('ember://')]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#9A9AA3')]}>🔥 Calories</Text>
        <Spacer />
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 32, weight: 'heavy', design: 'rounded' }), monospacedDigit(), foregroundStyle(over ? '#EF4444' : '#F5F5F7')]}>
        {`${Math.abs(remaining)}`}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#9A9AA3')]}>{over ? 'kcal over' : 'kcal left'}</Text>
      <Spacer />
      <Gauge value={used} min={0} max={1} modifiers={[gaugeStyle('linearCapacity'), tint(over ? '#EF4444' : '#FF6B2C')]}>
        <Text>{''}</Text>
      </Gauge>
    </VStack>
  );
};

export default createWidget('CaloriesWidget', CaloriesWidget, {
  eaten: 0, burned: 0, goal: 2000, protein: 0, carbs: 0, fat: 0, proteinGoal: 150, carbsGoal: 200, fatGoal: 65,
});
