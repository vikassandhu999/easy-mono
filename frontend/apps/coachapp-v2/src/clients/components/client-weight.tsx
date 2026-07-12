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
  if (range === 'days') {
    return parseIsoDateToDate(key).toLocaleDateString('en-US', {weekday: 'narrow'});
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

  const limit = range === 'days' ? 7 : range === 'weeks' ? 8 : 6;
  return [...buckets.entries()].slice(-limit).map(([key, entry], index) => ({
    id: `${range}-${key}-${entry.id}`,
    label: range === 'weeks' ? `Wk ${index + 1}` : bucketLabel(key, range),
    unit: entry.unit,
    value: entry.value,
  }));
}

function StatBox({
  label,
  mobileLabel,
  tone,
  unit,
  value,
}: {
  label: string;
  mobileLabel?: string;
  value: string;
  tone?: 'success';
  unit?: string;
}) {
  return (
    <div className="rounded-[14px] border border-separator bg-surface p-3 lg:rounded-[16px] lg:border-[1.5px] lg:p-4">
      <Typography
        className="text-[10.5px] leading-[normal] font-semibold lg:text-[11.5px]"
        color="muted"
      >
        {mobileLabel ? <span className="lg:hidden">{mobileLabel}</span> : null}
        <span className={mobileLabel ? 'hidden lg:inline' : undefined}>{label}</span>
      </Typography>
      <div
        className={`mt-1 text-xl leading-[normal] font-bold [font-family:var(--font-grotesk)] lg:mt-1.5 lg:text-[26px] ${tone === 'success' ? 'text-success-soft-foreground' : ''}`}
      >
        {value}
        {unit ? (
          <span className={`ml-1 text-[11px] font-semibold lg:text-sm ${tone === 'success' ? '' : 'text-muted'}`}>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ClientWeight({clientId}: {clientId: string}) {
  const [range, setRange] = useState<Range>('weeks');
  const {data, isError, isLoading} = useListClientWeightEntriesQuery({clientId});

  const entries: WeightEntry[] = (data?.entries ?? []).map((entry) => ({...entry, value: Number(entry.value)}));
  const byNewest = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.inserted_at.localeCompare(a.inserted_at)),
    [entries],
  );
  const latest = byNewest[0];
  const earliest = byNewest[byNewest.length - 1];
  const unit = latest?.unit ?? earliest?.unit ?? 'kg';
  const totalLost = latest && earliest ? earliest.value - latest.value : null;
  const points = useMemo(() => bucketEntries(entries, range), [entries, range]);
  const rangeLabel =
    range === 'days'
      ? 'this week'
      : range === 'weeks'
        ? `last ${points.length} weeks`
        : points.length > 1
          ? `${points[0]?.label} – ${points[points.length - 1]?.label}`
          : 'monthly';
  const elapsedDays =
    latest && earliest
      ? Math.max(
          1,
          Math.round(
            (parseIsoDateToDate(latest.date).getTime() - parseIsoDateToDate(earliest.date).getTime()) / 86_400_000,
          ),
        )
      : 0;
  const elapsedLabel =
    elapsedDays >= 60 ? `${Math.round(elapsedDays / 30)} months in` : `${Math.ceil(elapsedDays / 7)} weeks in`;

  return (
    <section>
      <div className="mb-5 hidden lg:block">
        <h2 className="text-xl font-bold [font-family:var(--font-grotesk)]">Progress report</h2>
        <Typography
          className="mt-1"
          color="muted"
          type="body-sm"
        >
          {earliest ? `Since ${formatIsoDateShort(earliest.date)} · ${elapsedLabel}` : 'Weight trend'}
        </Typography>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <Skeleton className="h-24 rounded-[16px]" />
            <Skeleton className="h-24 rounded-[16px]" />
          </div>
          <Skeleton className="h-72 rounded-[18px]" />
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
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <StatBox
              label="Current weight"
              mobileLabel="Current"
              unit={unit}
              value={formatNumber(latest?.value)}
            />
            <StatBox
              label="Total lost"
              tone={totalLost != null && totalLost > 0 ? 'success' : undefined}
              unit={unit}
              value={
                totalLost == null
                  ? '—'
                  : `${totalLost > 0 ? '−' : totalLost < 0 ? '+' : ''}${formatNumber(Math.abs(totalLost))}`
              }
            />
          </div>

          <div className="mt-[14px] rounded-[16px] border border-separator bg-surface p-4 lg:mt-[22px] lg:rounded-[18px] lg:border-[1.5px] lg:p-5">
            <div className="flex flex-col gap-[10px] sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div>
                <Typography
                  className="text-[13px] leading-[normal] lg:text-[13.5px]"
                  weight="bold"
                >
                  Weight reduction
                </Typography>
                <Typography
                  className="mt-0.5 text-[11px] leading-[normal] lg:text-[11.5px]"
                  color="muted"
                >
                  {earliest && latest
                    ? `${formatNumber(earliest.value)} → ${formatNumber(latest.value)} ${unit} · ${rangeLabel}`
                    : rangeLabel}
                </Typography>
              </div>
              <ToggleButtonGroup
                aria-label="Weight chart range"
                className="flex w-full gap-0 rounded-[9px] bg-surface-secondary p-[3px] sm:w-auto"
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
                    className="h-[30px] min-h-[30px] flex-1 rounded-[7px]! px-3 text-xs font-bold data-[selected=true]:bg-segment! data-[selected=true]:text-segment-foreground! data-[selected=true]:shadow-sm sm:flex-none"
                    id={option.id}
                    key={option.id}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>

            <div className="mt-4 lg:mt-3">
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
