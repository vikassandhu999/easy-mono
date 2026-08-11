import {Chip, ListBox, Select, Switch, Typography, toast} from '@heroui/react';
import {CalendarCheck, ChevronRight, ClipboardList} from 'lucide-react';
import {Link} from 'react-router-dom';

import {EmptyState} from '@/@components/empty-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import useAttachmentDownloadUrls from '@/@hooks/use-attachment-download-urls';
import type {ClientProfileCheckInSchedule} from '@/api/checkins';
import {
  useListCheckInSchedulesForClientQuery,
  useListClientFormAssignmentsForCoachQuery,
  useUpdateCheckInScheduleMutation,
} from '@/api/checkins';
import type {Client} from '@/api/clients';
import {submissionPhotoIds} from '@/checkins/lib/form-answers';
import {PhotoThumb} from '@/clients/components/photo-thumb';
import {SectionCard} from '@/clients/components/section-card';
import {formatDayMonth} from '@/clients/lib/client-detail-data';

/** CD-CI: the schedule, submission history, the intake row, and the photos rail. */
export function CheckinsTab({client}: {client: Client}) {
  const schedules = useListCheckInSchedulesForClientQuery(client.id);
  const forms = useListClientFormAssignmentsForCoachQuery(client.id);

  const schedule = schedules.data?.data?.[0];
  const assignments = forms.data?.data ?? [];
  // Newest first. The endpoint does not promise an order, and it came back with
  // 9 Jul above 16 Jul — sort on the submission date, falling back to the due date
  // so a missed check-in still lands in the right place.
  const checkIns = assignments
    .filter((a) => a.purpose === 'check_in')
    .sort((a, b) =>
      (b.latest_submission?.submitted_at ?? b.due_date ?? '').localeCompare(
        a.latest_submission?.submitted_at ?? a.due_date ?? '',
      ),
    );
  const intake = assignments.find((a) => a.purpose === 'intake');
  const photos = checkIns.flatMap((a) => (a.latest_submission ? submissionPhotoIds(a.latest_submission) : []));

  const submissionPath = (assignmentId: string) =>
    ROUTES.CLIENT_CHECKIN_SUBMISSION.replace(':id', client.id).replace(':assignmentId', assignmentId);

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        {schedule ? (
          <ScheduleCard schedule={schedule} />
        ) : (
          <SectionCard>
            <EmptyState
              body={`Set a cadence and ${client.first_name ?? 'this client'} will get the form automatically.`}
              icon={CalendarCheck}
              title="No check-in schedule"
            />
          </SectionCard>
        )}

        {checkIns.length > 0 && (
          <SectionCard
            divided
            title="History"
          >
            {checkIns.map((assignment) => {
              const submission = assignment.latest_submission;
              const submittedOn = submission?.submitted_at?.slice(0, 10);
              const needsReview = Boolean(submission && !assignment.latest_submission_reviewed_at);
              return (
                <div
                  className="px-2"
                  key={assignment.id}
                >
                  <HistoryRow
                    // The design puts the date and the state side by side on ONE
                    // line, and a missed check-in is a danger chip rather than a
                    // meta line reading "Missed".
                    date={submittedOn ? `Submitted ${formatDayMonth(submittedOn)}` : undefined}
                    status={
                      submission ? (
                        <Chip
                          color={needsReview ? 'warning' : 'default'}
                          size="sm"
                          variant="soft"
                        >
                          {needsReview ? 'Needs review' : 'Reviewed'}
                        </Chip>
                      ) : (
                        <Chip
                          color="danger"
                          size="sm"
                          variant="soft"
                        >
                          Missed
                        </Chip>
                      )
                    }
                    title={assignment.form_template.name}
                    to={submission ? submissionPath(assignment.id) : undefined}
                  />
                </div>
              );
            })}
          </SectionCard>
        )}

        {intake && (
          <SectionCard title="Intake">
            <div className="px-2 pb-2">
              <HistoryRow
                status={
                  <Chip
                    className="chip--outline"
                    size="sm"
                  >
                    {intake.latest_submission?.submitted_at
                      ? `Submitted ${formatDayMonth(intake.latest_submission.submitted_at.slice(0, 10))}`
                      : 'Not submitted yet'}
                  </Chip>
                }
                title={intake.form_template.name}
                to={intake.latest_submission ? ROUTES.CLIENT_INTAKE.replace(':id', client.id) : undefined}
              />
            </div>
          </SectionCard>
        )}
      </div>

      {/* The rail is unconditional, as the design draws it — empty tiles when the
          client has not sent photos yet, so the column never collapses. */}
      <PhotosCard
        photoIds={photos}
        to={ROUTES.CLIENT_PHOTOS.replace(':id', client.id)}
      />
    </div>
  );
}

/**
 * The schedule is EDITED here, not just described: the design gives it a Frequency
 * select and an Active switch, and both mutate on change (INTERACTIONS §CD). The
 * summary line it replaced could only be read.
 */
