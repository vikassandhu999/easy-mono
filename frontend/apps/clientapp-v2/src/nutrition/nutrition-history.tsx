/**
 * Nutrition history (spec 03-history). Weekly adherence overview (on/under/over/no-log
 * rings) + a recent-days list. Tapping a day opens Today at that date. Reads meal-logs
 * over the week range and buckets each day on consumed-vs-target calories. Dark + periwinkle.
 */

import {formatDateISO} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {ArrowLeft, ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ErrorState from '@/@components/error-state';

import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type MealLog, useListClientMealLogsQuery, useListClientNutritionPlansQuery} from '@/api/nutrition';
import {
  ADHERENCE_RING,
  ADHERENCE_TEXT,
  type Adherence,
  adherence,
  dayTotals,
  planTargets,
} from '@/nutrition/nutrition-utils';

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return formatDateISO(d);
}
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}
// "Jun 13"
function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {day: 'numeric', month: 'short'});
}

type DayStat = {
  adh: Adherence;
  calories: number;
  date: string;
  isFuture: boolean;
  isToday: boolean;
  protein: number;
  weekday: string;
};

export default function NutritionHistory() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.NUTRITION);
  const today = formatDateISO(new Date());
  const thisWeek = mondayOf(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const weekEnd = shiftDate(weekStart, 6);
  const atCurrentWeek = weekStart >= thisWeek;
  const weekLabel = weekStart === thisWeek ? 'This week' : `Week of ${shortDate(weekStart)}`;

  const {data: logsResp, isLoading, isError, refetch} = useListClientMealLogsQuery({from: weekStart, to: weekEnd});
  const {data: plansResp} = useListClientNutritionPlansQuery({status: 'active'});
  const target = planTargets(plansResp?.data[0]).calories;

  const byDate = new Map<string, MealLog[]>();
  for (const ml of logsResp?.data ?? []) {
    byDate.set(ml.date, [...(byDate.get(ml.date) ?? []), ml]);
  }

  const days: DayStat[] = Array.from({length: 7}, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + i);
    const date = formatDateISO(d);
    const totals = dayTotals(byDate.get(date) ?? []);
    return {
      adh: adherence(totals.calories, target),
      calories: totals.calories,
      date,
      isFuture: date > today,
      isToday: date === today,
      protein: totals.protein,
      weekday: SHORT[i] ?? '',
    };
  });

  const recent = days.filter((d) => d.calories > 0).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <button
        aria-label="Back"
        className="mb-3 -ml-1 flex size-9 items-center justify-center rounded-lg text-muted active:bg-surface-secondary"
        onClick={goBack}
        type="button"
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="mb-3 text-lg font-bold">History</h1>

      {/* week navigator */}
      <div className="mb-3.5 flex items-center justify-between border-b border-border pb-3">
        <button
          aria-label="Previous week"
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary"
          onClick={() => setWeekStart(shiftDate(weekStart, -7))}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-bold">{weekLabel}</span>
        <button
          aria-label="Next week"
          className="grid size-8 place-items-center rounded-lg text-muted active:bg-surface-secondary disabled:opacity-30"
          disabled={atCurrentWeek}
          onClick={() => setWeekStart(shiftDate(weekStart, 7))}
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <ErrorState
          message="Couldn't load your history."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* week adherence strip */}
          <div className="mb-3.5 grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const pct = target ? Math.round((d.calories / target) * 100) : 0;
              return (
                <button
                  className="flex flex-col items-center gap-1"
                  disabled={d.isFuture}
                  key={d.date}
                  onClick={() => navigate(`${ROUTES.NUTRITION}?date=${d.date}`)}
                  type="button"
                >
                  <span className="text-[9px] text-muted">{d.weekday.charAt(0)}</span>
                  <span
                    className="grid size-[30px] place-items-center rounded-full text-[8px] font-bold"
                    style={{
                      background: `conic-gradient(${ADHERENCE_RING[d.adh]} 0% ${Math.min(100, pct || (d.adh === 'over' ? 100 : 0))}%, var(--border) 0)`,
                      color: ADHERENCE_TEXT[d.adh],
                      outline: d.isToday ? '2px solid var(--accent)' : undefined,
                      outlineOffset: d.isToday ? '1px' : undefined,
                    }}
                  >
                    {d.adh === 'none' ? '·' : pct}
                  </span>
                </button>
              );
            })}
          </div>

          {/* legend */}
          {/* Swatches come from the same palette the rings do, so the legend cannot drift from what it labels. */}
          <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            {(
              [
                ['on', 'on target'],
                ['under', 'under'],
                ['over', 'over'],
                ['none', 'no log'],
              ] as const
            ).map(([key, label]) => (
              <span key={key}>
                <span style={{color: ADHERENCE_RING[key]}}>●</span> {label}
              </span>
            ))}
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Recent days</p>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-muted">
              No logged days this week yet.
            </p>
          ) : (
            recent.map((d) => {
              const over = d.adh === 'over';
              const on = d.adh === 'on';
              return (
                <button
                  className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-secondary"
                  key={d.date}
                  onClick={() => navigate(`${ROUTES.NUTRITION}?date=${d.date}`)}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      {d.weekday} · {d.isToday ? 'Today' : shortDate(d.date)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {Math.round(d.calories)} / {target ?? '—'} kcal · {Math.round(d.protein)}P
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] ${
                      on ? 'border-success text-success-secondary' : 'border-warning text-warning'
                    }`}
                  >
                    {on ? 'on target' : over ? 'over' : 'under'}
                  </span>
                </button>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
