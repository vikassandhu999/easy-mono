import {formatWeekday, getCurrentWeekRange, getDateForWeekdayIndex} from '@easy/utils';
import {Button, Spinner} from '@heroui/react';
import {useMemo, useState} from 'react';
import SectionHeading from '@/@components/section-heading';
import {useListCoachClientNutritionPlansQuery, useListCoachMealLogsQuery} from '@/api/generated';
import ClientNutritionDetail from '@/clients/components/client-nutrition-detail';
import {
  ADHERENCE_STYLES,
  type AdherenceLevel,
  buildRecentNutritionDaySubtitle,
  computeDailyNutritionSummaries,
  getAdherenceLevel,
  getDayPercent,
  getPlannedDailyCalories,
  resolveNutritionMacrosGoal,
} from '@/domain/client-nutrition';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Bar fill per adherence level (height encodes the day's %). */
const BAR_BG: Record<AdherenceLevel, string> = {
  high: 'bg-success',
  medium: 'bg-warning',
  low: 'bg-danger',
  none: 'bg-default',
  future: 'bg-default',
};

export default function ClientNutritionAdherence({clientId}: {clientId: string}) {
  const {from, to} = useMemo(() => getCurrentWeekRange(), []);
  // No backend summary route — fetch the meal log list and aggregate client-side.
  const {data: logsData, isLoading} = useListCoachMealLogsQuery({clientId, from, to});
  const {data: plansData} = useListCoachClientNutritionPlansQuery({clientId});
  const [selectedDate, setSelectedDate] = useState<null | string>(null);

  const summaries = useMemo(() => computeDailyNutritionSummaries(logsData?.data ?? []), [logsData]);

  const macrosGoal = useMemo(() => resolveNutritionMacrosGoal({plans: plansData?.data}), [plansData]);

  const plannedCalories = useMemo(() => getPlannedDailyCalories(macrosGoal), [macrosGoal]);

  // Build per-day data
  const days = useMemo(() => {
    return WEEKDAYS.map((label, index) => {
      const dateStr = getDateForWeekdayIndex(index);
      const summary = summaries.find((s) => s.date === dateStr);
      const level = getAdherenceLevel(summary, dateStr, plannedCalories);
      const style = ADHERENCE_STYLES[level];
      const percent = getDayPercent(summary, plannedCalories);

      return {dateStr, label, level, percent, style, summary};
    });
  }, [summaries, plannedCalories]);

  // Weekly average across logged days (the big headline %).
  const weekAvg = useMemo(() => {
    const percents = days.map((d) => d.percent).filter((p): p is number => p != null);
    if (percents.length === 0) {
      return null;
    }
    return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
  }, [days]);

  const handleDayTap = (dateStr: string, level: AdherenceLevel) => {
    if (level === 'future') {
      return;
    }
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <SectionHeading title="Nutrition" />

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-end justify-between">
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-semibold">{weekAvg == null ? '\u2014' : weekAvg}</span>
              {weekAvg != null ? <span className="text-base text-muted">%</span> : null}
            </div>
            <span className="text-xs text-muted">this week</span>
          </div>

          {/* Weekly bar chart \u2014 bars are flex-1 so they fit any width; height = day %. */}
          <div className="flex items-end gap-1.5">
            {days.map((day) => {
              const height = day.percent != null ? Math.max(8, Math.min(100, day.percent)) : 6;
              const isSelected = selectedDate === day.dateStr;
              return (
                <button
                  className="flex flex-1 flex-col items-center gap-1.5"
                  disabled={day.level === 'future'}
                  key={day.dateStr}
                  onClick={() => handleDayTap(day.dateStr, day.level)}
                  type="button"
                >
                  <span className="flex h-16 w-full items-end">
                    <span
                      className={`w-full rounded-md transition-all ${BAR_BG[day.level]} ${
                        isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
                      }`}
                      style={{height: `${height}%`}}
                    />
                  </span>
                  <span className="text-[10px] text-muted">{day.label.charAt(0)}</span>
                </button>
              );
            })}
          </div>

          {!selectedDate && summaries.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Recent days</p>
              {[...summaries]
                .filter((s) => s.total_entries > 0)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((summary) => {
                  return (
                    <Button
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover"
                      key={summary.date}
                      onPress={() => setSelectedDate(summary.date)}
                      variant="ghost"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {formatWeekday(summary.date)}
                          <span className="ml-1 font-normal text-muted">
                            {Math.round(summary.logged_calories)}
                            {summary.planned_calories > 0 ? ` / ${Math.round(summary.planned_calories)} cal` : ' cal'}
                          </span>
                        </p>
                        <p className="text-xs text-muted">{buildRecentNutritionDaySubtitle(summary)}</p>
                      </div>
                    </Button>
                  );
                })}
            </div>
          ) : null}

          {selectedDate ? (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <ClientNutritionDetail
                clientId={clientId}
                date={selectedDate}
                onBack={() => setSelectedDate(null)}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
