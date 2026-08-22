import {Chip, Typography} from '@heroui/react';
import {Check, Dumbbell, Quote} from 'lucide-react';
import type {TrainingPerformedSet} from '@/api/training-plans';
import {useGetCoachClientTrainingSessionQuery} from '@/api/training-plans';
import {formatCompactDuration, formatRowDate} from '@/clients/client-detail-data';
import {SectionCard} from '@/clients/client-section-card';
import {buildExerciseGroups, type ExerciseGroup, formatLoad, sessionWorkoutName} from '@/clients/client-session';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {EmptyState} from '@/ui/empty-state';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

/**
 * CD-SD — one performed session: the client's note first (it is why a coach opens
 * this screen), then a card per exercise with its set grid.
 *
 * On `Page` + `BackButton` rather than the deleted `SubHeader`. That invention was
 * the thing that let Client Detail drift away from every other screen — the
 * design's `.mtopbar` IS `Page.Header`.
 */
export default function SessionDetail() {
  const clientId = useRouteParam('clientId');
  const sessionId = useRouteParam('sessionId');
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', clientId)}?tab=training`);
  const {data, isError, isLoading, refetch} = useGetCoachClientTrainingSessionQuery(clientId, sessionId);

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center">
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
  const duration = formatCompactDuration(session.started_at, session.closed_at);
  const subtitle = [session.date ? formatRowDate(session.date) : null, duration].filter(Boolean).join(' · ');

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup className="flex items-center">
          <BackButton onPress={goBack} />
          <div className="min-w-0">
            <Page.Title>{sessionWorkoutName(session)}</Page.Title>
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
              className="chip--outline"
              size="sm"
            >
              Soreness {session.soreness_rating}/5
            </Chip>
          )}
        </Page.Actions>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-4 pt-4 pb-6"
          size="content"
        >
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
/**
 * Set · Reps · Load · RPE · done — one template shared by header and rows, so the
 * columns line up across separately-rendered grids.
 *
 * The set column is 88px from `sm`, not the design's 64px. The design fits a
 * set-type chip into 64px by dropping the chip to `font-size:9.5px`, which is below
 * the scale's smallest step — and the theme wins on type (UI-CONTRACT §3), so the
 * COLUMN gives way instead of the type. At `--type-eyebrow` the cell measures 74px,
 * which overflowed 64px and painted over the reps value. `1fr` on reps absorbs it.
 *
 * Mobile stays 52px because the design omits the chip there entirely.
 */
const GRID = 'grid grid-cols-[52px_1fr_76px_40px_22px] gap-2 sm:grid-cols-[88px_1fr_92px_60px_26px]';

const COL_HEAD = 'type-eyebrow font-semibold text-muted';

function ExerciseCard({group}: {group: ExerciseGroup}) {
  const done = group.sets.length;
  const total = group.sets.length || group.plannedSets.length;

  return (
    <SectionCard
      title={
        <>
          {group.exerciseName}{' '}
          <span className="font-medium text-muted">
            ({done}/{total} sets)
          </span>
        </>
      }
      titleAs="heading"
    >
      <div className="px-4 pb-4">
        <div className={`${GRID} border-b border-border pb-2`}>
          {/* Plain muted labels, not `.eyebrow`: the design writes these at 11px/600
              with no uppercase and no tracking (dc.html SD header row). */}
          <span className={COL_HEAD}>Set</span>
          <span className={COL_HEAD}>Reps</span>
          <span className={COL_HEAD}>Load</span>
          <span className={COL_HEAD}>RPE</span>
          <span />
        </div>
        {group.sets.map((set, index) => (
          <div
            className={`${GRID} items-center border-b border-border py-2 last:border-0 type-eyebrow`}
            key={set.id}
          >
            <span className="flex items-center gap-1.5">
              <b>{index + 1}</b>
              {/* The set column is 52px on mobile and 64px on desktop, and the
                  design's answer to that differs by width: mobile omits the
                  set-type entirely (dc.html 743 is just `<b>1</b><span>12</span>`),
                  desktop keeps it but shrinks the chip hard (`padding:1px 6px;
                  font-size:9.5px`) to fit beside the number.

                  So: hidden below `sm`, and tight padding above it. 9.5px is below
                  the scale's smallest step, so it renders at `--type-eyebrow` (11px)
                  with `px-1` — which measures ~62px against the 64px column. A
                  full-size chip overflowed into the reps column and painted over the
                  value. */}
              {setTypeLabel(set) && (
                <Chip
                  className="chip--outline hidden shrink-0 px-1 sm:inline-flex"
                  size="sm"
                >
                  {setTypeLabel(set)}
                </Chip>
              )}
            </span>
            <span>{set.reps ?? '—'}</span>
            <span>{formatLoad(set.load_value, set.load_unit) || '—'}</span>
            <span>{set.rpe ?? '—'}</span>
            <Check className="text-success" />
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
