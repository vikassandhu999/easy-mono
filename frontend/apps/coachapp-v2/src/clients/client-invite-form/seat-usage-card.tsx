import {Meter, Typography} from '@heroui/react';
import {Users} from 'lucide-react';

import type {BillingSummary} from '@/api/billing';

// Seat-usage meter above the invite form (GAPS #4: HeroUI Meter, never a
// hand-styled div bar). Seats = active clients + pending invites, so the
// meter tells the coach whether this invite will fit before they fill it in.
export function SeatUsageCard({summary}: {summary: BillingSummary}) {
  const remaining = Math.max(summary.seat_limit - summary.used_seats, 0);

  return (
    <div className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:size-9">
        <Users className="size-4 sm:size-5" />
      </span>
      <Meter
        aria-label="Seat usage"
        className="flex min-w-0 flex-1 flex-col gap-1.5"
        color={remaining === 0 ? 'warning' : 'accent'}
        maxValue={summary.seat_limit}
        value={summary.used_seats}
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <Typography
            type="body-sm"
            weight="semibold"
          >
            {summary.used_seats} of {summary.seat_limit} seats used
          </Typography>
          <Typography
            className="hidden sm:inline"
            color="muted"
            type="body-sm"
          >
            {remaining} remaining
          </Typography>
        </div>
        <Meter.Track className="h-1.5">
          <Meter.Fill />
        </Meter.Track>
      </Meter>
    </div>
  );
}
