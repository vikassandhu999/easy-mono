import {Button, Chip, TextArea, TextField, Typography} from '@heroui/react';
import {ClipboardList, Settings2, Sparkles} from 'lucide-react';
import {useEffect, useState} from 'react';
import {generatePath, Link, useNavigate} from 'react-router-dom';

import {EmptyState} from '@/@components/empty-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import type {ClientProfileFormAssignment} from '@/api/checkins';
import {useListClientFormAssignmentsForCoachQuery} from '@/api/checkins';
import type {Client} from '@/api/clients';
import {useListClientWeightEntriesQuery, useUpdateClientMutation} from '@/api/clients';
import {useListCoachMealLogsQuery} from '@/api/nutrition-plans-list';
import {useListCoachClientTrainingSessionsQuery} from '@/api/training-plans-list';
import {type AnswerType, formatAnswer, isSummarisableAnswer, submissionPhotoIds} from '@/checkins/lib/form-answers';
import {DetailRow} from '@/clients/components/detail-row';
import IntakeAssignControl from '@/clients/components/intake-assign-control';
import {PhotoThumb} from '@/clients/components/photo-thumb';
import {SectionCard} from '@/clients/components/section-card';
import {
  completedSessionDates,
  dayOfMonth,
  formatDayMonth,
  formatWeight,
  lastNDays,
  loggedMealDates,
  relativeDay,
  weekdayInitial,
  weightChartGeometry,
  weightTrend,
} from '@/clients/lib/client-detail-data';

/**
 * Overview: left column is the week (activity + triage); the 320px rail is
 * standing context — private notes, intake answers, and the way into Edit client.
 * Coaching access lives in the page strip (Manage sheet for period + cancel).
 */
