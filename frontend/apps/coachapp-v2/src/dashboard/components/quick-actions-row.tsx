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
  {icon: UserPlus, label: 'Invite a client', route: ROUTES.INVITE_CLIENT},
  {icon: Dumbbell, label: 'New training plan', route: ROUTES.CREATE_TRAINING_PLAN},
  {icon: UtensilsCrossed, label: 'New nutrition plan', route: ROUTES.CREATE_NUTRITION_PLAN},
  {icon: Globe, label: 'Edit landing page', route: ROUTES.SETTINGS_LANDING_PAGE},
];

export function QuickActionsRow() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-2">
      {ACTIONS.map((action) => (
        <button
          className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-surface-hover"
          key={action.route}
          onClick={() => navigate(action.route)}
          type="button"
        >
          <action.icon
            className="shrink-0 text-muted"
            size={16}
          />
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
