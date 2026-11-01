// Web / typecheck fallback. Metro picks ExerciseWidget.ios.tsx or ExerciseWidget.android.tsx on device.
import type { ExerciseWidgetProps } from './types';

const noop = () => {};

export default {
  updateSnapshot: (_props: ExerciseWidgetProps) => noop(),
  updateTimeline: (_entries: { date: Date; props: ExerciseWidgetProps }[]) => noop(),
  reload: noop,
};
