// Web / typecheck fallback. Metro picks CaloriesWidget.ios.tsx or CaloriesWidget.android.tsx on device.
import type { CaloriesWidgetProps } from './types';

const noop = () => {};

export default {
  updateSnapshot: (_props: CaloriesWidgetProps) => noop(),
  updateTimeline: (_entries: { date: Date; props: CaloriesWidgetProps }[]) => noop(),
  reload: noop,
};
