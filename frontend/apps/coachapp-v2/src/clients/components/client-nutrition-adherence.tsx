import {formatWeekday} from '@easy/utils';
import {Button, Separator, Spinner} from '@heroui/react';
import {useMemo, useState} from 'react';

import {useGetCoachMealLogSummaryQuery} from '@/api/mealLogs';
import {useListClientNutritionPlansQuery} from '@/api/nutritionPlans';
import type {Macros} from '@/api/shared';
import ClientNutritionDetail from '@/clients/components/client-nutrition-detail';
import {
  ADHERENCE_STYLES,
  buildRecentNutritionDaySubtitle,
  getAdherenceLevel,
  getCurrentWeekRange,
  getDateForWeekdayIndex,
  getDayPercent,
  getPlannedDailyCalories,
  resolveNutritionMacrosGoal,
  type AdherenceLevel,
} from '@/domain/client-nutrition';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ClientNutritionAdherence({
  clientId,
  macrosGoal: macrosGoalProp,
}: {
  clientId: string;
  macrosGoal?: Macros | null;
}) {
  const {from, to} = useMemo(() => getCurrentWeekRange(), []);
  const {data, isLoading} = useGetCoachMealLogSummaryQuery({client_id: clientId, from, to});
  const {data: plansData} = useListClientNutritionPlansQuery({clientId});
  const [selectedDate, setSelectedDate] = useState<null | string>(null);

  const summaries = useMemo(() => data?.data ?? [], [data]);

  const macrosGoal = useMemo(
    () => resolveNutritionMacrosGoal({fallback: macrosGoalProp, plans: plansData?.data}),
    [macrosGoalProp, plansData],
  );

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

  const handleDayTap = (dateStr: string, level: AdherenceLevel) => {
    if (level === 'future') {
      return;
    }
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  return (
    <section className="py-4">
      <Separator className="mb-4" />
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Nutrition</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <>
          <div className="flex justify-between gap-1">
            {days.map((day) => (
              <Button
                className="flex flex-1 flex-col items-center gap-1"
                isDisabled={day.level === 'future'}
                key={day.dateStr}
                onPress={() => handleDayTap(day.dateStr, day.level)}
                variant="ghost"
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
              </Button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-foreground-400">
            <span>{'\u2713'} &ge;80%</span>
            <span>{'\u25D0'} 50-80%</span>
            <span>{'\u25CB'} &lt;50%</span>
            <span>{'\u2014'} future</span>
          </div>

          {!selectedDate && summaries.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-400">Recent days</p>
              {[...summaries]
                .filter((s) => s.total_entries > 0)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((summary) => {
                  return (
                    <Button
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-divider px-3 py-2 text-left transition-colors hover:bg-content2 active:bg-content2"
                      key={summary.date}
                      onPress={() => setSelectedDate(summary.date)}
                      variant="ghost"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {formatWeekday(summary.date)}
                          <span className="ml-1 font-normal text-foreground-400">
                            {Math.round(summary.logged_calories)}
                            {summary.planned_calories > 0 ? ` / ${Math.round(summary.planned_calories)} cal` : ' cal'}
                          </span>
                        </p>
                        <p className="text-xs text-foreground-400">{buildRecentNutritionDaySubtitle(summary)}</p>
                      </div>
                    </Button>
                  );
                })}
            </div>
          ) : null}

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
