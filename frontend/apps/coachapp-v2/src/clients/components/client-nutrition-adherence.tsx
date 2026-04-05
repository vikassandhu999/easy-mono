import {Separator, Spinner} from '@heroui/react';
import {useMemo, useState} from 'react';

import type {DailyMacroSummary} from '@/api/foodLogs';
import type {Macros} from '@/api/shared';

import {useGetCoachFoodLogSummaryQuery} from '@/api/foodLogs';
import {useListNutritionPlansQuery} from '@/api/nutritionPlans';
import ClientNutritionDetail from '@/clients/components/client-nutrition-detail';

// ── Helpers ──────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Format a Date as YYYY-MM-DD in local time (not UTC). */
function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekRange(): {from: string; to: string} {
  const now = new Date();
  const jsDay = now.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {from: fmtLocal(monday), to: fmtLocal(sunday)};
}

function getDateForWeekday(weekdayIndex: number): string {
  const {from} = getWeekRange();
  const monday = new Date(from + 'T00:00:00');
  const d = new Date(monday);
  d.setDate(monday.getDate() + weekdayIndex);
  return fmtLocal(d);
}

function isFutureDate(dateStr: string): boolean {
  const today = fmtLocal(new Date());
  return dateStr > today;
}

type AdherenceLevel = 'future' | 'high' | 'low' | 'medium' | 'none';

function getAdherenceLevel(
  summary: DailyMacroSummary | undefined,
  dateStr: string,
  plannedCalories: number,
): AdherenceLevel {
  if (isFutureDate(dateStr)) return 'future';
  if (!summary || summary.total_entries === 0) return 'none';
  if (plannedCalories <= 0) return summary.total_entries > 0 ? 'high' : 'none';

  const percent = (summary.totals.calories / plannedCalories) * 100;
  if (percent >= 80) return 'high';
  if (percent >= 50) return 'medium';
  return 'low';
}

const ADHERENCE_STYLES: Record<AdherenceLevel, {bg: string; icon: string}> = {
  future: {bg: 'bg-default', icon: '\u2014'},
  high: {bg: 'bg-success/20', icon: '\u2713'},
  low: {bg: 'bg-danger/20', icon: '\u25CB'},
  medium: {bg: 'bg-warning/20', icon: '\u25D0'},
  none: {bg: 'bg-default', icon: '\u25CB'},
};

// ── Component ───────────────────────────────────────────────

export default function ClientNutritionAdherence({
  clientId,
  macrosGoal: macrosGoalProp,
}: {
  clientId: string;
  macrosGoal?: Macros | null;
}) {
  const {from, to} = useMemo(() => getWeekRange(), []);
  const {data, isLoading} = useGetCoachFoodLogSummaryQuery({client_id: clientId, from, to});
  const {data: plansData} = useListNutritionPlansQuery({client_id: clientId});
  const [selectedDate, setSelectedDate] = useState<null | string>(null);

  const summaries = useMemo(() => data?.data ?? [], [data]);

  // Resolve macros goal: prefer prop, fall back to active plan's macros_goal
  const macrosGoal = useMemo(() => {
    if (macrosGoalProp) return macrosGoalProp;
    const activePlan = plansData?.data.find((p) => p.status === 'active');
    return activePlan?.macros_goal ?? null;
  }, [macrosGoalProp, plansData]);

  // Get planned daily calories from macros goal.
  // The macros_goal on a plan stores the daily target, keyed as 'calories'.
  // Do NOT fall back to 'calories_per_100g' — that's a per-100g value, not a daily goal.
  const plannedCalories = useMemo(() => {
    if (!macrosGoal) return 0;
    return Number(macrosGoal.calories ?? 0);
  }, [macrosGoal]);

  // Build per-day data
  const days = useMemo(() => {
    return WEEKDAYS.map((label, index) => {
      const dateStr = getDateForWeekday(index);
      const summary = summaries.find((s) => s.date === dateStr);
      const level = getAdherenceLevel(summary, dateStr, plannedCalories);
      const style = ADHERENCE_STYLES[level];
      const percent =
        summary && plannedCalories > 0 ? Math.round((summary.totals.calories / plannedCalories) * 100) : null;

      return {dateStr, label, level, percent, style, summary};
    });
  }, [summaries, plannedCalories]);

  const handleDayTap = (dateStr: string, level: AdherenceLevel) => {
    if (level === 'future') return;
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  return (
    <section className="py-4">
      <Separator className="mb-4" />
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Nutrition Adherence</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <>
          {/* Weekly strip */}
          <div className="flex justify-between gap-1">
            {days.map((day) => (
              <button
                className="flex flex-1 flex-col items-center gap-1"
                disabled={day.level === 'future'}
                key={day.label}
                onClick={() => handleDayTap(day.dateStr, day.level)}
                type="button"
              >
                <p className="text-[10px] text-foreground-400">{day.label}</p>
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${day.style.bg} ${
                    selectedDate === day.dateStr ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
                  } ${day.level !== 'future' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {day.style.icon}
                </div>
                {day.percent != null ? (
                  <p className="text-[10px] text-foreground-400">{day.percent}%</p>
                ) : (
                  <p className="text-[10px] text-foreground-400">&nbsp;</p>
                )}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-foreground-400">
            <span>{'\u2713'} &ge;80%</span>
            <span>{'\u25D0'} 50-80%</span>
            <span>{'\u25CB'} &lt;50%</span>
            <span>{'\u2014'} future</span>
          </div>

          {/* Drill-down: daily detail */}
          {selectedDate ? (
            <div className="mt-4 rounded-xl border border-divider bg-content1 p-4">
              <ClientNutritionDetail
                clientId={clientId}
                date={selectedDate}
                onBack={() => setSelectedDate(null)}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
