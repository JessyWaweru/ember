import { View } from 'react-native';

import { C } from '@/constants/theme';
import type { TIERS } from '@/lib/tiers';

import { Txt } from './ui';

/** Hexagon-ish medal: tier emoji on a ring of the tier colour. */
export function RankBadge({ tier, size = 56, division }: { tier: (typeof TIERS)[number]; size?: number; division?: string | null }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          transform: [{ rotate: '45deg' }],
          borderWidth: Math.max(2, size / 18),
          borderColor: tier.color,
          backgroundColor: C.cardHigh,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: tier.color,
          shadowOpacity: 0.5,
          shadowRadius: size / 6,
          shadowOffset: { width: 0, height: 0 },
        }}>
        <Txt style={{ fontSize: size * 0.42, transform: [{ rotate: '-45deg' }] }}>{tier.emoji}</Txt>
      </View>
      {division ? (
        <View
          style={{
            marginTop: -size * 0.12,
            backgroundColor: tier.color,
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}>
          <Txt style={{ fontSize: Math.max(10, size * 0.18), fontWeight: '900', color: '#0B0B0D' }}>{division}</Txt>
        </View>
      ) : null}
    </View>
  );
}
