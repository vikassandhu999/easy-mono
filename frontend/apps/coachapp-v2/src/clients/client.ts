import {formatIsoDateShort} from '@easy/utils';
import type {Client, ClientUpdateRequest} from '../api/clients.ts';

/** Active with an empty required-services set. Distinct from missing a plan
 *  for a service that was actually chosen — Programming excludes these. */
export function isUnclassified(client: Pick<Client, 'required_services' | 'status'>): boolean {
  return client.status === 'active' && client.required_services.length === 0;
}

export function needsRequiredPlan(
  client: Pick<Client, 'nutrition_plan_name' | 'required_services' | 'training_plan_name'>,
): boolean {
  return client.required_services.some((service) =>
    service === 'training' ? !client.training_plan_name : !client.nutrition_plan_name,
  );
}

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

/** Extend from the later of today and the current end — never shorten by "extending". */
export function extendedSubscriptionEnd(
  currentEnd: null | string,
  today: string,
  amount: {days: number} | {months: number},
): string {
  const base = currentEnd && currentEnd >= today ? currentEnd : today;
  const date = new Date(`${base}T00:00:00Z`);
  if ('days' in amount) {
    date.setUTCDate(date.getUTCDate() + amount.days);
  } else {
    date.setUTCMonth(date.getUTCMonth() + amount.months);
  }
  return date.toISOString().slice(0, 10);
}

/** Quick-extend amounts offered in the Manage sheet. */
export const EXTEND_PRESETS = [
  {label: '+2 weeks', amount: {days: 14} as const},
  {label: '+1 month', amount: {months: 1} as const},
  {label: '+3 months', amount: {months: 3} as const},
] as const;

/** The access strip's one-line period, for each of the four ways it can be set. */
export function periodSummary(client: Pick<Client, 'subscription_ends_on' | 'subscription_started_on'>): string {
  const start = client.subscription_started_on;
  const end = client.subscription_ends_on;
  if (start && end) {
    return `${formatIsoDateShort(start)} \u2192 ${formatIsoDateShort(end)}`;
  }
  if (start) {
    return `Started ${formatIsoDateShort(start)} \u00b7 Ongoing`;
  }
  if (end) {
    return `Ends ${formatIsoDateShort(end)}`;
  }
  return 'No coaching period set';
}

/** A date inside a confirmation sentence; an empty date reads as "not set". */
export function formatPeriodValue(iso: string): string {
  return iso ? formatIsoDateShort(iso) : 'not set';
}
