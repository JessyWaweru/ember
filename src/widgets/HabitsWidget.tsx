// Web / typecheck fallback. Metro picks HabitsWidget.ios.tsx or HabitsWidget.android.tsx on device.
import type { HabitsWidgetProps } from './types';

const noop = () => {};

export default {
  updateSnapshot: (_props: HabitsWidgetProps) => noop(),
  updateTimeline: (_entries: { date: Date; props: HabitsWidgetProps }[]) => noop(),
  reload: noop,
};
