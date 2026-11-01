import { Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { ExerciseWidgetProps } from './types';

const ExerciseWidget = (props: ExerciseWidgetProps) => {
  'widget';
  return (
    <Column
      verticalArrangement="spaceBetween"
      modifiers={[fillMaxSize(), cornerRadius(24), background('#0B0B0D'), paddingAll(16)]}>
      <Row horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text color="#9A9AA3" style={{ fontSize: 12, fontWeight: '600' }}>💪 Training</Text>
        <Text color={props.rankColor} style={{ fontSize: 12, fontWeight: '700' }}>{`${props.rankEmoji} ${props.rankTitle}`}</Text>
      </Row>
      <Text color="#22C55E" style={{ fontSize: 34, fontWeight: '800' }}>{`${props.burnedToday}`}</Text>
      <Text color="#9A9AA3" style={{ fontSize: 11 }}>kcal burned today</Text>
      <Text color="#F5F5F7" style={{ fontSize: 11, fontWeight: '600' }}>
        {`${props.sessionsToday} today · ${props.sessionsThisWeek} this week`}
      </Text>
      {props.topExercise ? (
        <Text color="#9A9AA3" maxLines={1} style={{ fontSize: 11 }}>{`Top: ${props.topExercise}`}</Text>
      ) : null}
    </Column>
  );
};

export default createWidget('ExerciseWidget', ExerciseWidget, {
  burnedToday: 0, sessionsToday: 0, sessionsThisWeek: 0, rankTitle: 'Unranked', rankColor: '#8B8B93', rankEmoji: '🪵', topExercise: '',
});
