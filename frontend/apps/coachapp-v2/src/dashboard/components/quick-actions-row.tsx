import type {Key} from '@heroui/react';
import {Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {LucideIcon} from 'lucide-react';
import {ChevronRight, Dumbbell, Globe, UserPlus, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {ROUTES} from '@/@config/routes';

type Action = {
  icon: LucideIcon;
  label: string;
  route: string;
};

// COPY.md §DB quick actions, in reference order.
const ACTIONS: Action[] = [
  {icon: UserPlus, label: 'Invite a client', route: ROUTES.INVITE_CLIENT},
  {icon: Dumbbell, label: 'New training plan', route: ROUTES.CREATE_TRAINING_PLAN},
  {icon: UtensilsCrossed, label: 'New nutrition plan', route: ROUTES.CREATE_NUTRITION_PLAN},
  {icon: Globe, label: 'Edit landing page', route: ROUTES.SETTINGS_LANDING_PAGE},
];

export function QuickActionsRow() {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <ListBox
        aria-label="Quick actions"
        className="gap-0 p-0"
        onAction={(key: Key) => navigate(String(key))}
        selectionMode="none"
      >
        {ACTIONS.map((action) => (
          <ListBox.Item
            className={cn(
              LIST_ITEM_CLASS,
              'grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none',
              'border-b border-separator py-3 last:border-0 hover:bg-surface-secondary sm:px-4',
            )}
            id={action.route}
            key={action.route}
            textValue={action.label}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <action.icon className="size-4" />
            </span>
            <Label className="min-w-0 truncate text-sm font-medium text-foreground">{action.label}</Label>
            <ChevronRight className="size-4 shrink-0 text-muted-2" />
          </ListBox.Item>
        ))}
      </ListBox>
    </div>
  );
}
