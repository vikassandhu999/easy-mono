import type {LucideIcon} from 'lucide-react';
import {ChevronRight, Dumbbell, Globe, UserPlus, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

type Action = {
  icon: LucideIcon;
  label: string;
  route: string;
};

const ACTIONS: Action[] = [
  {icon: UserPlus, label: 'Invite a client', route: ROUTES.INVITE_CLIENT},
  {icon: Dumbbell, label: 'New training plan', route: ROUTES.CREATE_TRAINING_PLAN},
  {icon: UtensilsCrossed, label: 'New nutrition plan', route: ROUTES.CREATE_NUTRITION_PLAN},
  {icon: Globe, label: 'Edit landing page', route: ROUTES.SETTINGS_LANDING_PAGE},
];

export function QuickActionsRow() {
  const navigate = useNavigate();

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {ACTIONS.map((action) => (
        <button
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          key={action.route}
          onClick={() => navigate(action.route)}
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <action.icon size={16} />
          </span>
          <span className="flex-1 truncate text-[13.5px] font-medium text-foreground">{action.label}</span>
          <ChevronRight
            className="shrink-0 text-muted"
            size={16}
          />
        </button>
      ))}
    </div>
  );
}
