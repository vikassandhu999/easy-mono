/**
 * CD/OV — Overview tab. Spec §3; design `Client Detail.dc.html`
 * data-ref CD-OV-desktop / CD-OV-mobile. Style fidelity is enforced by
 * design-handoff/manifests/CD-OV.json — the data-testid attributes here are
 * the manifest's app-side selectors, keep them stable.
 */
import {Button, Chip, TextArea, Typography, toast} from '@heroui/react';
import {ChevronRight, ClipboardCheck, Image as ImageIcon, Settings2, Sparkles} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useUpdateClientMutation} from '@/api/clients';
import type {Client, ClientProfileFormAssignment, WeightEntry} from '@/api/generated';
import {
  useListClientFormAssignmentsForCoachQuery,
  useListClientWeightEntriesQuery,
  useListCoachClientTrainingSessionsQuery,
  useListCoachMealLogsQuery,
} from '@/api/generated';
import {useListCoachClientNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import {
  activePlan,
  completedCheckIns,
  completedSessionDates,
  formatKg,
  formatShortDate,
  isoDate,
  lastDays,
  loggedMealDates,
  relativeDay,
  snapshotQuestions,
  weekdayKey,
} from '@/clients/client-detail/data';
import {ACCENT_BUTTON, CARD, CardError, CardSkeleton, CHIP, EYEBROW} from '@/clients/client-detail/ui';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function ReviewBanner({assignments, clientId}: {assignments: ClientProfileFormAssignment[]; clientId: string}) {
  const navigate = useNavigate();
  const unreviewed = completedCheckIns(assignments).filter(
    (a) => a.latest_submission && !a.latest_submission.reviewed_at,
  );
  const newest = unreviewed[0];
  if (!newest?.latest_submission) {
    return null;
  }
  const olderCount = unreviewed.length - 1;

  return (
    <div
      className="flex items-center gap-3 rounded-card border border-warning/30 bg-warning-soft px-3.5 py-3.25 sm:gap-3.5 sm:px-4.25 sm:py-3.75"
      data-testid="cd-review-banner"
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-control bg-warning/26 text-warning-soft-foreground sm:size-10 sm:rounded-control">
        <ClipboardCheck className="size-4.25 sm:size-4.75" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-body font-bold sm:text-body"
          data-testid="cd-review-title"
        >
          Check-in to review
        </div>
        <div
          className="mt-0.25 text-eyebrow text-warning-soft-foreground sm:mt-0.5 sm:text-eyebrow"
          data-testid="cd-review-sub"
        >
          {newest.form_template.name} · submitted {relativeDay(newest.latest_submission.submitted_at)?.toLowerCase()}
          {olderCount > 0 ? ` · +${olderCount} older unreviewed` : ''}
        </div>
      </div>
      <Button
        className={`${ACCENT_BUTTON} h-8 px-3.25 sm:h-9 sm:px-3.75`}
        data-testid="cd-review-btn"
        onPress={() =>
          navigate(ROUTES.CLIENT_CHECKIN_SUBMISSION.replace(':id', clientId).replace(':assignmentId', newest.id))
        }
      >
        Review
      </Button>
    </div>
  );
}

function Dot({kind}: {kind: 'done' | 'missed' | 'rest'}) {
  if (kind === 'done') {
    return (
      <span
        className="size-2.75 flex-none rounded-pill bg-success sm:size-3.25"
        data-testid="cd-dot-done"
      />
    );
  }
  if (kind === 'missed') {
    return (
      <span
        className="size-2.75 flex-none rounded-pill bg-danger sm:size-3.25"
        data-testid="cd-dot-missed"
      />
    );
  }
  return (
    <span
      className="size-2.75 flex-none rounded-pill border-border bg-transparent [border-width:1.5px] sm:size-3.25"
      data-testid="cd-dot-rest"
    />
  );
}

function WeekCard({clientId}: {clientId: string}) {
  const days = useMemo(() => lastDays(7), []);
  const from = isoDate(days[0]!);
  const to = isoDate(days[6]!);
  const sessions = useListCoachClientTrainingSessionsQuery({clientId, from, to});
  const meals = useListCoachMealLogsQuery({clientId, from, to});
  const {data: trainingPlans} = useListCoachClientTrainingPlansQuery({clientId});
  const {data: nutritionPlans} = useListCoachClientNutritionPlansQuery({clientId});

  if (sessions.isLoading || meals.isLoading) {
    return <CardSkeleton />;
  }
  if (sessions.isError && meals.isError) {
    return (
      <CardError
        label="training"
        onRetry={() => {
          sessions.refetch();
          meals.refetch();
        }}
      />
    );
  }

  const done = completedSessionDates(sessions.data?.data);
  const logged = loggedMealDates(meals.data?.data);
  const scheduledWeekdays = new Set(
    (activePlan(trainingPlans?.data)?.plan_items ?? []).map((item) => item.day_of_week),
  );
  const hasNutrition = (nutritionPlans?.data ?? []).some((plan) => plan.status === 'active');
  const todayIso = isoDate(days[6]!);

  const workoutKind = (day: Date): 'done' | 'missed' | 'rest' => {
    const iso = isoDate(day);
    if (done.has(iso)) {
      return 'done';
    }
    if (scheduledWeekdays.has(weekdayKey(day) as never) && iso < todayIso) {
      return 'missed';
    }
    return 'rest';
  };

  return (
    <div
      className={`${CARD} p-3.75 sm:px-4.75 sm:py-4.25`}
      data-testid="cd-week"
    >
      <div
        className={`${EYEBROW} mb-3.5 sm:mb-4`}
        data-testid="cd-week-eyebrow"
      >
        This week
      </div>
      <div className="flex items-end">
        <div className="flex w-14 flex-none flex-col gap-2.5 sm:w-16.5 sm:gap-2.75 sm:pb-px">
          <div className="h-7 sm:h-7.5" />
          <div
            className="flex h-3 items-center text-eyebrow font-semibold text-muted sm:h-3.25 sm:text-eyebrow"
            data-testid="cd-week-rowlabel"
          >
            Workouts
          </div>
          {hasNutrition ? (
            <div className="flex h-3 items-center text-eyebrow font-semibold text-muted sm:h-3.25 sm:text-eyebrow">
              Meals
            </div>
          ) : null}
        </div>
        {days.map((day, index) => {
          const isToday = index === 6;
          return (
            <div
              className="flex flex-1 flex-col items-center gap-2.5 sm:gap-2.75"
              key={isoDate(day)}
            >
              <div className="text-center">
                <div
                  className={
                    isToday
                      ? 'text-eyebrow font-bold text-foreground sm:text-eyebrow'
                      : 'text-eyebrow font-semibold text-muted sm:text-eyebrow'
                  }
                  data-testid="cd-week-day-initial"
                >
                  {DAY_INITIALS[day.getDay()]}
                </div>
                <div
                  className="font-grotesk text-eyebrow font-bold sm:text-body"
                  data-testid="cd-week-day-num"
                >
                  {day.getDate()}
                </div>
              </div>
              <Dot kind={workoutKind(day)} />
              {hasNutrition ? <Dot kind={logged.has(isoDate(day)) ? 'done' : 'rest'} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoThumb({src}: {src: string}) {
  const [isBroken, setBroken] = useState(false);
  if (isBroken) {
    return <ImageIcon className="size-4.5 sm:size-5" />;
  }
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: load errors swap in the placeholder icon (same as message-attachments)
    <img
      alt="Progress"
      className="size-full object-cover"
      onError={() => setBroken(true)}
      src={src}
    />
  );
}

function RatingDots({value}: {value: number}) {
  return (
    <span className="hidden gap-0.75 sm:flex">
      {Array.from({length: 5}, (_, i) => (
        <span
          className={`size-1.75 rounded-pill ${i < value ? 'bg-accent' : 'bg-surface-tertiary'}`}
          data-testid="cd-latest-metric-dot"
          key={i}
        />
      ))}
    </span>
  );
}

function LatestCheckInCard({assignments, clientId}: {assignments: ClientProfileFormAssignment[]; clientId: string}) {
  const newest = completedCheckIns(assignments)[0];
  const submission = newest?.latest_submission;

  const photoIds = useMemo(() => {
    if (!submission) {
      return [];
    }
    return snapshotQuestions(submission.question_snapshot)
      .filter((q) => q.type === 'photo' && q.id)
      .flatMap((q) => (Array.isArray(submission.answers[q.id!]) ? (submission.answers[q.id!] as string[]) : []))
      .slice(0, 4);
  }, [submission]);
  const {urls} = useAttachmentDownloadUrls(photoIds);

  if (!submission) {
    return null;
  }

  const metrics = snapshotQuestions(submission.question_snapshot)
    .filter((q) => (q.type === 'rating' || q.type === 'weight') && q.id && submission.answers[q.id] != null)
    .slice(0, 3);
  const reviewed = Boolean(submission.reviewed_at);

  return (
    <div
      className={`${CARD} p-3.75 sm:px-4.75 sm:py-4.25`}
      data-testid="cd-latest"
    >
      <div className="mb-3 sm:mb-3.5 sm:flex sm:items-baseline sm:gap-2">
        <span
          className="font-grotesk text-body font-semibold sm:text-body"
          data-testid="cd-latest-title"
        >
          Latest check-in
        </span>
        <div
          className="mt-0.5 text-eyebrow text-muted sm:mt-0 sm:text-eyebrow"
          data-testid="cd-latest-sub"
        >
          {newest.form_template.name} · {formatShortDate(submission.submitted_at)}
        </div>
      </div>
      <div className="mb-3.25 flex gap-6 sm:mb-3.75 sm:flex-wrap sm:gap-8">
        {metrics.map((question) => {
          const answer = submission.answers[question.id!];
          return (
            <div key={question.id}>
              <div
                className="text-eyebrow font-semibold text-muted sm:text-eyebrow"
                data-testid="cd-latest-metric-label"
              >
                {question.type === 'weight' ? 'Weight' : question.label}
              </div>
              <div className="flex items-center gap-2 sm:mt-1.5">
                <span
                  className="mt-1 font-grotesk text-body font-bold sm:mt-0 sm:text-title"
                  data-testid="cd-latest-metric-value"
                >
                  {question.type === 'weight' ? formatKg(Number(answer), 'kg') : `${answer}/5`}
                </span>
                {question.type === 'rating' ? <RatingDots value={Number(answer)} /> : null}
              </div>
            </div>
          );
        })}
      </div>
      {photoIds.length > 0 ? (
        <div className="mb-3.25 flex gap-1.75 sm:mb-3.75 sm:gap-2">
          {photoIds.map((id) => (
            <span
              className="flex size-14.5 flex-none items-center justify-center overflow-hidden rounded-panel bg-surface-tertiary text-muted/60 sm:size-16"
              data-testid="cd-latest-photo"
              key={id}
            >
              {urls[id] ? <PhotoThumb src={urls[id]!} /> : <ImageIcon className="size-4.5 sm:size-5" />}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mb-2.75 h-px bg-border sm:mb-3" />
      <div className="flex items-center justify-between">
        {reviewed ? (
          <Chip
            className={`${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`}
            data-testid="cd-latest-chip-reviewed"
          >
            Reviewed
          </Chip>
        ) : (
          <Chip
            className={`${CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
            data-testid="cd-latest-chip-needs"
          >
            Needs review
          </Chip>
        )}
        <Link
          className="text-eyebrow font-semibold text-accent sm:text-eyebrow"
          data-testid="cd-latest-view"
          to={ROUTES.CLIENT_CHECKIN_SUBMISSION.replace(':id', clientId).replace(':assignmentId', newest.id)}
        >
          View check-in →
        </Link>
      </div>
    </div>
  );
}

function sparklinePoints(entries: WeightEntry[], width: number, height: number): string {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const values = sorted.map((entry) => Number(entry.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const top = height * 0.14;
  const bottom = height * 0.7;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
      const y = bottom - ((value - min) / span) * (bottom - top);
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(' ');
}

function WeightCard({client, clientId}: {client: Client; clientId: string}) {
  const since = useMemo(() => isoDate(lastDays(90)[0]!), []);
  const {data, isError, isLoading, refetch} = useListClientWeightEntriesQuery({clientId, since});

  if (isLoading) {
    return <CardSkeleton />;
  }
  if (isError) {
    return (
      <CardError
        label="weight"
        onRetry={refetch}
      />
    );
  }

  const entries = data?.entries ?? [];
  const latest = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const goal = client.goal_weight_value == null ? null : Number(client.goal_weight_value);
  const delta = weightDeltaLabel(entries);

  return (
    <div
      className={`${CARD} p-3.75 sm:px-4.75 sm:py-4.25`}
      data-testid="cd-weight"
    >
      <div className="mb-2.5 flex items-center justify-between sm:mb-3">
        <div className="flex flex-1 items-baseline justify-between gap-2 sm:justify-start sm:gap-2.5">
          <span
            className="font-grotesk text-body font-semibold sm:text-body"
            data-testid="cd-weight-title"
          >
            Weight
          </span>
          {latest ? (
            <span
              className="font-grotesk text-title font-bold sm:text-heading"
              data-testid="cd-weight-value"
            >
              {formatKg(latest.value, latest.unit)}
            </span>
          ) : null}
          {delta ? (
            <Chip
              className={`${CHIP} bg-success-soft [color:var(--color-success-soft-foreground)]`}
              data-testid="cd-weight-delta"
            >
              {delta}
            </Chip>
          ) : null}
        </div>
        <Link
          className="ml-auto hidden text-eyebrow font-semibold text-accent sm:block"
          data-testid="cd-weight-all"
          to={ROUTES.CLIENT_WEIGHT.replace(':id', clientId)}
        >
          All entries →
        </Link>
      </div>
      {entries.length > 1 ? (
        <div className="relative">
          <svg
            className="block h-22.5 w-full sm:h-29.5"
            preserveAspectRatio="none"
            viewBox="0 0 620 118"
          >
            {goal != null ? (
              <line
                opacity="0.5"
                stroke="var(--color-muted)"
                strokeDasharray="4 4"
                strokeWidth="1"
                x1="0"
                x2="620"
                y1="92"
                y2="92"
              />
            ) : null}
            <polyline
              fill="none"
              points={sparklinePoints(entries, 620, 118)}
              stroke="var(--color-accent)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
          {goal != null ? (
            <span
              className="absolute right-0.5 bottom-5 bg-surface px-0.75 text-eyebrow text-muted"
              data-testid="cd-weight-goal"
            >
              goal {formatKg(goal, client.goal_weight_unit ?? 'kg')}
            </span>
          ) : null}
        </div>
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          No weight logged yet. Weight arrives from check-ins or the client app.
        </Typography>
      )}
    </div>
  );
}

function weightDeltaLabel(entries: WeightEntry[]): null | string {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  if (!latest || !oldest || sorted.length < 2) {
    return null;
  }
  const latestTime = new Date(`${latest.date}T00:00:00`).getTime();
  const baseline =
    sorted.find((entry) => latestTime - new Date(`${entry.date}T00:00:00`).getTime() >= 28 * 24 * 60 * 60 * 1000) ??
    oldest;
  const delta = Number(latest.value) - Number(baseline.value);
  if (!delta || Number.isNaN(delta)) {
    return null;
  }
  return `${delta < 0 ? '▼' : '▲'} ${Math.abs(delta).toFixed(1)} ${latest.unit} in 4 weeks`;
}

export function NotesCard({client}: {client: Client}) {
  const [draft, setDraft] = useState<null | string>(null);
  const [updateClient] = useUpdateClientMutation();

  const save = async () => {
    if (draft == null || draft === (client.notes ?? '')) {
      setDraft(null);
      return;
    }
    try {
      await updateClient({body: {notes: draft.trim() === '' ? null : draft}, id: client.id}).unwrap();
      toast.success('Notes saved');
    } catch {
      toast.danger("Notes weren't saved");
    }
    setDraft(null);
  };

  return (
    <div
      className={`${CARD} p-3.5 sm:px-4.25 sm:py-4`}
      data-testid="cd-notes"
    >
      <div
        className={`${EYEBROW} mb-2 sm:mb-2.25`}
        data-testid="cd-notes-eyebrow"
      >
        Notes
      </div>
      <TextArea
        aria-label="Notes"
        className="min-h-16.5 w-full resize-none rounded-none border-0 bg-transparent p-0.5 font-btn text-body leading-relaxed text-foreground [box-shadow:none] outline-none sm:min-h-19.5"
        data-testid="cd-notes-input"
        onBlur={save}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add private notes about this client…"
        value={draft ?? client.notes ?? ''}
      />
      <div
        className="mt-1.5 text-eyebrow text-muted sm:mt-2 sm:text-eyebrow"
        data-testid="cd-notes-caption"
      >
        Only you and your team can see notes.
      </div>
    </div>
  );
}

export function DetailsRow() {
  const {id} = useParams<{id: string}>();
  return (
    <Link
      className="flex cursor-pointer items-center gap-3.5 rounded-panel border border-border bg-surface p-3.5 transition-colors hover:bg-background sm:px-4.25 sm:py-3.75"
      data-testid="cd-details"
      to={ROUTES.CLIENT_DETAILS.replace(':id', id!)}
    >
      <span
        className="flex size-9 flex-none items-center justify-center rounded-control bg-background text-muted sm:size-9.5 sm:rounded-control"
        data-testid="cd-details-icon"
      >
        <Settings2 className="size-4.25 sm:size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-eyebrow font-bold sm:text-body"
          data-testid="cd-details-title"
        >
          Details &amp; settings
        </div>
        <div
          className="mt-0.25 text-eyebrow text-muted sm:mt-0.5 sm:text-eyebrow"
          data-testid="cd-details-sub"
        >
          Subscription, coach, intake, invitation
        </div>
      </div>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );
}

function FreshEmptyCard({firstName}: {firstName: string}) {
  return (
    <div
      className={`${CARD} flex flex-col items-center gap-1.25 px-5 py-9.5 text-center sm:gap-1.5 sm:px-5.5 sm:py-11`}
      data-testid="cd-empty"
    >
      <span
        className="mb-0.5 flex size-12 items-center justify-center rounded-panel bg-surface-tertiary text-muted sm:size-13 sm:rounded-card"
        data-testid="cd-empty-icon"
      >
        <Sparkles className="size-5.25 sm:size-5.75" />
      </span>
      <div
        className="font-grotesk text-body font-semibold sm:text-title"
        data-testid="cd-empty-title"
      >
        No activity yet
      </div>
      <div
        className="text-eyebrow text-muted sm:max-w-80 sm:text-eyebrow"
        data-testid="cd-empty-sub"
      >
        Once {firstName} has a plan and starts logging, workouts, meals, weight and check-ins show up here.
      </div>
    </div>
  );
}

export default function OverviewTab({client, isFresh}: {client: Client; isFresh: boolean}) {
  const assignments = useListClientFormAssignmentsForCoachQuery({clientId: client.id});

  return (
    <div
      className="flex flex-col gap-3 p-3.5 sm:grid sm:grid-cols-[minmax(0,1fr)_320px] sm:items-start sm:gap-4 sm:p-0"
      data-testid="cd-ov"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:gap-3.5">
        {isFresh ? (
          <FreshEmptyCard firstName={client.first_name ?? 'this client'} />
        ) : (
          <>
            {assignments.isLoading ? (
              <CardSkeleton lines={2} />
            ) : assignments.isError ? (
              <CardError
                label="check-ins"
                onRetry={assignments.refetch}
              />
            ) : (
              <>
                <ReviewBanner
                  assignments={assignments.data?.data ?? []}
                  clientId={client.id}
                />
              </>
            )}
            <WeekCard clientId={client.id} />
            {assignments.data ? (
              <LatestCheckInCard
                assignments={assignments.data.data}
                clientId={client.id}
              />
            ) : null}
            <WeightCard
              client={client}
              clientId={client.id}
            />
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3 sm:gap-3.5">
        <NotesCard client={client} />
        <DetailsRow />
      </div>
    </div>
  );
}
