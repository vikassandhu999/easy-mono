import type {LucideIcon} from 'lucide-react';
import {Dumbbell, Globe, UserPlus, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

type Action = {
  icon: LucideIcon;
  label: string;
  route: string;
};

const ACTIONS: Action[] = [
  {icon: UserPlus, label: 'Invite client', route: ROUTES.INVITE_CLIENT},
  {icon: Dumbbell, label: 'Training plan', route: ROUTES.CREATE_TRAINING_PLAN},
  {icon: UtensilsCrossed, label: 'Nutrition plan', route: ROUTES.CREATE_NUTRITION_PLAN},
  {icon: Globe, label: 'Landing page', route: ROUTES.SETTINGS_LANDING_PAGE},
];

export function QuickActionsRow() {
  const navigate = useNavigate();

  return (
    <section className="col-span-2 hidden grid-cols-1 gap-3.5 sm:order-none sm:col-span-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map((action) => (
        <button
          className="flex min-h-14 items-center gap-3 rounded-3xl bg-accent px-4 text-left text-sm font-semibold text-accent-foreground transition hover:-translate-y-0.5 hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          key={action.route}
          onClick={() => navigate(action.route)}
          type="button"
        >
          <action.icon
            className="shrink-0 text-link"
            size={19}
          />
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </section>
  );
}
