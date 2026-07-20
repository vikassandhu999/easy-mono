import {Chip, Description, Label, ListBox} from '@heroui/react';
import {ChevronRight, Salad} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {NutritionPlan} from '@/api/generated';

type NutritionPlanStatus = NutritionPlan['status'];

const STATUS_MAP: Record<NutritionPlanStatus, {color: 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

// Row meta per COPY.md is `{kcal} kcal · {p}g protein · {n} clients` — the list
// endpoint (NutritionPlan) carries no assigned-client count, so that segment is
// omitted rather than hand-wired; see PORT-TICKET notes for NP.
function getPlanMeta(plan: NutritionPlan): string {
  return [
    plan.target_calories != null ? `${plan.target_calories} kcal` : null,
    plan.target_protein_g != null ? `${plan.target_protein_g}g protein` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function NutritionPlanListItem({plan}: {plan: NutritionPlan}) {
  const status = STATUS_MAP[plan.status];
  const meta = getPlanMeta(plan);

  return (
    <ListBox.Item
      className={LIST_ITEM_CLASS}
      id={plan.id}
      textValue={plan.name}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
        <Salad className="size-5 text-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{plan.name}</Label>
        <Description className="max-w-full truncate text-xs text-muted">
          {meta || plan.description || 'No targets set'}
        </Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}
