import {formatDateISO, getWeekDates, isFutureDate, toLocalDate} from '@easy/utils';
import {Button} from '@heroui/react';
import {useMemo} from 'react';

import {type MealLog, useListClientMealLogsQuery} from '@/api/generated';

// ── Helpers ──────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type DotLevel = 'future' | 'high' | 'low' | 'medium' | 'none';

function getDotLevel(dateStr: string, todayStr: string, logsForDay: MealLog[]): DotLevel {
  if (isFutureDate(dateStr, todayStr)) {
    return 'future';
  }
  if (logsForDay.length === 0) {
    return 'none';
  }

  let loggedCal = 0;
  let plannedCal = 0;
  for (const ml of logsForDay) {
    loggedCal += ml.logged_calories ?? 0;
    plannedCal += ml.planned_snapshot?.total_calories ?? 0;
  }

  if (plannedCal <= 0) {
    return loggedCal > 0 ? 'high' : 'none';
  }

  const percent = (loggedCal / plannedCal) * 100;
  if (percent >= 80) {
    return 'high';
  }
  if (percent >= 50) {
    return 'medium';
  }
  return 'low';
}

const DOT_STYLES: Record<DotLevel, {bg: string; icon: string}> = {
  future: {bg: 'bg-default-200', icon: '\u2014'},
  high: {bg: 'bg-success/20', icon: '\u2713'},
  low: {bg: 'bg-danger/20', icon: '\u25CB'},
  medium: {bg: 'bg-warning/20', icon: '\u25D0'},
  none: {bg: 'bg-default-200', icon: '\u25CB'},
};

// ── Component ───────────────────────────────────────────────

export default function WeeklySummaryStrip({
  onSelectDate,
  selectedDate,
}: {
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}) {
  const todayStr = formatDateISO(new Date());
  const selectedStr = formatDateISO(selectedDate);
  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Fetch all logs — client-side filter by date. The client endpoint may not support from/to range.
  const {data: weekData} = useListClientMealLogsQuery({});
  const allLogs = useMemo(() => weekData?.data ?? [], [weekData]);

  const days = useMemo(() => {
    return dates.map((dateStr, index) => {
      const logsForDay = allLogs.filter((ml) => ml.date === dateStr);
      const level = getDotLevel(dateStr, todayStr, logsForDay);
      const style = DOT_STYLES[level];
      const isSelected = dateStr === selectedStr;

      return {dateStr, isSelected, label: WEEKDAY_LABELS[index], level, style};
    });
  }, [dates, allLogs, todayStr, selectedStr]);

  const handleTap = (dateStr: string, level: DotLevel) => {
    if (level === 'future') {
      return;
    }
    onSelectDate(toLocalDate(dateStr));
  };

  return (
    <div className="rounded-xl bg-default px-3 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">This week</p>
      <div className="flex justify-between gap-1">
        {days.map((day) => (
          <Button
            className="flex h-auto flex-1 flex-col items-center gap-0.5 p-0"
            isDisabled={day.level === 'future'}
            key={day.dateStr}
            onPress={() => handleTap(day.dateStr, day.level)}
            variant="ghost"
          >
            <p className="text-[10px] text-muted">{day.label}</p>
            <div
              className={`flex size-7 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${day.style.bg} ${
                day.isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
              } ${day.level !== 'future' ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {day.style.icon}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
