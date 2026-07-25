import {Chip} from '@heroui/react';
import {AlarmClock, ClipboardList, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {formatDayMonth} from '@/clients/lib/client-detail-data';

/**
 * The identity header's chip row. There is no `StatusChip` wrapper component:
 * HeroUI's `Chip` already takes `color` + `variant="soft"`, and the design's
 * `.chip.succ/.warn/.dang/.out` map straight onto it. What is actually worth
 * putting in one place is the MAPPING — which of a client's flags become chips,
 * in what order, with what tone and copy. The deleted implementation had six
 * hand-written chip helpers and they had drifted apart.
 *
 * Two registers, from the design:
 *   .chip      the state itself — Active (succ) / Invited (warn) / Inactive (out)
 *   .attnchip  a thing needing attention, tappable, jumping to where you fix it:
 *              "No active plan" -> Training, "Expires <date>" -> Details
 *
 * Order matters and is the design's: state first, then attention, so the row
 * reads "what this client is" before "what you owe them".
 */
export function ClientStatusChips({client}: {client: Client}) {
  const clientPath = (route: string) => route.replace(':id', client.id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {client.status === 'active' && (
        <Chip
          color="success"
          size="sm"
          variant="soft"
        >
          Active
        </Chip>
      )}
      {client.status === 'pending' && (
        <Chip
          color="warning"
          size="sm"
          variant="soft"
        >
          Invited
        </Chip>
      )}
      {client.status === 'inactive' && (
        <Chip
          className="chip--outline"
          size="sm"
        >
          {inactiveLabel(client.inactive_reason)}
        </Chip>
      )}

      {/* Attention chips are links, not chips with an onPress: they navigate, so
          they should behave like navigation (focus, middle-click, back). */}
      {client.needs_plan && client.status === 'active' && (
        <Link to={`${clientPath(ROUTES.CLIENT_DETAIL)}?tab=training`}>
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            <Dumbbell />
            No active plan
          </Chip>
        </Link>
      )}
      {client.expiring_soon && client.subscription_ends_on && (
        <Link to={clientPath(ROUTES.CLIENT_DETAILS)}>
          <Chip
            color="danger"
            size="sm"
            variant="soft"
          >
            <AlarmClock />
            Expires {formatDayMonth(client.subscription_ends_on)}
          </Chip>
        </Link>
      )}
      {client.intake_incomplete && (
        <Chip
          color="warning"
          size="sm"
          variant="soft"
        >
          <ClipboardList />
          Intake pending
        </Chip>
      )}
    </div>
  );
}

/** `inactive_reason` is the API's, and each reason reads differently to a coach. */
function inactiveLabel(reason: Client['inactive_reason']): string {
  if (reason === 'subscription_expired') {
    return 'Subscription expired';
  }
  if (reason === 'awaiting_seat') {
    return 'Awaiting seat';
  }
  return 'Inactive';
}
