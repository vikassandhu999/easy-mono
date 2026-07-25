/**
 * SD — session detail (spec §4.3; design data-ref CD-SD-*). The client's note
 * first (it's the reason coaches open this screen), then one card per exercise
 * with its set grid. Style fidelity: manifests/CD-SD.json.
 */
import {Chip} from '@heroui/react';
import {Check, Minus, Quote} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {TrainingPerformedSet} from '@/api/generated';
import {useGetCoachClientTrainingSessionQuery} from '@/api/generated';
import {formatCompactDuration, formatRowDate} from '@/clients/client-detail/data';
import {CARD, CHIP, SubHeader} from '@/clients/client-detail/ui';
import {buildExerciseGroups, type ExerciseGroup, formatLoad} from '@/clients/lib/session';

/** Set · Reps · Load · RPE · done — one grid template for header and rows. */
const GRID = 'grid grid-cols-[52px_1fr_76px_40px_22px] gap-2 sm:grid-cols-[64px_1fr_92px_60px_26px]';
const SET_CHIP = `${CHIP} border border-border bg-transparent px-1.5 py-0.5 type-eyebrow font-semibold [color:var(--color-muted)]`;

function setTypeLabel(set: TrainingPerformedSet): null | string {
  if (set.set_type === 'warmup') {
    return 'Warm-up';
  }
  return set.set_type === 'dropset' ? 'Drop set' : null;
}

function SetRow({index, isFirstCard, set}: {index: number; isFirstCard: boolean; set: TrainingPerformedSet}) {
  const chip = setTypeLabel(set);
  const testId = (name: string) => (isFirstCard && index === 0 ? `sd-${name}` : undefined);

  return (
    <div
      className={`${GRID} items-center py-2 type-eyebrow`}
      data-testid={testId('set-row')}
    >
      <span
        className="flex items-center gap-1.5"
        data-testid={testId('set-num')}
      >
        <b>{index + 1}</b>
        {chip ? <Chip className={SET_CHIP}>{chip}</Chip> : null}
      </span>
      <span>{set.reps ?? '—'}</span>
      <span>{formatLoad(set.load_value, set.load_unit) || '—'}</span>
      <span>{set.rpe ?? '—'}</span>
      {set.completed ? <Check className="text-success" /> : <Minus className="text-muted" />}
    </div>
  );
}

function ExerciseCard({group, isFirst}: {group: ExerciseGroup; isFirst: boolean}) {
  const done = group.sets.filter((set) => set.completed).length;
  const total = group.sets.length || group.plannedSets.length;

  return (
    <div
      className={`${CARD} px-4 py-3 sm:px-4 sm:py-4`}
      data-testid={isFirst ? 'sd-exercise' : undefined}
    >
      <div
        className="mb-2 type-body font-bold sm:mb-3"
        data-testid={isFirst ? 'sd-exercise-title' : undefined}
      >
        {group.exerciseName}{' '}
        <span className="font-medium text-muted">
          ({done}/{total} sets)
        </span>
      </div>
      <div
        className={`${GRID} border-b border-border pb-2 type-eyebrow font-semibold text-muted`}
        data-testid={isFirst ? 'sd-head-row' : undefined}
      >
        <span data-testid={isFirst ? 'sd-head-cell' : undefined}>Set</span>
        <span>Reps</span>
        <span>Load</span>
        <span>RPE</span>
        <span />
      </div>
      {group.sets.map((set, index) => (
        <div key={set.id}>
          {index > 0 ? (
            <div
              className="h-px bg-border"
              data-testid={isFirst && index === 1 ? 'sd-set-sep' : undefined}
            />
          ) : null}
          <SetRow
            index={index}
            isFirstCard={isFirst}
            set={set}
          />
        </div>
      ))}
      {group.sets.length === 0 ? <div className="py-2 type-eyebrow text-muted">Not logged.</div> : null}
    </div>
  );
}

export default function SessionDetail() {
  const {clientId, sessionId} = useParams<{clientId: string; sessionId: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', clientId!)}?tab=training`);
  const {data, isError, isLoading, refetch} = useGetCoachClientTrainingSessionQuery({
    clientId: clientId!,
    id: sessionId!,
  });

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
  if (isError || !data) {
    return (
      <Page className="bg-background">
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load this session."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const session = data.data;
  const groups = buildExerciseGroups(session);
  const duration = formatCompactDuration(session.started_at, session.ended_at);
  const subtitle = [session.date ? formatRowDate(session.date, {withMonth: true}) : null, duration]
    .filter(Boolean)
    .join(' · ');

  return (
    <Page className="bg-background text-foreground [line-height:normal]">
      <Page.Content
        bare
        className="flex flex-col p-0"
      >
        <SubHeader
          onBack={goBack}
          right={
            <>
              {session.state === 'completed' ? (
                <Chip className={`${CHIP} bg-success-soft [color:var(--color-success-soft-foreground)]`}>
                  Completed
                </Chip>
              ) : null}
              {session.soreness_rating != null ? (
                <Chip className={`${CHIP} border border-border bg-transparent [color:var(--color-muted)]`}>
                  Soreness {session.soreness_rating}/5
                </Chip>
              ) : null}
            </>
          }
          subtitle={subtitle}
          title="Workout"
        />

        <div className="p-3 sm:px-8 sm:pt-6 sm:pb-8">
          <div
            className="flex flex-col gap-3 sm:max-w-195 sm:gap-4"
            data-testid="sd-root"
          >
            {session.notes ? (
              <div className="flex gap-2 rounded-panel bg-accent-soft px-3 py-3 sm:gap-3 sm:px-4">
                <Quote className="mt-0.5 flex-none text-accent sm:size-5" />
                <div className="type-eyebrow leading-normal sm:type-body">{session.notes}</div>
              </div>
            ) : null}

            {groups.map((group, index) => (
              <ExerciseCard
                group={group}
                isFirst={index === 0}
                key={group.exerciseId}
              />
            ))}

            {groups.length === 0 ? (
              <div className={`${CARD} px-3 py-6 text-center sm:px-4`}>
                <span className="type-eyebrow [color:var(--color-muted)]">No sets were logged in this session.</span>
              </div>
            ) : null}
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
