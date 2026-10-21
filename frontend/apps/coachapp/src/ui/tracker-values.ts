import type {Tracker} from '../api/trackers';
export function defaultTrackerUnit(tracker: Tracker, system: 'metric' | 'imperial') {
  if (system === 'imperial' && tracker.built_in) {
    const imperial = tracker.units.find((option) => ['lb', 'in', 'fl_oz'].includes(option.unit));
    if (imperial) {
      return imperial.unit;
    }
  }
  return tracker.units[0]?.unit ?? tracker.base_unit ?? '';
}

export function trackerDisplayValue(value: number | null, tracker: Tracker, unit: string) {
  if (value === null) {
    return 'Not recorded';
  }
  const factor = tracker.units.find((option) => option.unit === unit)?.to_base_factor ?? 1;
  return new Intl.NumberFormat(undefined, {maximumFractionDigits: 2}).format(value / factor);
}
