/**
 * CD/CI — Check-ins tab. Spec §6.1–6.4; design data-ref CD-CI-{desktop,mobile}.
 * Schedule card + history + intake (left column) and the progress-photos card
 * (right column on desktop). Style fidelity: manifests/CD-CI.json.
 */
import {Button, Chip, ListBox, Select, Switch, toast} from '@heroui/react';
import {CalendarClock, ChevronRight, ClipboardList} from 'lucide-react';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {
  type ClientProfileCheckInSchedule,
  useListCheckInSchedulesForClientQuery,
  useListClientFormAssignmentsForCoachQuery,
  useUpdateCheckInScheduleMutation,
} from '@/api/checkins';
import type {Client, ClientProfileFormAssignment} from '@/api/generated';
import {getApiErrorMessage} from '@/api/shared';
import {formatShortDate, snapshotQuestions} from '@/clients/client-detail/data';
import {ACCENT_BUTTON, CARD, CardError, CardSkeleton, CHIP, EYEBROW, PhotoThumb} from '@/clients/client-detail/ui';
import AssignSurface from '@/clients/components/assign-surface';
import CheckinAssignContent from '@/clients/components/checkin-assign-content';

const GRP = 'px-0 pt-2 pb-1.5 type-eyebrow font-bold uppercase tracking-grp text-muted';
const ROW = 'flex items-center gap-3 rounded-panel px-1 py-3 sm:px-2';
const ROW_TEXT = 'type-title font-normal leading-[normal] text-foreground';
const SETTING_ROW = 'flex items-center justify-between py-1';
const SETTING_LABEL = 'type-eyebrow text-muted';
const OUT_CHIP = `${CHIP} border border-border bg-transparent font-semibold [color:var(--color-muted)]`;

const FREQUENCIES = [
  {id: 'once', label: 'Once'},
  {id: 'weekly', label: 'Weekly'},
  {id: 'biweekly', label: 'Every 2 weeks'},
  {id: 'monthly', label: 'Monthly'},
] as const;

