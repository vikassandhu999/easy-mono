import type {AssignmentWrite} from '../api/trackers';
import {SelectItem} from './select';
import {SelectField} from './select-field';

export const trackerTimings = [
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['after_workout', 'After each workout'],
  ['after_meal', 'After each meal'],
] as const;
export const trackerWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function TrackerTiming({
  timing,
  weekday,
  onChange,
}: {
  timing: AssignmentWrite['timing'];
  weekday: number;
  onChange: (timing: AssignmentWrite['timing'], weekday: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-medium">Timing</p>
        <SelectField
          aria-label="Timing"
          value={timing}
          onChange={(value) => onChange(value as AssignmentWrite['timing'], weekday)}
        >
          {trackerTimings.map(([value, label]) => (
            <SelectItem
              key={value}
              id={value}
            >
              {label}
            </SelectItem>
          ))}
        </SelectField>
      </div>
      {timing === 'weekly' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Weekday</p>
          <SelectField
            aria-label="Weekday"
            value={weekday}
            onChange={(value) => onChange(timing, Number(value))}
          >
            {trackerWeekdays.map((day, index) => (
              <SelectItem
                key={day}
                id={String(index)}
              >
                {day}
              </SelectItem>
            ))}
          </SelectField>
        </div>
      )}
    </div>
  );
}
