import {Chip, Typography} from '@heroui/react';
import {Check, Dumbbell, Minus, Quote} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {EmptyState} from '@/@components/empty-state';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {TrainingPerformedSet} from '@/api/generated';
import {useGetCoachClientTrainingSessionQuery} from '@/api/generated';
import {SectionCard} from '@/clients/components/section-card';
import {formatCompactDuration, formatRowDate} from '@/clients/lib/client-detail-data';
import {buildExerciseGroups, type ExerciseGroup, formatLoad} from '@/clients/lib/session';

/**
 * CD-SD — one performed session: the client's note first (it is why a coach opens
 * this screen), then a card per exercise with its set grid.
 *
 * On `Page` + `BackButton` rather than the deleted `SubHeader`. That invention was
 * the thing that let Client Detail drift away from every other screen — the
 * design's `.mtopbar` IS `Page.Header`.
 */
export default function SessionDetail() {
  const {clientId = '', sessionId = ''} = useParams<{clientId: string; sessionId: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', clientId)}?tab=training`);
  const {data, isError, isLoading, refetch} = useGetCoachClientTrainingSessionQuery({clientId, id: sessionId});

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <Page.Title>Workout</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
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
      <Page>
        {header}
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
  const subtitle = [session.date ? formatRowDate(session.date) : null, duration].filter(Boolean).join(' · ');

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <div className="min-w-0">
            <Page.Title>Workout</Page.Title>
            {subtitle && <Page.Description>{subtitle}</Page.Description>}
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          {session.state === 'completed' && (
            <Chip
              color="success"
              size="sm"
              variant="soft"
            >
              Completed
            </Chip>
          )}
          {session.soreness_rating != null && (
            <Chip
              size="sm"
              variant="tertiary"
            >
              Soreness {session.soreness_rating}/5
            </Chip>
          )}
        </Page.Actions>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
          {session.notes && (
            <div className="flex gap-3 rounded-panel bg-accent-soft p-4">
              <Quote className="mt-0.5 shrink-0 text-accent" />
              <Typography type="body-sm">{session.notes}</Typography>
            </div>
          )}

          {groups.map((group) => (
            <ExerciseCard
              group={group}
              key={group.exerciseId}
            />
          ))}

          {groups.length === 0 && (
            <SectionCard>
              <EmptyState
                body="No sets were logged in this session."
                icon={Dumbbell}
                title="Nothing logged"
              />
            </SectionCard>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/** Set · Reps · Load · RPE · done — one grid template shared by header and rows. */
const GRID = 'grid grid-cols-[52px_1fr_76px_40px_22px] gap-2 sm:grid-cols-[64px_1fr_92px_60px_26px]';

function ExerciseCard({group}: {group: ExerciseGroup}) {
  const done = group.sets.filter((set) => set.completed).length;
  const total = group.sets.length || group.plannedSets.length;

  return (
    <SectionCard title={`${group.exerciseName} (${done}/${total} sets)`}>
      <div className="px-4 pb-4">
        <div className={`${GRID} border-b border-border pb-2`}>
          <span className="eyebrow">Set</span>
          <span className="eyebrow">Reps</span>
          <span className="eyebrow">Load</span>
          <span className="eyebrow">RPE</span>
          <span />
        </div>
        {group.sets.map((set, index) => (
          <div
            className={`${GRID} items-center border-b border-border py-2 last:border-0 type-eyebrow`}
            key={set.id}
          >
            <span className="flex items-center gap-1.5">
              <b>{index + 1}</b>
              {setTypeLabel(set) && (
                <Chip
                  size="sm"
                  variant="tertiary"
                >
                  {setTypeLabel(set)}
                </Chip>
              )}
            </span>
            <span>{set.reps ?? '—'}</span>
            <span>{formatLoad(set.load_value, set.load_unit) || '—'}</span>
            <span>{set.rpe ?? '—'}</span>
            {set.completed ? <Check className="text-success" /> : <Minus className="text-muted" />}
          </div>
        ))}
        {group.sets.length === 0 && <div className="py-2 type-eyebrow text-muted">Not logged.</div>}
      </div>
    </SectionCard>
  );
}

function setTypeLabel(set: TrainingPerformedSet): null | string {
  if (set.set_type === 'warmup') {
    return 'Warm-up';
  }
  return set.set_type === 'dropset' ? 'Drop set' : null;
}
