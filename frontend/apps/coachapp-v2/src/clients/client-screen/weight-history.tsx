import {ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {useState} from 'react';
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListClientWeightEntriesQuery} from '@/api/clients';
import {SectionCard} from '@/clients/components/section-card';
import {formatRowDate, formatWeight, toDayIso, weightChartGeometry} from '@/clients/lib/client-detail-data';

const CHART_W = 740;
const CHART_H = 220;

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
  const {data, isError, isLoading, refetch} = useListClientWeightEntriesQuery(id);

  const header = (count?: number) => (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center">
        <BackButton onPress={goBack} />
        <div className="min-w-0">
          <Page.Title>Weight</Page.Title>
          {count != null && (
            <Page.Description>
              {count} {count === 1 ? 'entry' : 'entries'}
            </Page.Description>
          )}
        </div>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header()}
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
        {header()}
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

  // `goal` is a loosely-typed index-signature object on the wire; narrow the
  // one field this screen reads.
  const goal = (data.goal?.value as number | undefined) ?? null;
  const unit = data.entries[0]?.unit ?? 'kg';
  const cutoffDays = RANGES.find((r) => r.id === range)?.days ?? null;
  const cutoff = cutoffDays == null ? null : toDayIso(new Date(Date.now() - cutoffDays * 86_400_000));

  // Newest first for the list; oldest first for the line, which reads left to right.
  const inRange = data.entries.filter((e) => (cutoff == null ? true : e.date >= cutoff));
  const newestFirst = [...inRange].sort((a, b) => b.date.localeCompare(a.date));
  const chronological = [...inRange].sort((a, b) => a.date.localeCompare(b.date));
  const chart =
    chronological.length > 1
      ? weightChartGeometry(
          chronological.map((e) => Number(e.value)),
          goal,
          CHART_W,
          CHART_H,
        )
      : null;
  const lastPoint = chart?.points.split(' ').pop()?.split(',').map(Number);

  return (
    <Page>
      {header(data.entries.length)}
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-4 pt-4 pb-6"
          size="content"
        >
          <SectionCard
            action={
              <ToggleButtonGroup
                aria-label="Range"
                className="segmented w-auto"
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
            <div className="relative px-4 pb-4">
              {chart ? (
                <>
                  {/* An inline SVG rather than a chart dependency: one polyline, one
                      dashed goal rule, one point on the end. `weightChartGeometry`
                      puts the line and the goal on ONE scale, so a goal below every
                      logged value is still drawn in view. */}
                  <svg
                    aria-hidden
                    className="block h-55 w-full"
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                  >
                    {chart.goalY != null && (
                      <line
                        className="text-muted"
                        opacity="0.5"
                        stroke="currentColor"
                        strokeDasharray="5 5"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        x1="0"
                        x2={CHART_W}
                        y1={chart.goalY}
                        y2={chart.goalY}
                      />
                    )}
                    <polyline
                      className="text-accent"
                      fill="none"
                      points={chart.points}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* The design marks where the client is now. */}
                    {lastPoint && (
                      <circle
                        className="text-accent"
                        cx={lastPoint[0]}
                        cy={lastPoint[1]}
                        fill="currentColor"
                        r="5"
                      />
                    )}
                  </svg>
                  {goal != null && chart.goalY != null && (
                    <span
                      className="-translate-y-full absolute right-5 bg-surface px-1 type-eyebrow text-muted"
                      // The label sits ON the goal rule, as the design draws it — the
                      // only way to place it is the line's own y, so it is a measured
                      // position rather than a token.
                      style={{top: `${(chart.goalY / CHART_H) * 100}%`} /* ui-contract-allow */}
                    >
                      goal {formatWeight(goal, unit, {decimals: 0})}
                    </span>
                  )}
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
            </div>
          </SectionCard>

          <SectionCard divided>
            {newestFirst.map((entry) => (
              <div
                className="px-2"
                key={entry.id}
              >
                {/* The design's row is three columns — date, weight, where it came
                    from — with the source as plain muted TEXT, not a chip on the far
                    right: it is a fact about the row, not a status. */}
                <div className="flex w-full items-center gap-3 rounded-panel px-2 py-3">
                  <span className="w-20 shrink-0 type-eyebrow font-semibold text-muted">
                    {formatRowDate(entry.date, {weekday: false})}
                  </span>
                  <span className="w-18 shrink-0 font-grotesk type-body font-bold">
                    {formatWeight(entry.value, entry.unit)}
                  </span>
                  <span className="min-w-0 flex-1 type-eyebrow text-muted">
                    {/* A form_submission_id means it arrived with a check-in rather
                        than being logged in the client's app. */}
                    {entry.form_submission_id ? 'From check-in' : 'Client log'}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </span>
                </div>
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