function ScheduleCard({schedule}: {schedule: ClientProfileCheckInSchedule}) {
  const updateScheduleMutation = useUpdateCheckInScheduleMutation();
  const isLoading = updateScheduleMutation.isPending;

  const save = (body: {active?: boolean; frequency?: Frequency}, done: string) =>
    updateScheduleMutation
      .mutateAsync({body, id: schedule.id})
      .then(() => toast.success(done, {timeout: 1000}))
      .catch((error) => toastMutationError(error, "The schedule wasn't updated. Try again."));

  return (
    <SectionCard title="Check-in schedule">
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9.5 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
            <ClipboardList className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <Typography
              truncate
              type="body-sm"
              weight="bold"
            >
              {schedule.form_template?.name ?? 'Check-in'}
            </Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              Form
            </Typography>
          </div>
        </div>

        <div className="my-4 border-t border-border" />

        <div className="flex items-center justify-between gap-3 py-1">
          <Typography
            color="muted"
            type="body-xs"
          >
            Frequency
          </Typography>
          <Select
            aria-label="Check-in frequency"
            isDisabled={isLoading}
            onSelectionChange={(key) => save({frequency: key as Frequency}, 'Schedule updated')}
            selectedKey={schedule.frequency}
          >
            <Select.Trigger className="w-auto">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {FREQUENCIES.map((f) => (
                  <ListBox.Item
                    id={f.id}
                    key={f.id}
                    textValue={f.label}
                  >
                    {f.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 py-2">
          <Typography
            color="muted"
            type="body-xs"
          >
            Next check-in
          </Typography>
          <Typography
            type="body-xs"
            weight="semibold"
          >
            {schedule.next_due_on ? formatDayMonth(schedule.next_due_on) : '—'}
          </Typography>
        </div>

        <div className="flex items-center justify-between gap-3 py-1">
          <Typography
            color="muted"
            type="body-xs"
          >
            Active
          </Typography>
          <Switch
            aria-label="Check-ins active"
            isDisabled={isLoading}
            isSelected={schedule.active}
            onChange={(next) => save({active: next}, next ? 'Check-ins resumed' : 'Check-ins paused')}
          >
            {/* `Switch` renders nothing without its compound children. */}
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>
      </div>
    </SectionCard>
  );
}

type Frequency = NonNullable<ClientProfileCheckInSchedule['frequency']>;

const FREQUENCIES: {id: Frequency; label: string}[] = [
  {id: 'once', label: 'Once'},
  {id: 'weekly', label: 'Weekly'},
  {id: 'biweekly', label: 'Every 2 weeks'},
  {id: 'monthly', label: 'Monthly'},
];

/** Title, then the date and the state on the same line — the design's history row. */
function HistoryRow({date, status, title, to}: {date?: string; status: React.ReactNode; title: string; to?: string}) {
  const shape = 'flex w-full items-center gap-3 rounded-panel px-2 py-3 text-left';
  const body = (
    <>
      <Typography
        className={`min-w-0 flex-1 ${to ? '' : 'text-muted'}`}
        truncate
        type="body-sm"
        weight={to ? 'bold' : 'semibold'}
      >
        {title}
      </Typography>
      {date && (
        <Typography
          className="shrink-0"
          color="muted"
          type="body-xs"
        >
          {date}
        </Typography>
      )}
      <span className="shrink-0">{status}</span>
      {to && <ChevronRight className="shrink-0 text-muted-2" />}
    </>
  );

  return to ? (
    <Link
      className={`${shape} hover:bg-background`}
      to={to}
    >
      {body}
    </Link>
  ) : (
    <div className={shape}>{body}</div>
  );
}

/**
 * The rail card: the four newest photos, with the last tile becoming a `+N` count
 * when there are more. The whole card navigates to CD-PH.
 */
function PhotosCard({photoIds, to}: {photoIds: string[]; to: string}) {
  const shown = photoIds.slice(0, 4);
  const overflow = photoIds.length - shown.length;
  const {urls} = useAttachmentDownloadUrls(shown);
  // Always four slots; missing ones are the design's empty tile.
  const slots = [0, 1, 2, 3].map((index) => shown[index] ?? null);

  return (
    <SectionCard title="Progress photos">
      <Link
        aria-label={`View ${photoIds.length} progress photos`}
        className="block px-4 pb-4"
        to={to}
      >
        <div className="grid grid-cols-2 gap-2">
          {slots.map((id, index) =>
            overflow > 0 && index === 3 ? (
              <span
                className="flex aspect-square w-full items-center justify-center rounded-panel bg-ink font-grotesk type-title font-bold text-ink-foreground"
                key="overflow"
              >
                +{overflow}
              </span>
            ) : (
              <PhotoThumb
                alt="Progress photo"
                fill
                key={id ?? `empty-${index}`}
                src={id ? urls[id] : undefined}
              />
            ),
          )}
        </div>
      </Link>
    </SectionCard>
  );
}
