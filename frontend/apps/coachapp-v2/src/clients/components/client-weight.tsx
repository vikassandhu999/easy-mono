/**
 * ClientWeight — read-only weight-review card for the client-detail page. Current
 * weight + change vs the client's optional goal, a trend chart, and recent entries.
 * Reads the coach weight endpoint (GET /v1/coach/clients/:id/weight_entries).
 */
import {formatIsoDateShort} from '@easy/utils';
import {Spinner, Typography} from '@heroui/react';

import SectionHeading from '@/@components/section-heading';
import {useListClientWeightEntriesQuery, type WeightEntry} from '@/api/generated';
import WeightChart from '@/clients/components/weight-chart';

type WeightGoal = {unit?: null | string; value?: null | number};

export default function ClientWeight({clientId}: {clientId: string}) {
  const {data, isLoading} = useListClientWeightEntriesQuery({clientId});

  const entries: WeightEntry[] = data?.entries ?? [];
  const byNewest = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = byNewest[0];
  const earliest = byNewest[byNewest.length - 1];
  const unit = latest?.unit ?? 'kg';
  const goal = (data?.goal ?? null) as WeightGoal | null;
  const change = latest && earliest && latest.id !== earliest.id ? latest.value - earliest.value : null;
  // colour the change by whether it moves toward the client's goal (if one is set)
  const towardGoal =
    goal?.value != null && latest && earliest
      ? Math.abs(latest.value - goal.value) < Math.abs(earliest.value - goal.value)
      : null;
  const changeColor = towardGoal == null ? 'text-muted' : towardGoal ? 'text-success' : 'text-warning';
  const goalDelta = goal?.value != null && latest ? Math.abs(latest.value - goal.value) : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <SectionHeading title="Weight" />

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : entries.length === 0 ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          No weight logged yet
        </Typography>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Typography type="h5">
                {latest?.value}
                <span className="ml-1 text-sm font-medium text-muted">{unit}</span>
              </Typography>
              {change != null && earliest ? (
                <Typography
                  className={`mt-0.5 ${changeColor}`}
                  type="body-xs"
                >
                  {change > 0 ? '▲' : change < 0 ? '▼' : '→'} {Math.abs(change).toFixed(1)} {unit} since{' '}
                  {formatIsoDateShort(earliest.date)}
                </Typography>
              ) : null}
            </div>
            {goal?.value != null ? (
              <div className="text-right">
                <Typography
                  className="text-[11px]"
                  color="muted"
                >
                  Goal
                </Typography>
                <Typography
                  type="body-sm"
                  weight="semibold"
                >
                  {goal.value} {goal.unit ?? unit}
                </Typography>
                {goalDelta != null ? (
                  <Typography
                    className="text-[11px]"
                    color="muted"
                  >
                    {goalDelta.toFixed(1)} to go
                  </Typography>
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

          <div className="mt-3 flex flex-col gap-1.5">
            {byNewest.slice(0, 5).map((e) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-secondary px-3 py-2"
                key={e.id}
              >
                <Typography
                  type="body-sm"
                  weight="semibold"
                >
                  {e.value} {e.unit}
                </Typography>
                <Typography
                  className="min-w-0 text-right"
                  color="muted"
                  truncate
                  type="body-xs"
                >
                  {formatIsoDateShort(e.date)}
                  {e.note ? ` · ${e.note}` : ''}
                </Typography>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