export function OverviewTab({client}: {client: Client}) {
  const week = lastNDays(7);
  const from = week[0]!;
  const to = week[6]!;
  const navigate = useNavigate();
  const [assignOpen, setAssignOpen] = useState(false);
  const clientPath = (route: string) => route.replace(':id', client.id);

  const sessions = useListCoachClientTrainingSessionsQuery(client.id, {from, to});
  const meals = useListCoachMealLogsQuery(client.id, {from, to});
  const weights = useListClientWeightEntriesQuery(client.id);
  const forms = useListClientFormAssignmentsForCoachQuery(client.id);

  const doneDays = completedSessionDates(sessions.data?.data);
  const loggedDays = loggedMealDates(meals.data?.data);
  // `goal` is a loosely-typed index-signature object on the wire; narrow the
  // one field this screen reads.
  const trend = weightTrend(weights.data?.entries, (weights.data?.goal?.value as number | undefined) ?? null);

  const assignments = forms.data?.data ?? [];
  const submissions = assignments.filter((a) => a.latest_submission && a.purpose === 'check_in');
  const latest = submissions[0];
  const awaitingReview = submissions.find((a) => a.latest_submission && !a.latest_submission_reviewed_at);
  const intake = assignments.find((a) => a.purpose === 'intake');
  const intakeSubmittedOn = intake?.latest_submission?.submitted_at?.slice(0, 10);

  const hasAnything = doneDays.size > 0 || loggedDays.size > 0 || trend != null || submissions.length > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        {/* The one thing a coach owes this client, above everything else. */}
        {awaitingReview?.latest_submission && (
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-warning-soft bg-warning-soft p-4">
            <div className="min-w-0 flex-1">
              <Typography
                type="body-sm"
                weight="semibold"
              >
                Check-in to review
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {awaitingReview.form_template.name} · submitted{' '}
                {relativeDay(awaitingReview.latest_submission.submitted_at?.slice(0, 10))?.toLowerCase()}
              </Typography>
            </div>
            <Button
              onPress={() =>
                navigate(clientPath(ROUTES.CLIENT_CHECKIN_SUBMISSION).replace(':assignmentId', awaitingReview.id))
              }
              variant="primary"
            >
              Review
            </Button>
          </div>
        )}

        {hasAnything ? (
          <>
            <WeekCard
              doneDays={doneDays}
              loggedDays={loggedDays}
              week={week}
            />
            {latest?.latest_submission && (
              <LatestCheckInCard
                assignment={latest}
                to={clientPath(ROUTES.CLIENT_CHECKIN_SUBMISSION).replace(':assignmentId', latest.id)}
                unit={trend?.latest.unit ?? 'kg'}
              />
            )}
            {trend && (
              <WeightCard
                to={clientPath(ROUTES.CLIENT_WEIGHT)}
                trend={trend}
              />
            )}
          </>
        ) : (
          <SectionCard>
            <EmptyState
              body={`Once ${client.first_name ?? 'this client'} has a plan and starts logging, workouts, meals, weight and check-ins show up here.`}
              icon={Sparkles}
              title="No activity yet"
            />
          </SectionCard>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {/* Keyed on the client so switching clients remounts with their notes —
            the effect below only has to win over a refetch. */}
        <NotesCard
          client={client}
          key={client.id}
        />
        <SectionCard>
          <DetailRow
            icon={ClipboardList}
            meta={
              intakeSubmittedOn
                ? `Submitted ${formatDayMonth(intakeSubmittedOn)}`
                : intake
                  ? 'Assigned, not submitted yet'
                  : 'No intake assigned'
            }
            onPress={intake ? undefined : () => setAssignOpen(true)}
            title={intakeSubmittedOn ? 'Intake responses' : (intake?.form_template.name ?? 'Assign intake')}
            to={
              intakeSubmittedOn
                ? clientPath(ROUTES.CLIENT_INTAKE)
                : intake
                  ? generatePath(ROUTES.CHECKIN_BUILDER, {id: intake.form_template.id})
                  : undefined
            }
            tone={intakeSubmittedOn ? 'default' : 'muted'}
          />
        </SectionCard>
        <IntakeAssignControl
          clientId={client.id}
          clientName={client.first_name ?? 'this client'}
          isOpen={assignOpen}
          onOpenChange={setAssignOpen}
        />
        <SectionCard>
          <DetailRow
            icon={Settings2}
            meta="Contact and assigned coach"
            title="Edit client"
            to={clientPath(ROUTES.CLIENT_EDIT)}
          />
        </SectionCard>
      </div>
    </div>
  );
}

/**
 * The adherence grid: a label column, then one column per day. The labels are ROW
 * labels beside their own dots — reading "Workouts · · ·" across is the point of
 * the card, and a legend above the grid loses that.
 */
function WeekCard({doneDays, loggedDays, week}: {doneDays: Set<string>; loggedDays: Set<string>; week: string[]}) {
  return (
    <SectionCard title="This week">
      <div className="px-4 pb-4">
        <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] items-center gap-x-1 gap-y-3">
          <span />
          {week.map((day) => (
            <span
              className="flex flex-col items-center"
              key={day}
            >
              <span className="type-eyebrow font-semibold text-muted">{weekdayInitial(day)}</span>
              <span className="font-grotesk type-body font-bold">{dayOfMonth(day)}</span>
            </span>
          ))}

          <span className="pr-3 type-eyebrow font-semibold text-muted">Workouts</span>
          {week.map((day) => (
            <Dot
              isOn={doneDays.has(day)}
              key={day}
            />
          ))}

          <span className="pr-3 type-eyebrow font-semibold text-muted">Meals</span>
          {week.map((day) => (
            <Dot
              isOn={loggedDays.has(day)}
              key={day}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * The triage card: the first three answers across, the submitted photos, then the
 * review state and the way in. Answers read left-to-right because a coach compares
 * them against last week, not against each other.
 */
function LatestCheckInCard({
  assignment,
  to,
  unit,
}: {
  assignment: ClientProfileFormAssignment;
  to: string;
  unit: string;
}) {
  const submission = assignment.latest_submission!;
  const photos = submissionPhotoIds(submission).slice(0, 3);
  const {urls} = useAttachmentDownloadUrls(photos);
  const reviewed = Boolean(assignment.latest_submission_reviewed_at);

  return (
    <SectionCard
      title={
        <span className="flex min-w-0 flex-wrap items-baseline gap-2">
          <span>Latest check-in</span>
          <span className="type-eyebrow font-normal text-muted">
            {assignment.form_template.name}
            {submission.submitted_at ? ` · ${formatDayMonth(submission.submitted_at.slice(0, 10))}` : ''}
          </span>
        </span>
      }
      titleAs="heading"
    >
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {answerSummary(submission, unit).map(({answer, label, rating}) => (
            <div key={label}>
              <div className="type-eyebrow font-semibold text-muted">{label}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-grotesk type-title font-bold">{rating == null ? answer : `${rating}/5`}</span>
                {rating != null && <RatingDots value={rating} />}
              </div>
            </div>
          ))}
        </div>

        {photos.length > 0 && (
          <div className="mt-4 flex gap-2">
            {photos.map((photoId) => (
              <PhotoThumb
                alt="Check-in photo"
                key={photoId}
                src={urls[photoId]}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <Chip
            color={reviewed ? 'default' : 'warning'}
            size="sm"
            variant="soft"
          >
            {reviewed ? 'Reviewed' : 'Needs review'}
          </Chip>
          <Link
            className="type-eyebrow font-semibold text-accent"
            to={to}
          >
            View check-in →
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}

/** `4/5` as five 7px dots — the design's rating register, filled to the value. */
function RatingDots({value}: {value: number}) {
  return (
    <span
      aria-hidden
      className="flex gap-1"
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          className={`size-1.75 rounded-pill ${step <= value ? 'bg-accent' : 'bg-surface-tertiary'}`}
          key={step}
        />
      ))}
    </span>
  );
}

const CHART_W = 620;
const CHART_H = 118;

/**
 * The trend at a glance: the line, the goal, and nothing else — the axis labels
 * and per-point values live on CD-WH, which is one tap away.
 */
function WeightCard({to, trend}: {to: string; trend: NonNullable<ReturnType<typeof weightTrend>>}) {
  const chart = weightChartGeometry(trend.series ?? [], trend.goal, CHART_W, CHART_H);
  const unit = trend.latest.unit;

  return (
    <SectionCard
      action={
        <Link
          className="type-eyebrow font-semibold text-accent"
          to={to}
        >
          All entries →
        </Link>
      }
      title={
        <span className="flex min-w-0 flex-wrap items-baseline gap-2">
          <span>Weight</span>
          <span className="font-grotesk type-heading font-bold">{formatWeight(trend.latest.value, unit)}</span>
          {trend.weeks > 0 && (
            <Chip
              color={trend.direction === 'down' ? 'success' : 'default'}
              size="sm"
              variant="soft"
            >
              {trend.direction === 'down' ? '▼' : trend.direction === 'up' ? '▲' : '—'}{' '}
              {formatWeight(trend.magnitude, unit)} in {trend.weeks} weeks
            </Chip>
          )}
        </span>
      }
      titleAs="heading"
    >
      <div className="relative px-4 pb-4">
        {chart ? (
          <>
            {/* An inline SVG rather than a chart dependency — one polyline and one
                dashed rule, the same call the CD-WH trend card makes. */}
            <svg
              aria-hidden
              className="block h-30 w-full"
              preserveAspectRatio="none"
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            >
              {chart.goalY != null && (
                <line
                  className="text-muted"
                  opacity="0.5"
                  stroke="currentColor"
                  strokeDasharray="4 4"
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
            </svg>
            {trend.goal != null && (
              <span className="absolute right-5 bottom-5 bg-surface px-1 type-eyebrow text-muted">
                goal {formatWeight(trend.goal, unit, {decimals: 0})}
              </span>
            )}
          </>
        ) : (
          <Typography
            color="muted"
            type="body-sm"
          >
            No entries yet.
          </Typography>
        )}
      </div>
    </SectionCard>
  );
}

/**
 * Notes are edited where they are read — Overview keeps an inline field with
 * blur-save (no Save button). Field chrome matches FormTextAreaField so the
 * box reads as editable, not as another static card body.
 */
function NotesCard({client}: {client: Client}) {
  const [value, setValue] = useState(client.notes ?? '');
  const updateClientMutation = useUpdateClientMutation();

  // A refetch has to win over local state — otherwise the box keeps showing what
  // this session typed after the server said otherwise.
  useEffect(() => {
    setValue(client.notes ?? '');
  }, [client.notes]);

  const save = () => {
    const next = value.trim();
    if (next === (client.notes ?? '').trim()) {
      return;
    }
    updateClientMutation
      .mutateAsync({body: {notes: next}, id: client.id})
      .catch((error) => toastMutationError(error, "Couldn't save these notes. Try again."));
  };

  return (
    <SectionCard title="Notes">
      <div className="px-4 pb-4">
        <TextField
          aria-label="Client notes"
          onBlur={save}
          onChange={setValue}
          value={value}
        >
          <TextArea
            className="min-h-33 w-full resize-none border border-border bg-surface shadow-none"
            placeholder="Add private notes about this client…"
          />
        </TextField>
        <Typography
          className="mt-2"
          color="muted"
          type="body-xs"
        >
          Only you and your team can see notes.
        </Typography>
      </div>
    </SectionCard>
  );
}

/**
 * `.dot` — 13px. Filled when the day was done, a hollow ring when it was not.
 * `.dot.h` is a 1.5px border, which has no spacing token; `border` (1px) is the
 * theme's hairline and the difference is invisible at 13px.
 */
function Dot({isOn}: {isOn: boolean}) {
  return (
    <span
      aria-hidden
      className={`size-3 justify-self-center rounded-pill ${isOn ? 'bg-success' : 'border border-border'}`}
    />
  );
}

/**
 * The first three SUMMARISABLE answers of a submission, for the CD-OV card. Walks
 * `question_snapshot` (an array of sections) so the order matches the form, and
 * skips photo answers — those are attachment ids, not display text.
 *
 * `rating` answers carry their value through so the card can draw the design's
 * five dots; everything else is already a string by the time it lands here.
 */
function answerSummary(
  submission: {
    answers?: Record<string, unknown> | null;
    question_snapshot?: {questions?: {id: string; label: string; type?: AnswerType}[]}[] | null;
  },
  unit: string,
): {answer: string; label: string; rating: null | number}[] {
  const answers = (submission.answers ?? {}) as Record<string, unknown>;
  const rows: {answer: string; label: string; rating: null | number}[] = [];
  for (const section of submission.question_snapshot ?? []) {
    for (const question of section.questions ?? []) {
      const value = answers[question.id];
      if (!isSummarisableAnswer(value, question.type)) {
        continue;
      }
      const rating = question.type === 'rating' && typeof value === 'number' ? value : null;
      // A weight ANSWER carries no unit — the design shows `72.4 kg`, so the
      // client's logging unit is appended here rather than left off.
      const answer = formatAnswer(value, question.type);
      rows.push({
        answer: question.type === 'weight' && answer !== '—' ? `${answer} ${unit}` : answer,
        label: question.label,
        rating,
      });
      if (rows.length === 3) {
        return rows;
      }
    }
  }
  return rows;
}
