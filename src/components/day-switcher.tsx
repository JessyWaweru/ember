import { addDays, prettyDay, todayKey } from '@/lib/dates';

import { IconButton, Row, Txt } from './ui';

export function DaySwitcher({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const isToday = date === todayKey();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <IconButton icon="chevronLeft" onPress={() => onChange(addDays(date, -1))} />
      <Txt variant="heading" onPress={() => onChange(todayKey())}>{prettyDay(date)}</Txt>
      <IconButton icon="chevronRight" onPress={() => !isToday && onChange(addDays(date, 1))} color={isToday ? '#444' : undefined} />
    </Row>
  );
}
