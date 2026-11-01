import { Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { HabitsWidgetProps } from './types';

const HabitsWidget = (props: HabitsWidgetProps) => {
  'widget';
  const allDone = props.total > 0 && props.done === props.total;
  return (
    <Column modifiers={[fillMaxSize(), cornerRadius(24), background('#0B0B0D'), paddingAll(16)]}>
      <Row horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text color="#9A9AA3" style={{ fontSize: 12, fontWeight: '600' }}>✨ Habits</Text>
        <Text color={allDone ? '#22C55E' : '#F5F5F7'} style={{ fontSize: 12, fontWeight: '700' }}>{`${props.done}/${props.total}`}</Text>
      </Row>
      <Spacer modifiers={[height(8)]} />
      <LinearProgressIndicator
        progress={props.total ? props.done / props.total : 0}
        color="#A78BFA"
        trackColor="#1F1F25"
        modifiers={[fillMaxWidth(), height(6)]}
      />
      <Spacer modifiers={[height(8)]} />
      {props.total === 0 ? <Text color="#9A9AA3" style={{ fontSize: 12 }}>Nothing scheduled today</Text> : null}
      {props.items.slice(0, 4).map((h) => (
        <Row key={h.name} horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
          <Text color={h.done ? '#5E5E66' : '#F5F5F7'} maxLines={1} style={{ fontSize: 13, fontWeight: '500' }}>
            {`${h.done ? '✅' : h.emoji}  ${h.name}`}
          </Text>
          {h.streak > 0 ? <Text color="#FF6B2C" style={{ fontSize: 11, fontWeight: '700' }}>{`${h.streak}🔥`}</Text> : null}
        </Row>
      ))}
    </Column>
  );
};

export default createWidget('HabitsWidget', HabitsWidget, { done: 0, total: 0, items: [] });
