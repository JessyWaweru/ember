import { Gauge, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  gaugeStyle,
  lineLimit,
  monospacedDigit,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { HabitsWidgetProps } from './types';

const HabitsWidget = (props: HabitsWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const rows = env.widgetFamily === 'systemLarge' ? 8 : env.widgetFamily === 'systemMedium' ? 4 : 3;
  const allDone = props.total > 0 && props.done === props.total;
  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[containerBackground('#0B0B0D', 'widget'), widgetURL('ember://habits')]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#9A9AA3')]}>✨ Habits</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'bold' }), monospacedDigit(), foregroundStyle(allDone ? '#22C55E' : '#F5F5F7')]}>
          {`${props.done}/${props.total}`}
        </Text>
      </HStack>
      <Gauge
        value={props.total ? props.done / props.total : 0}
        min={0}
        max={1}
        modifiers={[gaugeStyle('linearCapacity'), tint('#A78BFA')]}>
        <Text>{''}</Text>
      </Gauge>
      {props.total === 0 ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#9A9AA3')]}>Nothing scheduled today</Text>
      ) : null}
      {props.items.slice(0, rows).map((h) => (
        <HStack key={h.name} spacing={6}>
          <Text modifiers={[font({ size: 13 })]}>{h.done ? '✅' : h.emoji}</Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(h.done ? '#5E5E66' : '#F5F5F7'), lineLimit(1)]}>
            {h.name}
          </Text>
          <Spacer />
          {h.streak > 0 ? (
            <Text modifiers={[font({ size: 11, weight: 'bold' }), monospacedDigit(), foregroundStyle('#FF6B2C')]}>{`${h.streak}🔥`}</Text>
          ) : null}
        </HStack>
      ))}
      <Spacer />
    </VStack>
  );
};

export default createWidget('HabitsWidget', HabitsWidget, { done: 0, total: 0, items: [] });
