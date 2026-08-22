import type {components} from '../api/schema.ts';

type OnboardingReason = components['schemas']['WorkbenchOnboardingReason'];
type ProgrammingReason = components['schemas']['WorkbenchProgrammingReason'];
type ExpiringReason = components['schemas']['EngagementEndingSoonReason'];
type QuietReason = components['schemas']['MissedCheckInReason'];
type CheckInReason = components['schemas']['CheckInAwaitingReviewReason'];
type ReplyReason = components['schemas']['ReplyNeededReason'];
type ReplyClientStatus = components['schemas']['WorkbenchRepliesQueueItem']['client_status'];

export type ReasonPresentation = {
  action: string;
  description: string;
  title: string;
};

export type ProgrammingReasonPresentation = {
  action: string;
  detail: string;
  groupLabel: string;
  service: 'nutrition' | 'training';
  title: string;
};

/** Absolute calendar date from an API date or date-time, UTC-stable for checks. */
export function formatWorkbenchDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );
}

export function showCallUtility(phone: null | string | undefined): boolean {
  return Boolean(phone?.trim());
}

export function presentOnboardingReason(reason: OnboardingReason): ReasonPresentation {
  switch (reason.code) {
    case 'intake_overdue':
      return {
        action: 'Send reminder',
        description: `${reason.form_title} · due ${formatWorkbenchDate(reason.due_on)}`,
        title: 'Intake overdue',
      };
    case 'invitation_follow_up_due':
      return {
        action: 'Resend invitation',
        description: `Sent ${formatWorkbenchDate(reason.sent_at)} · follow-up due ${formatWorkbenchDate(reason.follow_up_due_at)}`,
        title: 'Invitation follow-up due',
      };
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function serviceLabel(service: 'nutrition' | 'training'): string {
  return service === 'training' ? 'Training' : 'Nutrition';
}

export function presentProgrammingReason(
  reason: ProgrammingReason,
  today = new Date().toISOString().slice(0, 10),
): ProgrammingReasonPresentation {
  const service = reason.service;
  const action = `Plan ${serviceLabel(service)}`;

  switch (reason.code) {
    case 'service_never_programmed':
      return {
        action,
        detail: `No ${service} plan has ever been assigned`,
        groupLabel: 'Never programmed',
        service,
        title: 'Never programmed',
      };
    case 'service_coverage_missing':
      return {
        action,
        detail: `${serviceLabel(service)} uncovered since ${formatWorkbenchDate(reason.first_uncovered_on)}`,
        groupLabel: 'Coverage lapsed',
        service,
        title: 'Coverage lapsed',
      };
    case 'service_coverage_ending_soon': {
      const ends =
        reason.coverage_ends_on === today ? 'ends today' : `ends ${formatWorkbenchDate(reason.coverage_ends_on)}`;
      return {
        action,
        detail: `${serviceLabel(service)} ${ends} · uncovered ${formatWorkbenchDate(reason.first_uncovered_on)}`,
        groupLabel: 'Ending soon',
        service,
        title: 'Ending soon',
      };
    }
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function presentExpiringReason(reason: ExpiringReason): ReasonPresentation {
  return {
    action: 'Renew',
    description: `Ends ${formatWorkbenchDate(reason.ends_on)}`,
    title: 'Engagement ending soon',
  };
}

export function presentQuietReason(reason: QuietReason): ReasonPresentation {
  return {
    action: 'Message',
    description: `Missed check-in due ${formatWorkbenchDate(reason.due_on)}`,
    title: 'Missed check-in',
  };
}

export function presentCheckInReason(reason: CheckInReason): ReasonPresentation {
  return {
    action: 'Review',
    description: `Submitted ${formatWorkbenchDate(reason.submitted_at)}`,
    title: 'Awaiting review',
  };
}

const HOUR_MS = 60 * 60 * 1000;

export function presentReplyReason(
  reason: ReplyReason,
  nowIso = new Date().toISOString(),
): {description: string; title: string} {
  const hours = Math.max(
    Math.floor((new Date(nowIso).getTime() - new Date(reason.waiting_since).getTime()) / HOUR_MS),
    0,
  );
  const description =
    hours < 1 ? 'Waiting under an hour' : hours < 48 ? `Waiting ${hours}h` : `Waiting ${Math.floor(hours / 24)}d`;

  return {description, title: 'Reply needed'};
}

export function presentReplySequenceFacts({
  clientStatus,
  unreadCount,
  waitingMessageCount,
}: {
  clientStatus: ReplyClientStatus;
  unreadCount: number;
  waitingMessageCount: number;
}): {messageCountLabel: string; rowFacts: string; statusFacts: string} {
  const readState = unreadCount === 0 ? 'Read' : 'Unread';
  const inactive = clientStatus === 'inactive' ? 'Inactive' : null;
  const messageCount = `${waitingMessageCount} message${waitingMessageCount === 1 ? '' : 's'}`;

  return {
    messageCountLabel: `${waitingMessageCount} client message${waitingMessageCount === 1 ? '' : 's'} in this waiting sequence`,
    rowFacts: [messageCount, readState, inactive].filter(Boolean).join(' · '),
    statusFacts: [readState, inactive].filter(Boolean).join(' · '),
  };
}
