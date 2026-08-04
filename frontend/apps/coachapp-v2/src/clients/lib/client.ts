// The word "pending" is reserved for invites (the list's status cell shows
// "Invited") — the intake flag always reads "Intake incomplete", never "pending".
export const INACTIVE_REASON_LABEL: Record<string, string> = {
  manual: 'Paused by you',
  subscription_expired: 'Subscription ended',
  awaiting_seat: 'Needs a seat',
};

export function subscriptionDatesAreOrdered(start: string, end: string): boolean {
  return !start || !end || end >= start;
}
