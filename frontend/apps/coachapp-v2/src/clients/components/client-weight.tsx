/**
 * Progress report card. Reads the coach weight endpoint and renders current
 * weight, total change, and a day/week/month bucketed reduction chart.
 */
import {formatIsoDateShort, parseIsoDateToDate} from '@easy/utils';
import {Skeleton, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {useMemo, useState} from 'react';

import {useListClientWeightEntriesQuery} from '@/api/clients';
import type {WeightEntry} from '@/api/generated';
import WeightChart, {type WeightChartPoint} from '@/clients/components/weight-chart';
import {formatNumber} from '@/clients/lib/client-detail-metrics';

type Range = 'days' | 'months' | 'weeks';

const RANGE_LABEL: Record<Range, string> = {
  days: 'Daily',
  months: 'Monthly',
  weeks: 'Weekly',
};

const RANGE_OPTIONS: {id: Range; label: string}[] = [
  {id: 'days', label: 'Days'},
  {id: 'weeks', label: 'Weeks'},
  {id: 'months', label: 'Months'},
];

function bucketKey(entry: WeightEntry, range: Range): string {
  const date = parseIsoDateToDate(entry.date);
  if (range === 'months') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  if (range === 'weeks') {
    const day = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + 1);
    return monday.toISOString().slice(0, 10);
  }
  return entry.date;
}

function bucketLabel(key: string, range: Range): string {
  if (range === 'months') {
    return formatIsoDateShort(`${key}-01`, undefined, {day: undefined});
  }
  return formatIsoDateShort(key);
}

function bucketEntries(entries: WeightEntry[], range: Range): WeightChartPoint[] {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.inserted_at.localeCompare(b.inserted_at),
  );
  const buckets = new Map<string, WeightEntry>();
  for (const entry of sorted) {
    buckets.set(bucketKey(entry, range), entry);
  }

  return [...buckets.entries()]
    .map(([key, entry]) => ({
      id: `${range}-${key}-${entry.id}`,
      label: bucketLabel(key, range),
      unit: entry.unit,
      value: entry.value,
    }))
    .slice(-7);
}

function StatBox({label, tone, unit, value}: {label: string; value: string; tone?: 'success'; unit?: string}) {
  return (
    <div className="rounded-3xl border-[1.5px] border-separator bg-surface p-4">
      <Typography
        className="text-[11px] font-semibold"
        color="muted"
      >
        {label}
      </Typography>
      <div className={`mt-1 font-grotesk text-2xl font-bold ${tone === 'success' ? 'text-success' : ''}`}>
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}

export default function ClientWeight({clientId}: {clientId: string}) {
  const [range, setRange] = useState<Range>('weeks');
  const {data, isError, isLoading} = useListClientWeightEntriesQuery({clientId});

  const entries: WeightEntry[] = data?.entries ?? [];
  const byNewest = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.inserted_at.localeCompare(a.inserted_at)),
    [entries],
  );
  const latest = byNewest[0];
  const earliest = byNewest[byNewest.length - 1];
  const unit = latest?.unit ?? earliest?.unit ?? 'kg';
  const totalLost = latest && earliest ? earliest.value - latest.value : null;
  const points = useMemo(() => bucketEntries(entries, range), [entries, range]);

  return (
    <section className="rounded-3xl border-[1.5px] border-separator bg-surface p-5">
      <div className="mb-5">
        <h2 className="font-grotesk text-xl font-bold">Progress report</h2>
        <Typography
          className="mt-1"
          color="muted"
          type="body-sm"
        >
          {earliest ? `Since ${formatIsoDateShort(earliest.date)} · ${RANGE_LABEL[range]} view` : 'Weight trend'}
        </Typography>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load weight entries.
        </Typography>
      ) : entries.length === 0 ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          No weight logged yet.
        </Typography>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatBox
              label="Current weight"
              unit={unit}
              value={formatNumber(latest?.value)}
            />
            <StatBox
              label="Total lost"
              tone={totalLost != null && totalLost > 0 ? 'success' : undefined}
              unit={unit}
              value={totalLost == null ? '—' : formatNumber(totalLost)}
            />
          </div>

          <div className="mt-5 rounded-3xl border-[1.5px] border-separator bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Typography
                  type="body-sm"
                  weight="semibold"
                >
                  Weight reduction
                </Typography>
                <Typography
                  className="mt-0.5"
                  color="muted"
                  type="body-xs"
                >
                  {earliest && latest
                    ? `${formatNumber(earliest.value)} -> ${formatNumber(latest.value)} ${unit} · ${RANGE_LABEL[range]}`
                    : RANGE_LABEL[range]}
                </Typography>
              </div>
              <ToggleButtonGroup
                aria-label="Weight chart range"
                className="flex flex-wrap gap-1 rounded-xl bg-surface-secondary p-1"
                isDetached
                onSelectionChange={(keys) => {
                  const next = [...keys][0];
                  if (next) {
                    setRange(next as Range);
                  }
                }}
                selectedKeys={[range]}
                selectionMode="single"
                size="sm"
              >
                {RANGE_OPTIONS.map((option) => (
                  <ToggleButton
                    className="min-h-9 px-3 text-xs font-bold"
                    id={option.id}
                    key={option.id}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>

            <div className="mt-3">
              {points.length >= 2 ? (
                <WeightChart points={points} />
              ) : (
                <Typography
                  className="py-10"
                  color="muted"
                  type="body-sm"
                >
                  Add another entry to show the trend.
                </Typography>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
