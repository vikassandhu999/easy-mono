import type {Client, ClientUpdateRequest} from '@/api/clients';

// The word "pending" is reserved for invites (the list's status cell shows
// "Invited") — the intake flag always reads "Intake incomplete", never "pending".
export const INACTIVE_REASON_LABEL: Record<string, string> = {
  manual: 'Paused by you',
  subscription_expired: 'Coaching period ended',
  awaiting_seat: 'Needs a seat',
};

export function subscriptionDatesAreOrdered(start: string, end: string): boolean {
  return !start || !end || end >= start;
}

export function renewalEndDateIsValid(end: string, today: string): boolean {
  return !end || end >= today;
}

export type CoachingAccessState = {
  accessAction: 'add-seat' | 'pause' | 'reactivate' | 'renew' | null;
  mode: 'active' | 'awaiting-seat' | 'expired' | 'manual' | 'pending';
  periodAction: 'edit' | 'renew' | 'view';
  requiresPeriodUpdate: boolean;
};

export function coachingAccessState(
  client: Pick<Client, 'inactive_reason' | 'status' | 'subscription_ends_on'>,
  today: string,
): CoachingAccessState {
  if (client.status === 'pending') {
    return {accessAction: null, mode: 'pending', periodAction: 'edit', requiresPeriodUpdate: false};
  }
  if (client.status === 'active') {
    return {accessAction: 'pause', mode: 'active', periodAction: 'edit', requiresPeriodUpdate: false};
  }
  if (client.inactive_reason === 'subscription_expired') {
    return {accessAction: 'renew', mode: 'expired', periodAction: 'renew', requiresPeriodUpdate: true};
  }
  if (client.inactive_reason === 'awaiting_seat') {
    return {accessAction: 'add-seat', mode: 'awaiting-seat', periodAction: 'view', requiresPeriodUpdate: false};
  }
  return {
    accessAction: 'reactivate',
    mode: 'manual',
    periodAction: 'edit',
    requiresPeriodUpdate: Boolean(client.subscription_ends_on && client.subscription_ends_on < today),
  };
}

export function coachingPeriodUpdate(start: string, end: string, restoreAccess: boolean): ClientUpdateRequest {
  return {
    ...(restoreAccess && {status: 'active'}),
    subscription_ends_on: end || null,
    subscription_started_on: start || null,
  };
}
