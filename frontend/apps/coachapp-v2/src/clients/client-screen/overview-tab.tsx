import {Button, Typography} from '@heroui/react';
import {Sparkles} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';

import {EmptyState} from '@/@components/empty-state';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {
  useListClientFormAssignmentsForCoachQuery,
  useListClientWeightEntriesQuery,
  useListCoachClientTrainingSessionsQuery,
  useListCoachMealLogsQuery,
} from '@/api/generated';
import {DetailRow} from '@/clients/components/detail-row';
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
  weightTrend,
} from '@/clients/lib/client-detail-data';

/** CD-OV. */
export function OverviewTab({client}: {client: Client}) {
  const week = lastNDays(7);
  const from = week[0]!;
  const to = week[6]!;
  const navigate = useNavigate();
  const clientPath = (route: string) => route.replace(':id', client.id);

  const sessions = useListCoachClientTrainingSessionsQuery({clientId: client.id, from, to});
  const meals = useListCoachMealLogsQuery({clientId: client.id, from, to});
  const weights = useListClientWeightEntriesQuery({clientId: client.id});
  const forms = useListClientFormAssignmentsForCoachQuery({clientId: client.id});

  const doneDays = completedSessionDates(sessions.data?.data);
  const loggedDays = loggedMealDates(meals.data?.data);
  const trend = weightTrend(weights.data?.entries, weights.data?.goal?.value ?? null);

  const submissions = (forms.data?.data ?? []).filter((a) => a.latest_submission && a.purpose === 'check_in');
  const latest = submissions[0];
  const awaitingReview = submissions.find((a) => a.latest_submission && !a.latest_submission_reviewed_at);

  const hasAnything = doneDays.size > 0 || loggedDays.size > 0 || trend != null || submissions.length > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-start">
      <div className="flex flex-col gap-4">
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
          <SectionCard title="This week">
            <div className="px-4 pb-4">
              <div className="flex gap-4 pb-3">
                <span className="eyebrow">Workouts</span>
                <span className="eyebrow">Meals</span>
              </div>
              {/* The adherence strip lives here rather than in a component: 43 of
                  its elements exist, and every one of them is on this screen. One
                  caller is a hypothetical seam. */}
              <div className="flex justify-between gap-1">
                {week.map((day) => (
                  <div
                    className="flex flex-1 flex-col items-center gap-3"
                    key={day}
                  >
                    <span className="eyebrow">{weekdayInitial(day)}</span>
                    <Dot isOn={doneDays.has(day)} />
                    <Dot isOn={loggedDays.has(day)} />
                    <span className="type-eyebrow text-muted-2">{dayOfMonth(day)}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard>
            <EmptyState
              body={`Once ${client.first_name ?? 'this client'} has a plan and starts logging, workouts, meals, weight and check-ins show up here.`}
              icon={Sparkles}
              title="No activity yet"
            />
          </SectionCard>
        )}

        <SectionCard title="Notes">
          <div className="px-4 pb-4">
            <Typography
              color={client.notes ? 'default' : 'muted'}
              type="body-sm"
            >
              {client.notes || 'No notes yet.'}
            </Typography>
            <Typography
              className="mt-2"
              color="muted"
              type="body-xs"
            >
              Only you and your team can see notes.
            </Typography>
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-col gap-4">
        {latest?.latest_submission && (
          <SectionCard
            action={
              <Link
                className="type-eyebrow font-semibold text-accent"
                to={clientPath(ROUTES.CLIENT_CHECKIN_SUBMISSION).replace(':assignmentId', latest.id)}
              >
                View check-in →
              </Link>
            }
            title="Latest check-in"
            titleAs="heading"
          >
            <div className="px-4 pb-4">
              <Typography
                color="muted"
                type="body-xs"
              >
                {latest.form_template.name}
                {latest.latest_submission.submitted_at
                  ? ` · ${formatDayMonth(latest.latest_submission.submitted_at.slice(0, 10))}`
                  : ''}
              </Typography>
            </div>
          </SectionCard>
        )}

        <SectionCard
          action={
            <Link
              className="type-eyebrow font-semibold text-accent"
              to={clientPath(ROUTES.CLIENT_WEIGHT)}
            >
              All entries →
            </Link>
          }
          title="Weight"
          titleAs="heading"
        >
          <div className="px-4 pb-4">
            {trend ? (
              <>
                <div className="font-grotesk type-metric font-bold">
                  {formatWeight(trend.latest.value, trend.latest.unit)}
                </div>
                {trend.weeks > 0 && (
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    {trend.direction === 'down' ? '▼' : trend.direction === 'up' ? '▲' : '—'}{' '}
                    {formatWeight(trend.magnitude, trend.latest.unit)} in {trend.weeks} weeks
                  </Typography>
                )}
                {trend.goal != null && (
                  <Typography
                    className="mt-1"
                    color="muted"
                    type="body-xs"
                  >
                    goal {formatWeight(trend.goal, trend.latest.unit, {decimals: 0})}
                  </Typography>
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

        <SectionCard>
          <DetailRow
            meta="Subscription, coach, intake, invitation"
            title="Details & settings"
            to={clientPath(ROUTES.CLIENT_DETAILS)}
          />
        </SectionCard>
      </div>
    </div>
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
      className={`size-3 rounded-pill ${isOn ? 'bg-success' : 'border border-border'}`}
    />
  );
}
