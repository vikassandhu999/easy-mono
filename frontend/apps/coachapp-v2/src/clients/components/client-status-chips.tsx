import {Chip} from '@heroui/react';
import {AlarmClock} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {type CoachingAccessState, coachingAccessState, isUnclassified} from '@/clients/lib/client';
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
 *              "No active plan" -> Training, "Ends <date>" -> Manage access sheet,
 *              "Intake pending" -> intake responses.
 *
 * Order matters and is the design's: state first, then attention, so the row
 * reads "what this client is" before "what you owe them".
 *
 * They render as TWO components because the design puts them in two places: the
 * state chip sits inline with the name, and the attention chips get their own row
 * beneath it. Same mapping, one file.
 */
export function ClientStatusChip({client}: {client: Client}) {
  const access = coachingAccessState(client, new Date().toISOString().slice(0, 10));

  return (
    <>
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
          {inactiveLabel(access.mode)}
        </Chip>
      )}
      {isUnclassified(client) && (
        <Chip
          color="warning"
          size="sm"
          variant="soft"
        >
          Unclassified
        </Chip>
      )}
    </>
  );
}

/**
 * Attention chips are links, not chips with an onPress: they navigate, so they
 * should behave like navigation (focus, middle-click, back). Renders nothing when
 * the client owes nothing, so the caller needs no condition of its own.
 */
export function ClientAttentionChips({className, client}: {className?: string; client: Client}) {
  const clientPath = (route: string) => route.replace(':id', client.id);

  if (!client.expiring_soon || !client.subscription_ends_on) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      <Link to={`${clientPath(ROUTES.CLIENT_DETAIL)}?manage=access`}>
        <Chip
          color="danger"
          size="sm"
          variant="soft"
        >
          <AlarmClock />
          Ends {formatDayMonth(client.subscription_ends_on)}
        </Chip>
      </Link>
    </div>
  );
}

/** Each inactive access mode reads differently to a coach. */
function inactiveLabel(mode: CoachingAccessState['mode']): string {
  if (mode === 'expired') {
    return 'Coaching period ended';
  }
  if (mode === 'awaiting-seat') {
    return 'Awaiting seat';
  }
  return 'Inactive';
}
