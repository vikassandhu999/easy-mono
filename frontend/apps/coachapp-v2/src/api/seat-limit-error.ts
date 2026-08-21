import type {components} from './schema.ts';

type BillingSummary = components['schemas']['BillingSummary'];

const BILLING_STATUSES = [
  'free',
  'active',
  'past_due',
  'cancel_at_period_end',
  'cancelled',
] as const satisfies readonly BillingSummary['status'][];

function isBillingStatus(value: unknown): value is BillingSummary['status'] {
  return typeof value === 'string' && (BILLING_STATUSES as readonly string[]).includes(value);
}

function isBillingSummary(value: unknown): value is BillingSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (
    'available_seats' in value &&
    typeof value.available_seats === 'number' &&
    'awaiting_seat_count' in value &&
    typeof value.awaiting_seat_count === 'number' &&
    'current_period_end' in value &&
    (value.current_period_end === null || typeof value.current_period_end === 'string') &&
    'free_seats' in value &&
    typeof value.free_seats === 'number' &&
    'is_owner' in value &&
    typeof value.is_owner === 'boolean' &&
    'monthly_seat_price_inr' in value &&
    typeof value.monthly_seat_price_inr === 'number' &&
    'paid_seats' in value &&
    typeof value.paid_seats === 'number' &&
    'seat_limit' in value &&
    typeof value.seat_limit === 'number' &&
    'used_seats' in value &&
    typeof value.used_seats === 'number' &&
    'status' in value &&
    isBillingStatus(value.status)
  );
}

/** Extract the seat summary from a 409 seat_limit_reached error, or null. */
export function getSeatLimitError(err: unknown): {seatSummary: BillingSummary} | null {
  if (!err || typeof err !== 'object' || !('status' in err) || typeof err.status !== 'number' || err.status !== 409) {
    return null;
  }
  if (!('data' in err)) {
    return null;
  }
  const data = err.data;
  if (!data || typeof data !== 'object' || !('error_code' in data) || data.error_code !== 'seat_limit_reached') {
    return null;
  }
  if (!('seat_summary' in data) || !isBillingSummary(data.seat_summary)) {
    return null;
  }
  return {seatSummary: data.seat_summary};
}
