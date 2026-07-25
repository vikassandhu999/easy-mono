import {Button, Chip, Typography} from '@heroui/react';
import {CalendarCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {EmptyState} from '@/@components/empty-state';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {useListCheckInSchedulesForClientQuery, useListClientFormAssignmentsForCoachQuery} from '@/api/generated';
import {DetailRow} from '@/clients/components/detail-row';
import {SectionCard} from '@/clients/components/section-card';
import {formatDayMonth} from '@/clients/lib/client-detail-data';

/** CD-CI: the schedule, submission history, and the intake row. */
export function CheckinsTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const schedules = useListCheckInSchedulesForClientQuery({clientId: client.id});
  const forms = useListClientFormAssignmentsForCoachQuery({clientId: client.id});

  const schedule = schedules.data?.data?.[0];
  const assignments = forms.data?.data ?? [];
  const checkIns = assignments.filter((a) => a.purpose === 'check_in');
  const intake = assignments.find((a) => a.purpose === 'intake');

  const submissionPath = (assignmentId: string) =>
    ROUTES.CLIENT_CHECKIN_SUBMISSION.replace(':id', client.id).replace(':assignmentId', assignmentId);

  return (
    <div className="flex flex-col gap-4">
      {schedule ? (
        <SectionCard title="Check-in schedule">
          <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
            <div className="min-w-0 flex-1">
              <Typography
                truncate
                type="body-sm"
                weight="semibold"
              >
                {schedule.form_template?.name ?? 'Check-in'}
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {[schedule.frequency, schedule.next_due_on ? `Next ${formatDayMonth(schedule.next_due_on)}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </div>
            <Chip
              color={schedule.active ? 'success' : 'default'}
              size="sm"
              variant="soft"
            >
              {schedule.active ? 'Active' : 'Paused'}
            </Chip>
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <EmptyState
            action={
              <Button
                onPress={() => navigate(ROUTES.CLIENT_DETAILS.replace(':id', client.id))}
                variant="outline"
              >
                Set up check-ins
              </Button>
            }
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
                <DetailRow
                  meta={submittedOn ? `Submitted ${formatDayMonth(submittedOn)}` : 'Missed'}
                  title={assignment.form_template.name}
                  to={submission ? submissionPath(assignment.id) : undefined}
                  tone={submission ? 'default' : 'muted'}
                  trailing={
                    submission && (
                      <Chip
                        color={needsReview ? 'warning' : 'success'}
                        size="sm"
                        variant="soft"
                      >
                        {needsReview ? 'Needs review' : 'Reviewed'}
                      </Chip>
                    )
                  }
                />
              </div>
            );
          })}
        </SectionCard>
      )}

      {intake && (
        <SectionCard
          divided
          title="Intake"
        >
          <div className="px-2">
            <DetailRow
              meta={
                intake.latest_submission?.submitted_at
                  ? `Submitted ${formatDayMonth(intake.latest_submission.submitted_at.slice(0, 10))}`
                  : 'Not submitted yet'
              }
              title={intake.form_template.name}
              to={intake.latest_submission ? ROUTES.CLIENT_INTAKE.replace(':id', client.id) : undefined}
              tone={intake.latest_submission ? 'default' : 'muted'}
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
