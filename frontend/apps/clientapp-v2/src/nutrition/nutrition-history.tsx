/**
 * Nutrition history (spec 03-history). Weekly adherence overview (on/under/over/no-log
 * rings) + a recent-days list. Tapping a day opens Today at that date. Rings and
 * recent-day totals come from the Nutrition Day summary, not from walking rows.
 */

import {formatDateISO} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {ArrowLeft, ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ErrorState from '@/@components/error-state';

import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type NutritionDay, useListClientNutritionDaysQuery} from '@/api/nutrition';
import {
  ADHERENCE_RING,
  ADHERENCE_TEXT,
  type Adherence,
  adherenceDisplay,
  calorieShare,
  kcalText,
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
function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {day: 'numeric', month: 'short'});
}

type DayStat = {
  adh: Adherence;
  calories: null | number;
  date: string;
  isFuture: boolean;
  isToday: boolean;
  protein: null | number;
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

  const {
    data: daysResp,
    isLoading,
    isError,
    refetch,
  } = useListClientNutritionDaysQuery({
    from: weekStart,
    to: weekEnd,
  });

  const byDate = new Map<string, NutritionDay>();
  for (const d of daysResp?.data ?? []) {
    byDate.set(d.date, d);
  }

  const days: DayStat[] = Array.from({length: 7}, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + i);
    const date = formatDateISO(d);
    const day = byDate.get(date) ?? null;
    return {
      adh: adherenceDisplay(day),
      calories: day?.summary.logged.calories ?? null,
      date,
      isFuture: date > today,
      isToday: date === today,
      protein: day?.summary.logged.protein ?? null,
      weekday: SHORT[i] ?? '',
    };
  });

  const recent = days
    .filter((d) => byDate.get(d.date)?.summary.has_intake)
    .sort((a, b) => b.date.localeCompare(a.date));

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
              const day = byDate.get(d.date);
              const target = day?.targets.calories ?? null;
              const pct = d.adh === 'unknown' ? null : calorieShare(d.calories, target);
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
                      background: `conic-gradient(${ADHERENCE_RING[d.adh]} 0% ${Math.min(100, pct ?? (d.adh === 'over' ? 100 : 0))}%, var(--border) 0)`,
                      color: ADHERENCE_TEXT[d.adh],
                      outline: d.isToday ? '2px solid var(--accent)' : undefined,
                      outlineOffset: d.isToday ? '1px' : undefined,
                    }}
                  >
                    {d.adh === 'none' || d.adh === 'unknown' ? '·' : (pct ?? '·')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            {(
              [
                ['on', 'on target'],
                ['under', 'under'],
                ['over', 'over'],
                ['none', 'no log'],
                ['unknown', 'unknown calories'],
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
              const day = byDate.get(d.date);
              const target = day?.targets.calories ?? null;
              const label =
                d.adh === 'on'
                  ? 'on target'
                  : d.adh === 'over'
                    ? 'over'
                    : d.adh === 'under'
                      ? 'under'
                      : d.adh === 'unknown'
                        ? 'unknown'
                        : 'logged';
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
                      {kcalText(d.calories)} / {target ?? '—'} kcal · {kcalText(d.protein)}P
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] ${
                      d.adh === 'on'
                        ? 'border-success text-success-secondary'
                        : d.adh === 'over' || d.adh === 'under'
                          ? 'border-warning text-warning'
                          : 'border-border text-muted'
                    }`}
                  >
                    {label}
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
