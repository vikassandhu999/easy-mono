/**
 * CD/TR — Training tab. Spec §4; design `Client Detail.dc.html` data-ref
 * CD-TR-{desktop,mobile}. Active-plan card + grouped session history with
 * derived "missed" ghost rows. Style fidelity: manifests/CD-TR.json.
 *
 * The history list is a plain semantic list, not `BrowseListBox`: its rows are
 * mixed (tappable sessions and inert missed ghosts) and interleaved with group
 * headers, and HeroUI dims disabled `ListBox.Item`s — the repo's documented
 * pattern for inert/mixed lists. Load-more stays explicit.
 */
import {AlertDialog, Button, Chip, Dropdown, Label, Typography, toast} from '@heroui/react';
import {Dumbbell, MoreHorizontal} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {useCoachClientTrainingSessionsInfiniteQuery} from '@/api/client-training-sessions';
import type {Client, ClientTrainingPlan, TrainingSession} from '@/api/generated';
import {useUpdateTrainingPlanMutation} from '@/api/generated';
import {getApiErrorMessage} from '@/api/shared';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import {
  activePlan,
  formatCdDuration,
  formatRowDate,
  formatShortDate,
  isoDate,
  lastDays,
  weekdayKey,
  weekGroupLabel,
} from '@/clients/client-detail/cd-data';
import {CD_BTN_A, CD_BTN_G, CD_CARD, CD_CHIP, CdCardError, CdCardSkeleton} from '@/clients/client-detail/cd-ui';
import AssignSurface from '@/clients/components/assign-surface';
import PlanAssignContent from '@/clients/components/plan-assign-content';

const GRP = 'px-0 pt-2 pb-1.5 text-eyebrow font-bold uppercase tracking-grp text-muted';
const ROW = 'flex items-center gap-3.5 rounded-cd-panel px-1 py-2.5 sm:px-2 sm:py-2.75';
const ROW_DATE = 'w-18.5 flex-none text-sub font-semibold text-muted';
const ROW_META = 'mt-0.5 text-eyebrow text-muted sm:text-chip';
const SEP = 'h-px bg-border';
const ICON_BTN =
  'size-8.5 min-h-0 min-w-0 rounded-cd-panel border border-border bg-surface px-1.5 py-px text-foreground [box-shadow:none] [column-gap:normal] [font-family:Arial] [font-size:13.3333px] [row-gap:normal] font-normal leading-[normal] sm:size-9';

type Row =
  | {kind: 'group'; label: string}
  | {kind: 'missed'; date: string; id: string; title: string}
  | {kind: 'session'; date: string; id: string; session: TrainingSession; title: string};

function workoutName(session: TrainingSession, plan: ClientTrainingPlan | undefined): string {
  const workout = plan?.workouts.find((w) => w.id === session.training_workout_id);
  return workout?.name ?? 'Workout';
}

function sessionMeta(session: TrainingSession, isDesktop: boolean): string {
  const parts: string[] = [];
  if (!isDesktop) {
    parts.push(formatRowDate(session.date ?? '', {withMonth: false}));
  }
  const exercises = new Set(session.performed_sets.map((set) => set.exercise_id)).size;
  if (isDesktop && exercises > 0) {
    parts.push(`${exercises} exercise${exercises === 1 ? '' : 's'}`);
  }
  const sets = session.performed_sets.filter((set) => set.completed).length;
  if (sets > 0) {
    parts.push(`${sets} set${sets === 1 ? '' : 's'}`);
  }
  const duration = formatCdDuration(session.started_at, session.ended_at);
  if (duration) {
    parts.push(duration);
  }
  if (session.soreness_rating != null) {
    parts.push(`${isDesktop ? 'Soreness' : 'Sore'} ${session.soreness_rating}/5`);
  }
  return parts.join(' · ');
}

/** Scheduled days in the last 14 with no session — spec §4.2 ghost rows. */
function missedRows(sessions: TrainingSession[], plan: ClientTrainingPlan | undefined): Row[] {
  if (!plan) {
    return [];
  }
  const byWeekday = new Map<string, string>();
  for (const item of plan.plan_items) {
    const workout = plan.workouts.find((w) => w.id === item.training_workout_id);
    byWeekday.set(item.day_of_week, workout?.name ?? 'Workout');
  }
  const logged = new Set(sessions.map((session) => session.date).filter(Boolean) as string[]);
  const todayIso = isoDate(new Date());

  return lastDays(14)
    .filter((day) => {
      const iso = isoDate(day);
      return iso < todayIso && byWeekday.has(weekdayKey(day)) && !logged.has(iso);
    })
    .map((day) => ({
      date: isoDate(day),
      id: `missed-${isoDate(day)}`,
      kind: 'missed' as const,
      title: byWeekday.get(weekdayKey(day)) ?? 'Workout',
    }));
}

