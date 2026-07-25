import {Chip, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {useState} from 'react';
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientWeightEntriesQuery} from '@/api/generated';
import {DetailRow} from '@/clients/components/detail-row';
import {SectionCard} from '@/clients/components/section-card';
import {formatRowDate, formatWeight, sparklinePoints, toDayIso} from '@/clients/lib/client-detail-data';

/** CD-WH — the trend, a range filter, and every entry. */
const RANGES = [
  {days: 30, id: '1M', label: '1M'},
  {days: 90, id: '3M', label: '3M'},
  {days: 180, id: '6M', label: '6M'},
  {days: null, id: 'All', label: 'All'},
] as const;

type RangeId = (typeof RANGES)[number]['id'];

export default function WeightHistory() {
  const {id = ''} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id));
  const [range, setRange] = useState<RangeId>('3M');
  const {data, isError, isLoading, refetch} = useListClientWeightEntriesQuery({clientId: id});

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <Page.Title>Weight</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load weight entries."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const goal = data.goal?.value ?? null;
  const unit = data.entries[0]?.unit ?? 'kg';
  const cutoffDays = RANGES.find((r) => r.id === range)?.days ?? null;
  const cutoff = cutoffDays == null ? null : toDayIso(new Date(Date.now() - cutoffDays * 86_400_000));

  // Newest first for the list; oldest first for the line, which reads left to right.
  const inRange = data.entries.filter((e) => (cutoff == null ? true : e.date >= cutoff));
  const newestFirst = [...inRange].sort((a, b) => b.date.localeCompare(a.date));
  const chronological = [...inRange].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Page>
      {header}
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-4 pt-4 pb-6"
          size="content"
        >
          <SectionCard
            action={
              <ToggleButtonGroup
                aria-label="Range"
                className="flex gap-1"
                disallowEmptySelection
                onSelectionChange={(keys) => {
                  const next = [...keys][0];
                  if (next) {
                    setRange(next as RangeId);
                  }
                }}
                selectedKeys={[range]}
                selectionMode="single"
              >
                {RANGES.map((r) => (
                  <ToggleButton
                    className="toggle-button--tab"
                    id={r.id}
                    key={r.id}
                    size="sm"
                  >
                    {r.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            }
            title="Trend"
          >
            <div className="px-4 pb-4">
              {chronological.length > 1 ? (
                <>
                  {/* An inline SVG rather than a chart dependency: this is one
                      polyline over at most a few dozen points. */}
                  <svg
                    aria-hidden
                    className="h-24 w-full overflow-visible text-accent"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 40"
                  >
                    <polyline
                      fill="none"
                      points={sparklinePoints(
                        chronological.map((e) => Number(e.value)),
                        100,
                        40,
                      )}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className="sr-only">
                    {chronological.length} entries from {formatRowDate(chronological[0]!.date, {weekday: false})} to{' '}
                    {formatRowDate(chronological[chronological.length - 1]!.date, {weekday: false})}
                  </span>
                </>
              ) : (
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Not enough entries in this range to draw a trend.
                </Typography>
              )}
              {goal != null && (
                <Typography
                  className="mt-2"
                  color="muted"
                  type="body-xs"
                >
                  goal {formatWeight(goal, unit, {decimals: 0})}
                </Typography>
              )}
            </div>
          </SectionCard>

          <SectionCard divided>
            {newestFirst.map((entry) => (
              <div
                className="px-2"
                key={entry.id}
              >
                <DetailRow
                  leading={formatRowDate(entry.date, {weekday: false})}
                  meta={entry.note ?? undefined}
                  title={formatWeight(entry.value, entry.unit)}
                  trailing={
                    <Chip
                      className="chip--outline"
                      size="sm"
                    >
                      {/* A form_submission_id means it arrived with a check-in
                          rather than being logged in the client's app. */}
                      {entry.form_submission_id ? 'From check-in' : 'Client log'}
                    </Chip>
                  }
                />
              </div>
            ))}
            {newestFirst.length === 0 && (
              <div className="p-6 text-center">
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  No entries in this range.
                </Typography>
              </div>
            )}
          </SectionCard>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
