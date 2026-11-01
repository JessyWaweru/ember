import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, monospacedDigit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { ExerciseWidgetProps } from './types';

const ExerciseWidget = (props: ExerciseWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const medium = env.widgetFamily === 'systemMedium';
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[containerBackground('#0B0B0D', 'widget'), widgetURL('ember://train')]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#9A9AA3')]}>💪 Training</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(props.rankColor)]}>
          {`${props.rankEmoji} ${props.rankTitle}`}
        </Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 32, weight: 'heavy', design: 'rounded' }), monospacedDigit(), foregroundStyle('#22C55E')]}>
        {`${props.burnedToday}`}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#9A9AA3')]}>kcal burned today</Text>
      <Spacer />
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#F5F5F7')]}>
        {`${props.sessionsToday} today · ${props.sessionsThisWeek} this week`}
      </Text>
      {medium && props.topExercise ? (
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#9A9AA3'), lineLimit(1)]}>{`Top: ${props.topExercise}`}</Text>
      ) : null}
    </VStack>
  );
};

export default createWidget('ExerciseWidget', ExerciseWidget, {
  burnedToday: 0, sessionsToday: 0, sessionsThisWeek: 0, rankTitle: 'Unranked', rankColor: '#8B8B93', rankEmoji: '🪵', topExercise: '',
});
