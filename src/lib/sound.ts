// Native: sounds are web-only for now (see sound.web.ts); haptics carry the feedback on iOS/Android.
// Same API, so callers don't need platform checks.

const noop = () => {};

export const sound = {
  enabled: false,
  setEnabled: noop as (on: boolean) => void,
  tap: noop,
  tick: noop,
  complete: noop,
  undo: noop,
  slip: noop,
  success: noop,
  remove: noop,
  rankUp: noop,
  fire: noop as (flareS: number, burnS: number) => void,
};
