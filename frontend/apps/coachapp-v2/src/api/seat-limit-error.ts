import {parseApiErrorBody} from '@easy/utils/parse-api-error';

import {ApiError} from './api-error.ts';
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
  if (!(err instanceof ApiError) || err.status !== 409) {
    return null;
  }

  const body = parseApiErrorBody(err.data);
  if (!body || body.error_code !== 'seat_limit_reached') {
    return null;
  }

  const seatSummary =
    err.data && typeof err.data === 'object' && 'seat_summary' in err.data ? err.data.seat_summary : undefined;
  if (!isBillingSummary(seatSummary)) {
    return null;
  }

  return {seatSummary};
}
