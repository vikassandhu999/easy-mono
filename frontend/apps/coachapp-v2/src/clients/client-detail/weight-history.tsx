/**
 * WH — weight history (spec §6.7; design data-ref CD-WH-*). Trend chart with a
 * range toggle and goal line, plus every entry newest-first.
 * Style fidelity: manifests/CD-WH.json.
 */
import {ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {useGetClientQuery} from '@/api/clients';
import {useListClientWeightEntriesQuery} from '@/api/generated';
import {formatShortDate, isoDate, sparklinePoints} from '@/clients/client-detail/data';
import {CARD, EYEBROW, SubHeader} from '@/clients/client-detail/ui';

const RANGES = [
  {days: 30, id: '1M'},
  {days: 90, id: '3M'},
  {days: 180, id: '6M'},
  {days: null, id: 'All'},
] as const;

type RangeId = (typeof RANGES)[number]['id'];

/** `.seg` container + items — inactive muted, active white pill. */
const RANGE_ITEM =
  'min-h-0 rounded-chip border-0 bg-transparent px-2 py-1 text-eyebrow font-semibold text-muted [box-shadow:none] [column-gap:normal] [row-gap:normal] ' +
  'data-[selected=true]:bg-surface data-[selected=true]:font-bold data-[selected=true]:text-foreground ' +
  'sm:px-3 sm:py-1 sm:text-eyebrow';

export default function WeightHistory() {
  const {id} = useParams<{id: string}>();
  const isDesktop = useIsDesktop();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id!));
  const [range, setRange] = useState<RangeId>('3M');

  const {data: clientData} = useGetClientQuery(id!);
  const since = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days;
    if (!days) {
      return undefined;
    }
    const from = new Date();
    from.setDate(from.getDate() - days);
    return isoDate(from);
  }, [range]);

  const {data, isError, isLoading, refetch} = useListClientWeightEntriesQuery({clientId: id!, since});

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load weight."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const entries = [...(data?.entries ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const client = clientData?.data;
  const goal = client?.goal_weight_value == null ? null : Number(client.goal_weight_value);
  const unit = entries[0]?.unit ?? client?.goal_weight_unit ?? 'kg';
  const ascending = [...entries].reverse().map((entry) => Number(entry.value));
  const box = isDesktop ? {height: 220, width: 740} : {height: 150, width: 320};

  return (
    <Page className="bg-background text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="flex flex-col p-0"
      >
        <SubHeader
          onBack={goBack}
          subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
          title="Weight"
        />

        <div className="p-3 sm:px-8 sm:pt-6 sm:pb-8">
          <div
            className="flex flex-col gap-3 sm:max-w-195 sm:gap-4"
            data-testid="wh-root"
          >
            <div
              className={`${CARD} p-4 sm:px-5 sm:py-4`}
              data-testid="wh-chart"
            >
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <div
                  className={EYEBROW}
                  data-testid="wh-chart-eyebrow"
                >
                  Trend
                </div>
                <ToggleButtonGroup
                  className="flex rounded-control bg-surface-tertiary p-0.5 [column-gap:normal] [row-gap:normal]"
                  data-testid="wh-range"
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) {
                      setRange(next as RangeId);
                    }
                  }}
                  selectedKeys={[range]}
                  selectionMode="single"
                >
                  {RANGES.map((option) => (
                    <ToggleButton
                      className={RANGE_ITEM}
                      data-testid={option.id === range ? 'wh-range-on' : 'wh-range-off'}
                      id={option.id}
                      key={option.id}
                    >
                      {option.id}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
              {ascending.length > 1 ? (
                <div className="relative">
                  <svg
                    className="block h-37.5 w-full sm:h-55"
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${box.width} ${box.height}`}
                  >
                    {goal != null ? (
                      <line
                        opacity="0.5"
                        stroke="var(--color-muted)"
                        strokeDasharray="5 5"
                        strokeWidth="1"
                        x1="0"
                        x2={box.width}
                        y1={box.height * 0.82}
                        y2={box.height * 0.82}
                      />
                    ) : null}
                    <polyline
                      fill="none"
                      points={sparklinePoints(ascending, box.width, box.height)}
                      stroke="var(--color-accent)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                  {goal != null ? (
                    <span
                      className="absolute right-0.5 bottom-6 bg-surface px-1 text-eyebrow text-muted sm:bottom-7.5 sm:px-1 sm:text-eyebrow"
                      data-testid="wh-goal"
                    >
                      goal {goal}
                      {isDesktop ? ` ${unit}` : ''}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-eyebrow [color:var(--color-muted)] sm:text-eyebrow">
                  No weight logged yet. Weight arrives from check-ins or the client app.
                </span>
              )}
            </div>

            {entries.length > 0 ? (
              <div
                className={`${CARD} px-4 pt-1.5 pb-2 sm:px-4 sm:pt-2 sm:pb-3`}
                data-testid="wh-list"
              >
                <ul>
                  {entries.map((entry, index) => (
                    <li key={entry.id}>
                      {index > 0 ? (
                        <div
                          className="h-px bg-border"
                          data-testid="wh-row-sep"
                        />
                      ) : null}
                      <div
                        className="flex items-center gap-3 rounded-panel px-0.5 py-2 sm:px-2 sm:py-3"
                        data-testid="wh-row"
                      >
                        <div
                          className="w-15.5 flex-none text-eyebrow font-semibold text-muted sm:w-20 sm:text-eyebrow"
                          data-testid="wh-row-date"
                        >
                          {formatShortDate(entry.date)}
                        </div>
                        <span
                          className="flex-1 font-grotesk text-body font-bold sm:w-17.5 sm:flex-none sm:text-body"
                          data-testid="wh-row-value"
                        >
                          {Number(entry.value).toFixed(1)} {entry.unit}
                        </span>
                        <span
                          className="text-eyebrow text-muted sm:flex-1 sm:text-eyebrow"
                          data-testid="wh-row-source"
                        >
                          {entry.form_submission_id ? 'From check-in' : 'Client log'}
                        </span>
                        {entry.note ? <span className="sr-only">{entry.note}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
