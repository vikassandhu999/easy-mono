import {formatDateISO} from '@easy/utils';
import {useMemo} from 'react';

import type {MealLog} from '@/api/mealLogs';

import {useListMyMealLogsQuery} from '@/api/mealLogs';

// ── Helpers ──────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(referenceDate: Date): string[] {
  const jsDay = referenceDate.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateISO(d));
  }
  return dates;
}

type DotLevel = 'future' | 'high' | 'low' | 'medium' | 'none';

function getDotLevel(dateStr: string, todayStr: string, logsForDay: MealLog[]): DotLevel {
  if (dateStr > todayStr) return 'future';
  if (logsForDay.length === 0) return 'none';

  let loggedCal = 0;
  let plannedCal = 0;
  for (const ml of logsForDay) {
    loggedCal += ml.logged_calories ?? 0;
    plannedCal += ml.planned_snapshot?.total_calories ?? 0;
  }

  if (plannedCal <= 0) return loggedCal > 0 ? 'high' : 'none';

  const percent = (loggedCal / plannedCal) * 100;
  if (percent >= 80) return 'high';
  if (percent >= 50) return 'medium';
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
  const {data: weekData} = useListMyMealLogsQuery();
  const allLogs: MealLog[] = useMemo(() => weekData?.data ?? [], [weekData]);

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
    if (level === 'future') return;
    onSelectDate(new Date(dateStr + 'T00:00:00'));
  };

  return (
    <div className="rounded-xl bg-default px-3 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-400">This week</p>
      <div className="flex justify-between gap-1">
        {days.map((day) => (
          <button
            className="flex flex-1 flex-col items-center gap-0.5"
            disabled={day.level === 'future'}
            key={day.dateStr}
            onClick={() => handleTap(day.dateStr, day.level)}
            type="button"
          >
            <p className="text-[10px] text-foreground-400">{day.label}</p>
            <div
              className={`flex size-7 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${day.style.bg} ${
                day.isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
              } ${day.level !== 'future' ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {day.style.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
