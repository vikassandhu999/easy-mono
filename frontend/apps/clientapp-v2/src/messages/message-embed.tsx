import {Dumbbell, UtensilsCrossed} from 'lucide-react';
import {generatePath, Link} from 'react-router-dom';
import type {ChatMessageEmbed} from '@/api/uploads';
import {ROUTES} from '@/routes';

export default function MessageEmbed({embed}: {embed: ChatMessageEmbed}) {
  const reference =
    embed.type === 'training_session'
      ? {
          label: 'Workout',
          icon: <Dumbbell size={15} />,
          path: generatePath(ROUTES.SESSION_DETAIL, {sessionId: embed.id}),
        }
      : {
          label: 'Meal',
          icon: <UtensilsCrossed size={15} />,
          path: embed.snapshot.occurred_on
            ? `${ROUTES.NUTRITION}?${new URLSearchParams({date: embed.snapshot.occurred_on})}`
            : ROUTES.NUTRITION_HISTORY,
        };
  return (
    <Link
      className="block min-h-11 rounded-xl border border-border bg-surface p-3 text-foreground"
      to={reference.path}
    >
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {reference.icon} {reference.label}
      </span>
      <span className="mt-1 block text-sm font-semibold">{embed.snapshot.title}</span>
      {embed.snapshot.occurred_on && (
        <span className="mt-0.5 block text-muted text-xs">{embed.snapshot.occurred_on}</span>
      )}
    </Link>
  );
}
