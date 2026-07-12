/**
 * Progress — weight tracking. Current weight + trend (native SVG chart) vs an optional
 * goal, a log-weight sheet, and a recent-entries list. No mockup; follows the
 * dark + periwinkle patterns from Training/Nutrition. (Photos deferred — no photo API.)
 */
import {Button, Spinner} from '@heroui/react';
import {ArrowLeft, Plus, Trash2, TrendingUp} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {asGoal, useDeleteWeightEntryMutation, useListWeightEntriesQuery, type WeightEntry} from '@/api/progress';
import LogWeightSheet from '@/progress/components/log-weight-sheet';
import WeightChart from '@/progress/components/weight-chart';

function fmtDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {day: 'numeric', month: 'short'});
}

function LogButton({onPress, label}: {label: string; onPress: () => void}) {
  return (
    <button
      className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-opacity active:opacity-90"
      onClick={onPress}
      type="button"
    >
      <Plus size={16} />
      {label}
    </button>
  );
}

export default function ProgressHome() {
  const navigate = useNavigate();
  const {data, isLoading, isError, refetch} = useListWeightEntriesQuery({});
  const [deleteEntry] = useDeleteWeightEntryMutation();
  const [sheet, setSheet] = useState(false);

  const entries: WeightEntry[] = data?.entries ?? [];
  // newest first for the summary + list
  const byNewest = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = byNewest[0];
  const earliest = byNewest[byNewest.length - 1];
  const goal = asGoal(data?.goal);
  const unit = latest?.unit ?? 'kg';
  const change = latest && earliest && latest.id !== earliest.id ? latest.value - earliest.value : null;
  const goalDelta = goal?.value != null && latest ? latest.value - goal.value : null;

  const remove = async (id: string) => {
    try {
      await deleteEntry({id}).unwrap();
    } catch {
      // surfaced by RTK Query
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Progress">
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Progress">
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted">Couldn't load your progress.</p>
          <button
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:opacity-90"
            onClick={() => refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      action={
        <Button
          aria-label="Back"
          isIconOnly
          onPress={() => navigate(-1)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={18} />
        </Button>
      }
      title="Progress"
    >
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent/10">
            <TrendingUp
              className="text-accent"
              size={24}
            />
          </div>
          <h3 className="text-base font-medium">Start tracking your weight</h3>
          <p className="mt-1.5 text-sm text-muted">Log regularly to see how you're progressing.</p>
          <div className="mt-4 flex justify-center">
            <LogButton
              label="Log first weight"
              onPress={() => setSheet(true)}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Current</p>
                <p className="text-3xl font-bold leading-tight">
                  {latest?.value}
                  <span className="ml-1 text-base font-medium text-muted">{unit}</span>
                </p>
                {change != null && earliest ? (
                  <p className={`mt-0.5 text-xs ${change <= 0 ? 'text-success-secondary' : 'text-warning'}`}>
                    {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)} {unit} since {fmtDate(earliest.date)}
                  </p>
                ) : null}
              </div>
              {goal?.value != null ? (
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Goal</p>
                  <p className="text-lg font-bold text-success-secondary">
                    {goal.value}
                    <span className="ml-1 text-xs font-medium text-muted">{goal.unit ?? unit}</span>
                  </p>
                  {goalDelta != null ? (
                    <p className="mt-0.5 text-[11px] text-muted">{Math.abs(goalDelta).toFixed(1)} to go</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {entries.length >= 2 ? (
              <div className="mt-3">
                <WeightChart
                  entries={entries}
                  goal={goal?.value ?? null}
                />
              </div>
            ) : null}
          </div>

          <div className="mb-3 flex justify-end">
            <LogButton
              label="Log weight"
              onPress={() => setSheet(true)}
            />
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">History</p>
          {byNewest.map((e) => (
            <div
              className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
              key={e.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {e.value} {e.unit}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {fmtDate(e.date)}
                  {e.note ? ` · ${e.note}` : ''}
                </p>
              </div>
              <button
                aria-label="Delete entry"
                className="shrink-0 rounded-lg p-1.5 text-muted active:bg-surface-secondary"
                onClick={() => remove(e.id)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </>
      )}

      {sheet ? (
        <LogWeightSheet
          defaultUnit={unit}
          defaultValue={latest?.value}
          onClose={() => setSheet(false)}
        />
      ) : null}
    </PageLayout>
  );
}
