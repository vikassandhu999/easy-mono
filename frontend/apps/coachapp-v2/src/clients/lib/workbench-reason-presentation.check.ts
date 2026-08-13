import {
  presentCheckInReason,
  presentExpiringReason,
  presentOnboardingReason,
  presentProgrammingReason,
  presentQuietReason,
  presentReplyReason,
  showCallUtility,
} from './workbench-reason-presentation.ts';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function assertTrue(value: boolean, label: string) {
  if (!value) {
    throw new Error(label);
  }
}

assertEqual(
  presentOnboardingReason({
    code: 'invitation_follow_up_due',
    follow_up_due_at: '2026-08-10T00:00:00Z',
    invitation_id: 'inv-1',
    sent_at: '2026-08-07T00:00:00Z',
  }),
  {
    action: 'Resend invitation',
    description: 'Sent 7 Aug · follow-up due 10 Aug',
    title: 'Invitation follow-up due',
  },
  'invitation reason',
);

assertEqual(
  presentOnboardingReason({
    assignment_id: 'asg-1',
    code: 'intake_overdue',
    due_on: '2026-08-11',
  }),
  {
    action: 'Send reminder',
    description: 'Due 11 Aug',
    title: 'Intake overdue',
  },
  'intake reason',
);

assertTrue(showCallUtility('+15551234567'), 'phone present');
assertTrue(!showCallUtility(null), 'phone absent');
assertTrue(!showCallUtility(''), 'phone blank');

assertEqual(
  presentProgrammingReason({code: 'service_never_programmed', service: 'training'}),
  {
    action: 'Plan Training',
    detail: 'No training plan has ever been assigned',
    groupLabel: 'Never programmed',
    service: 'training',
    title: 'Never programmed',
  },
  'never programmed',
);

assertEqual(
  presentProgrammingReason(
    {code: 'service_coverage_missing', first_uncovered_on: '2026-08-11', service: 'nutrition'},
    '2026-08-13',
  ),
  {
    action: 'Plan Nutrition',
    detail: 'Nutrition uncovered since 11 Aug',
    groupLabel: 'Coverage lapsed',
    service: 'nutrition',
    title: 'Coverage lapsed',
  },
  'coverage missing',
);

assertEqual(
  presentProgrammingReason(
    {
      code: 'service_coverage_ending_soon',
      coverage_ends_on: '2026-08-13',
      first_uncovered_on: '2026-08-14',
      service: 'training',
    },
    '2026-08-13',
  ),
  {
    action: 'Plan Training',
    detail: 'Training ends today · uncovered 14 Aug',
    groupLabel: 'Ending soon',
    service: 'training',
    title: 'Ending soon',
  },
  'ending soon',
);

assertEqual(
  presentExpiringReason({code: 'engagement_ending_soon', ends_on: '2026-08-20'}),
  {
    action: 'Renew',
    description: 'Ends 20 Aug',
    title: 'Engagement ending soon',
  },
  'expiring',
);

assertEqual(
  presentQuietReason({assignment_id: 'asg-2', code: 'missed_check_in', due_on: '2026-08-01'}),
  {
    action: 'Message',
    description: 'Missed check-in due 1 Aug',
    title: 'Missed check-in',
  },
  'quiet',
);

assertEqual(
  presentCheckInReason({
    code: 'check_in_awaiting_review',
    submission_id: 'sub-1',
    submitted_at: '2026-08-12T15:00:00Z',
  }),
  {
    action: 'Review',
    description: 'Submitted 12 Aug',
    title: 'Awaiting review',
  },
  'check-in',
);

assertEqual(
  presentReplyReason({code: 'reply_needed', waiting_since: '2026-08-11T12:00:00Z'}, '2026-08-13T12:00:00Z'),
  {
    description: 'Waiting 2d',
    title: 'Reply needed',
  },
  'reply',
);

console.log('workbench-reason-presentation: all checks passed');
