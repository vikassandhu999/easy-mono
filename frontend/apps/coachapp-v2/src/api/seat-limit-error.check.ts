import {getSeatLimitError} from './seat-limit-error.ts';

const summary = {
  available_seats: 0,
  awaiting_seat_count: 1,
  current_period_end: null,
  free_seats: 2,
  is_owner: true,
  monthly_seat_price_inr: 499,
  paid_seats: 0,
  seat_limit: 2,
  status: 'free' as const,
  used_seats: 2,
};

const hit = getSeatLimitError({
  data: {
    error_code: 'seat_limit_reached',
    error_message: 'No seats available',
    seat_summary: summary,
  },
  status: 409,
});
if (!hit || hit.seatSummary.seat_limit !== 2 || hit.seatSummary.is_owner !== true) {
  throw new Error('409 seat_limit_reached must expose a validated seat summary');
}

if (getSeatLimitError({data: {error_code: 'seat_limit_reached'}, status: 409}) !== null) {
  throw new Error('seat_limit_reached without a summary must be rejected');
}

if (
  getSeatLimitError({
    data: {error_code: 'seat_limit_reached', seat_summary: {is_owner: true, seat_limit: 2, used_seats: 2}},
    status: 409,
  }) !== null
) {
  throw new Error('a partial seat_summary must be rejected');
}

if (
  getSeatLimitError({
    data: {error_code: 'seat_limit_reached', seat_summary: summary},
    status: 400,
  }) !== null
) {
  throw new Error('non-409 seat_limit_reached must be rejected');
}

if (getSeatLimitError({data: {error_code: 'invalid_input', seat_summary: summary}, status: 409}) !== null) {
  throw new Error('other 409 bodies must not be treated as a seat limit');
}

console.log('seat-limit-error checks passed');