function ScheduleCard({schedule}: {schedule: ClientProfileCheckInSchedule}) {
  const [updateSchedule] = useUpdateCheckInScheduleMutation();

  const patch = async (
    body: Parameters<typeof updateSchedule>[0]['clientProfileCheckInScheduleUpdateRequest'],
    message: string,
  ) => {
    try {
      await updateSchedule({clientProfileCheckInScheduleUpdateRequest: body, id: schedule.id}).unwrap();
      toast.success(message);
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Schedule wasn't updated"));
    }
  };

  const isDue = schedule.next_due_on <= new Date().toISOString().slice(0, 10);

  return (
    <div
      className={`${CARD} p-4 sm:px-4 sm:py-4`}
      data-testid="ci-sched"
    >
      <div
        className={`${EYEBROW} mb-3 sm:mb-3`}
        data-testid="ci-sched-eyebrow"
      >
        Check-in schedule
      </div>
      <Link
        className="flex items-center gap-3"
        data-testid="ci-form-row"
        to={ROUTES.EDIT_CHECKIN.replace(':id', schedule.form_template_id)}
      >
        <span
          className="flex size-9 flex-none items-center justify-center rounded-control bg-accent-soft text-accent sm:size-9.5"
          data-testid="ci-form-icon"
        >
          <ClipboardList className="sm:size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block type-body font-bold"
            data-testid="ci-form-title"
          >
            {schedule.form_template.name}
          </span>
          <span
            className="block type-eyebrow text-muted sm:mt-0.5"
            data-testid="ci-form-sub"
          >
            Form
          </span>
        </span>
        <ChevronRight className="text-muted" />
      </Link>
      <div
        className="my-3 h-px bg-border"
        data-testid="ci-sched-sep"
      />
      <div className={SETTING_ROW}>
        <span
          className={SETTING_LABEL}
          data-testid="ci-freq-label"
        >
          Frequency
        </span>
        <Select
          aria-label="Check-in frequency"
          onSelectionChange={(key) =>
            patch({frequency: key as ClientProfileCheckInSchedule['frequency']}, 'Schedule updated')
          }
          selectedKey={schedule.frequency}
        >
          <Button
            className="h-7.5 min-h-0 gap-2 rounded-control border border-border bg-background px-3 type-eyebrow font-semibold text-foreground [box-shadow:none] sm:h-8"
            data-testid="ci-freq-ctl"
            variant="ghost"
          >
            <Select.Value />
          </Button>
          <Select.Popover>
            <ListBox>
              {FREQUENCIES.map((option) => (
                <ListBox.Item
                  id={option.id}
                  key={option.id}
                  textValue={option.label}
                >
                  {option.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      <div className={`${SETTING_ROW} py-2`}>
        <span
          className={SETTING_LABEL}
          data-testid="ci-next-label"
        >
          Next check-in
        </span>
        <span className="flex items-center gap-2">
          <span
            className="type-eyebrow font-semibold"
            data-testid="ci-next-value"
          >
            {formatShortDate(schedule.next_due_on)}
          </span>
          {isDue ? (
            <Chip className={`${CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}>Due now</Chip>
          ) : null}
        </span>
      </div>
      <div className={SETTING_ROW}>
        <span
          className={SETTING_LABEL}
          data-testid="ci-active-label"
        >
          Active
        </span>
        {/* HeroUI Switch renders nothing without its compound children */}
        <Switch
          aria-label="Schedule active"
          isSelected={schedule.active}
          onChange={(active) => patch({active}, active ? 'Check-ins resumed' : 'Check-ins paused')}
        >
          <Switch.Content className="group/switch">
            <Switch.Control className="h-5.5 w-9.5 rounded-pill group-data-[selected=true]/switch:bg-success">
              <Switch.Thumb className="size-4.5" />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
    </div>
  );
}

function HistoryCard({assignments, clientId}: {assignments: ClientProfileFormAssignment[]; clientId: string}) {
  const isDesktop = useIsDesktop();
  const rows = assignments
    .filter((a) => a.purpose === 'check_in')
    .sort((a, b) =>
      (b.latest_submission?.submitted_at ?? b.due_date ?? '').localeCompare(
        a.latest_submission?.submitted_at ?? a.due_date ?? '',
      ),
    );

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={`${CARD} px-3 pt-1.5 pb-2 sm:px-4 sm:pt-2 sm:pb-3`}
      data-testid="ci-history"
    >
      <div
        className={GRP}
        data-testid="ci-group"
      >
        History
      </div>
      <ul>
        {rows.map((assignment, index) => {
          const submission = assignment.latest_submission;
          const isMissed = assignment.status === 'missed';
          const submittedLabel = submission ? `Submitted ${formatShortDate(submission.submitted_at)}` : null;
          const chip = submission ? (
            submission.reviewed_at ? (
              <Chip
                className={OUT_CHIP}
                data-testid="ci-chip-reviewed"
              >
                Reviewed
              </Chip>
            ) : (
              <Chip
                className={`${CHIP} bg-warning-soft [color:var(--color-warning-soft-foreground)]`}
                data-testid="ci-chip-needs"
              >
                Needs review
              </Chip>
            )
          ) : isMissed ? (
            <Chip className={`${CHIP} bg-danger-soft [color:var(--color-danger-soft-foreground)]`}>Missed</Chip>
          ) : (
            <Chip className={OUT_CHIP}>
              {assignment.due_date ? `Due ${formatShortDate(assignment.due_date)}` : 'Assigned'}
            </Chip>
          );

          const body = isDesktop ? (
            <>
              <span
                className="min-w-0 flex-1 type-body font-bold"
                data-testid="ci-row-title"
              >
                {assignment.form_template.name}
              </span>
              {submittedLabel ? <span className="type-eyebrow text-muted">{submittedLabel}</span> : null}
              {chip}
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1">
                <span
                  className="block type-body font-bold"
                  data-testid="ci-row-title"
                >
                  {assignment.form_template.name}
                </span>
                {submittedLabel ? <span className="mt-0.5 block type-eyebrow text-muted">{submittedLabel}</span> : null}
              </span>
              {chip}
            </>
          );

          return (
            <li key={assignment.id}>
              {index > 0 ? (
                <div
                  className="h-px bg-border"
                  data-testid="ci-row-sep"
                />
              ) : null}
              {submission ? (
                <Link
                  className={`${ROW} ${ROW_TEXT} transition-colors hover:bg-background`}
                  data-testid="ci-row"
                  to={ROUTES.CLIENT_CHECKIN_SUBMISSION.replace(':id', clientId).replace(':assignmentId', assignment.id)}
                >
                  {body}
                </Link>
              ) : (
                <div className={`${ROW} ${ROW_TEXT} ${isMissed ? '[&>span]:text-muted' : ''}`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IntakeCard({
  assignments,
  clientId,
  isDesktop,
}: {
  assignments: ClientProfileFormAssignment[];
  clientId: string;
  isDesktop: boolean;
}) {
  const intake = assignments.find((a) => a.purpose === 'intake');
  if (!intake) {
    return null;
  }
  const submission = intake.latest_submission;

  return (
    <div
      className={`${CARD} p-4 sm:px-4 sm:py-4`}
      data-testid="ci-intake"
    >
      <div
        className={`${EYEBROW} mb-2 sm:mb-3`}
        data-testid="ci-intake-eyebrow"
      >
        Intake
      </div>
      <Link
        className={`${ROW_TEXT} -mx-1 -my-1 flex items-center gap-3 rounded-panel px-1 py-1 sm:-mx-2 sm:-my-1.5 sm:px-2 sm:py-1.5`}
        data-testid="ci-intake-row"
        to={ROUTES.CLIENT_INTAKE.replace(':id', clientId)}
      >
        <span
          className="min-w-0 flex-1 type-body font-bold"
          data-testid="ci-intake-title"
        >
          {intake.form_template.name}
        </span>
        <Chip
          className={OUT_CHIP}
          data-testid="ci-intake-chip"
        >
          {submission
            ? isDesktop
              ? `Submitted ${formatShortDate(submission.submitted_at)}`
              : formatShortDate(submission.submitted_at)
            : 'Not submitted'}
        </Chip>
        <ChevronRight className="text-muted" />
      </Link>
    </div>
  );
}

function PhotosCard({assignments, clientId}: {assignments: ClientProfileFormAssignment[]; clientId: string}) {
  const photoIds = useMemo(() => {
    const ids: string[] = [];
    for (const assignment of assignments) {
      const submission = assignment.latest_submission;
      if (!submission) {
        continue;
      }
      for (const question of snapshotQuestions(submission.question_snapshot)) {
        if (question.type === 'photo' && question.id && Array.isArray(submission.answers[question.id])) {
          ids.push(...(submission.answers[question.id] as string[]));
        }
      }
    }
    return ids;
  }, [assignments]);

  const {urls} = useAttachmentDownloadUrls(photoIds.slice(0, 3));
  if (photoIds.length === 0) {
    return null;
  }
  const shown = photoIds.slice(0, 3);
  const overflow = photoIds.length - shown.length;

  return (
    <Link
      className={`${CARD} cursor-pointer p-4 sm:px-4 sm:py-4`}
      data-testid="ci-photos"
      to={ROUTES.CLIENT_PHOTOS.replace(':id', clientId)}
    >
      <div
        className={`${EYEBROW} mb-3 sm:mb-3`}
        data-testid="ci-photos-eyebrow"
      >
        Progress photos
      </div>
      <div className="grid grid-cols-2 gap-2">
        {shown.map((id) => (
          <PhotoThumb
            className="flex aspect-square items-center justify-center overflow-hidden rounded-panel bg-surface-tertiary text-muted/60"
            iconClassName="size-5.5"
            key={id}
            src={urls[id]}
            testId="ci-photo-tile"
          />
        ))}
        {overflow > 0 ? (
          <span
            className="flex aspect-square items-center justify-center rounded-panel bg-always-dark type-body font-bold [color:white] [font-family:'Space_Grotesk'] sm:type-title"
            data-testid="ci-photo-overflow"
          >
            +{overflow}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default function CheckinsTab({client}: {client: Client}) {
  const isDesktop = useIsDesktop();
  const schedules = useListCheckInSchedulesForClientQuery({clientId: client.id});
  const assignments = useListClientFormAssignmentsForCoachQuery({clientId: client.id});

  const schedule = (schedules.data?.data ?? [])[0];
  const rows = assignments.data?.data ?? [];

  if (schedules.isLoading || assignments.isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-0">
        <CardSkeleton lines={4} />
      </div>
    );
  }
  if (schedules.isError && assignments.isError) {
    return (
      <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-0">
        <CardError
          label="check-ins"
          onRetry={() => {
            schedules.refetch();
            assignments.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_320px] sm:items-start sm:gap-4 sm:p-0"
      data-testid="ci-root"
    >
      <div className="flex min-w-0 flex-col gap-3">
        {schedule ? (
          <>
            <ScheduleCard schedule={schedule} />
            <HistoryCard
              assignments={rows}
              clientId={client.id}
            />
          </>
        ) : (
          <div
            className={`${CARD} flex flex-col items-center gap-1 px-4 py-7 text-center sm:gap-1.5 sm:px-5 sm:py-8`}
            data-testid="ci-empty"
          >
            <span
              className="mb-0.5 flex size-11.5 items-center justify-center rounded-panel bg-surface-tertiary text-muted sm:size-12.5"
              data-testid="ci-empty-icon"
            >
              <CalendarClock className="size-5 sm:size-6" />
            </span>
            <div
              className="font-grotesk type-body font-semibold sm:type-title"
              data-testid="ci-empty-title"
            >
              No check-in schedule
            </div>
            <div
              className="type-eyebrow text-muted sm:max-w-75"
              data-testid="ci-empty-sub"
            >
              Set a cadence and {client.first_name ?? 'this client'} will get the form automatically.
            </div>
            <AssignSurface
              label="Set up check-ins"
              popoverClassName="p-4"
              triggerClassName={`${ACCENT_BUTTON} mt-2 h-9 px-4 sm:mt-2 sm:h-9.5`}
              triggerTestId="ci-empty-btn"
            >
              {(close) => (
                <CheckinAssignContent
                  clientId={client.id}
                  clientName={client.first_name ?? 'this client'}
                  onClose={close}
                />
              )}
            </AssignSurface>
          </div>
        )}
        <IntakeCard
          assignments={rows}
          clientId={client.id}
          isDesktop={isDesktop}
        />
      </div>
      <PhotosCard
        assignments={rows}
        clientId={client.id}
      />
    </div>
  );
}