function buildRows(sessions: TrainingSession[], plan: ClientTrainingPlan | undefined): Row[] {
  const sessionRows: Row[] = sessions
    .filter((session) => session.date)
    .map((session) => ({
      date: session.date!,
      id: session.id,
      kind: 'session' as const,
      session,
      title: workoutName(session, plan),
    }));

  const all = [...sessionRows, ...missedRows(sessions, plan)].sort((a, b) =>
    'date' in a && 'date' in b ? b.date.localeCompare(a.date) : 0,
  );

  const out: Row[] = [];
  let currentGroup: null | string = null;
  for (const row of all) {
    if (row.kind === 'group') {
      continue;
    }
    const label = weekGroupLabel(row.date);
    if (label !== currentGroup) {
      out.push({kind: 'group', label});
      currentGroup = label;
    }
    out.push(row);
  }
  return out;
}

function PlanCard({client, plan}: {client: Client; plan: ClientTrainingPlan}) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const [isChangeOpen, setChangeOpen] = useState(false);
  const [isEndOpen, setEndOpen] = useState(false);
  const [updatePlan, {isLoading: isEnding}] = useUpdateTrainingPlanMutation();

  const scheduledDays = new Set(plan.plan_items.map((item) => item.day_of_week)).size;
  const meta = [
    plan.start_date ? `Started ${formatShortDate(plan.start_date)}` : 'Start date not set',
    scheduledDays > 0 ? `${scheduledDays} day${scheduledDays === 1 ? '' : 's'} a week` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const endPlan = async () => {
    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: {status: 'archived'}}).unwrap();
      setEndOpen(false);
      toast.success('Plan ended');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Plan wasn't ended"));
    }
  };

  return (
    <>
      <div
        className={`${CD_CARD} flex items-center gap-3 px-3.75 py-3.25 sm:gap-3.75 sm:px-4.5 sm:py-3.75`}
        data-testid="tr-plan"
      >
        <span
          className="flex size-10 flex-none items-center justify-center rounded-cd-panel bg-accent-soft text-accent sm:size-11 sm:rounded-cd-plan"
          data-testid="tr-plan-icon"
        >
          <Dumbbell className="size-4.75 sm:size-5.25" />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="text-tab font-bold sm:text-metric-sm"
            data-testid="tr-plan-name"
          >
            {plan.name}
          </div>
          <div
            className="mt-0.5 text-chip text-muted sm:text-pill"
            data-testid="tr-plan-meta"
          >
            {meta}
          </div>
        </div>
        <Button
          className={`${CD_BTN_G} hidden h-9 px-3.75 sm:inline-flex`}
          data-testid="tr-plan-open"
          onPress={() => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', plan.id))}
        >
          Open plan
        </Button>
        <Dropdown>
          <Button
            aria-label="Plan options"
            className={ICON_BTN}
            data-testid="tr-plan-menu"
            isIconOnly
            ref={menuRef}
            variant="ghost"
          >
            <MoreHorizontal className="size-4 text-muted sm:size-4.25" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'change') {
                  setChangeOpen(true);
                } else if (key === 'end') {
                  setEndOpen(true);
                }
              }}
            >
              <Dropdown.Item
                id="change"
                textValue="Change plan"
              >
                <Label>Change plan</Label>
              </Dropdown.Item>
              <Dropdown.Item
                id="end"
                textValue="End plan"
                variant="danger"
              >
                <Label>End plan</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <AssignSurface
        anchorRef={menuRef}
        isOpen={isChangeOpen}
        label="Change plan"
        onOpenChange={setChangeOpen}
      >
        {(close) => (
          <PlanAssignContent
            clientId={client.id}
            clientName={client.first_name ?? 'this client'}
            kind="training"
            onClose={close}
          />
        )}
      </AssignSurface>

      <AlertDialog.Backdrop
        isOpen={isEndOpen}
        onOpenChange={setEndOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>End this plan?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>The client will no longer see scheduled workouts.</Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={() => setEndOpen(false)}
                variant="outline"
              >
                Keep plan
              </Button>
              <Button
                isPending={isEnding}
                onPress={endPlan}
                variant="danger"
              >
                End plan
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

function EmptyPlanCard({client}: {client: Client}) {
  return (
    <div
      className={`${CD_CARD} flex flex-col items-center gap-1.25 px-4.5 py-7.5 text-center sm:gap-1.5 sm:px-5 sm:py-9`}
      data-testid="tr-empty"
    >
      <span
        className="mb-0.75 flex size-12 items-center justify-center rounded-cd-strip bg-surface-tertiary text-muted sm:mb-1 sm:size-13 sm:rounded-cd-icon"
        data-testid="tr-empty-icon"
      >
        <Dumbbell className="size-5.5 sm:size-6" />
      </span>
      <div
        className="font-grotesk text-metric-sm font-semibold sm:text-metric"
        data-testid="tr-empty-title"
      >
        No training plan
      </div>
      <div
        className="text-sub text-muted sm:max-w-70 sm:text-pill"
        data-testid="tr-empty-sub"
      >
        Assign a plan so {client.first_name ?? 'this client'} sees workouts in their app.
      </div>
      <AssignSurface
        label="Assign plan"
        triggerClassName={`${CD_BTN_A} mt-2.25 h-9 px-3.75 sm:mt-2.5 sm:h-9.5`}
        triggerTestId="tr-empty-btn"
      >
        {(close) => (
          <PlanAssignContent
            clientId={client.id}
            clientName={client.first_name ?? 'this client'}
            kind="training"
            onClose={close}
          />
        )}
      </AssignSurface>
    </div>
  );
}

export default function TrainingTab({client}: {client: Client}) {
  const isDesktop = useIsDesktop();
  const plans = useListCoachClientTrainingPlansQuery({clientId: client.id});
  const sessionsQuery = useCoachClientTrainingSessionsInfiniteQuery({clientId: client.id});
  const sessions = useInfiniteItems(sessionsQuery);
  const plan = activePlan(plans.data?.data);

  const rows = useMemo(() => buildRows(sessions.items, plan), [plan, sessions.items]);
  const hasMore = sessionsQuery.hasNextPage;

  return (
    <div className="flex flex-col gap-3 p-3.5 sm:gap-4 sm:p-0">
      {plans.isLoading ? (
        <CdCardSkeleton lines={2} />
      ) : plans.isError ? (
        <CdCardError
          label="training"
          onRetry={plans.refetch}
        />
      ) : plan ? (
        <PlanCard
          client={client}
          plan={plan}
        />
      ) : (
        <EmptyPlanCard client={client} />
      )}

      {sessions.isLoading ? (
        <CdCardSkeleton />
      ) : sessions.isError ? (
        <CdCardError
          label="training"
          onRetry={sessions.refetch}
        />
      ) : rows.length === 0 ? (
        <div className={`${CD_CARD} px-3.5 py-6 text-center sm:px-4.5`}>
          {/* plain span: tw-merge drops the size token when a text-color class
              rides along in a HeroUI className (field-notes) */}
          <span className="text-sub [color:var(--color-muted)] sm:text-pill">
            No workouts logged yet. Sessions appear here as {client.first_name ?? 'this client'} completes them.
          </span>
        </div>
      ) : (
        <div
          className={`${CD_CARD} px-3.5 pt-1.5 pb-2.5 sm:px-4.5 sm:pt-2 sm:pb-3`}
          data-testid="tr-history"
        >
          <ul>
            {rows.map((row, index) => {
              if (row.kind === 'group') {
                return (
                  <li
                    className={GRP}
                    data-testid="tr-group"
                    key={`group-${row.label}`}
                  >
                    {row.label}
                  </li>
                );
              }
              const previous = rows[index - 1];
              const needsSeparator = previous != null && previous.kind !== 'group';
              return (
                <li key={row.id}>
                  {needsSeparator ? (
                    <div
                      className={SEP}
                      data-testid="tr-row-sep"
                    />
                  ) : null}
                  {row.kind === 'session' ? (
                    <Link
                      className={`${ROW} transition-colors hover:bg-background`}
                      data-testid="tr-row"
                      to={ROUTES.CLIENT_SESSION_DETAIL.replace(':clientId', client.id).replace(
                        ':sessionId',
                        row.session.id,
                      )}
                    >
                      {isDesktop ? (
                        <span
                          className={ROW_DATE}
                          data-testid="tr-row-date"
                        >
                          {formatRowDate(row.date, {withMonth: true})}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-note font-bold sm:text-row"
                          data-testid="tr-row-title"
                        >
                          {row.title}
                        </span>
                        <span
                          className={`block ${ROW_META}`}
                          data-testid="tr-row-meta"
                        >
                          {sessionMeta(row.session, isDesktop)}
                        </span>
                      </span>
                      <Chip
                        className={`${CD_CHIP} bg-success-soft [color:var(--color-success-soft-foreground)]`}
                        data-testid="tr-row-chip"
                      >
                        Completed
                      </Chip>
                    </Link>
                  ) : (
                    <div
                      className={ROW}
                      data-testid="tr-missed-row"
                    >
                      {isDesktop ? (
                        <span className={ROW_DATE}>{formatRowDate(row.date, {withMonth: true})}</span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-note font-semibold text-muted sm:text-row"
                          data-testid="tr-missed-title"
                        >
                          {row.title}
                        </span>
                        <span
                          className={`block ${ROW_META}`}
                          data-testid="tr-missed-meta"
                        >
                          {isDesktop
                            ? 'No session logged'
                            : `${formatRowDate(row.date, {withMonth: false})} · no session`}
                        </span>
                      </span>
                      <Chip
                        className={`${CD_CHIP} bg-danger-soft [color:var(--color-danger-soft-foreground)]`}
                        data-testid="tr-missed-chip"
                      >
                        Missed
                      </Chip>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button
                className={`${CD_BTN_G} h-9 px-3.75`}
                isPending={sessions.isFetchingNextPage}
                onPress={() => sessions.fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
