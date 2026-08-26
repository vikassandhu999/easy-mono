import {ApiError} from '@easy/utils/api-error';
import {parseApiErrorBody} from '@easy/utils/parse-api-error';
import type {Billing} from './schema.ts';

type SeatLimitBilling = Pick<
  Billing,
  | 'available_seats'
  | 'awaiting_seat_count'
  | 'current_period_end'
  | 'free_seats'
  | 'is_owner'
  | 'monthly_seat_price_inr'
  | 'paid_seats'
  | 'seat_limit'
  | 'status'
  | 'used_seats'
>;

const BILLING_STATUSES = [
  'free',
  'active',
  'past_due',
  'cancel_at_period_end',
  'cancelled',
] as const satisfies readonly Billing['status'][];

function isBillingStatus(value: unknown): value is Billing['status'] {
  return typeof value === 'string' && BILLING_STATUSES.some((status) => status === value);
}

function isSeatLimitBilling(value: unknown): value is SeatLimitBilling {
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
export function getSeatLimitError(err: unknown): {seatSummary: Billing} | null {
  if (!(err instanceof ApiError) || err.status !== 409) {
    return null;
  }

  const body = parseApiErrorBody(err.data);
  if (!body || body.error_code !== 'seat_limit_reached') {
    return null;
  }

  const seatSummary =
    err.data && typeof err.data === 'object' && 'seat_summary' in err.data ? err.data.seat_summary : undefined;
  if (!isSeatLimitBilling(seatSummary)) {
    return null;
  }

  return {seatSummary: {...seatSummary, recent_events: null}};
}
