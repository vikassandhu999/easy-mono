import {Chip} from '@heroui/react';
import {Salad} from 'lucide-react';

import {BrowseRow} from '@/@components/browse-list-box';
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
    <BrowseRow
      icon={<Salad className="size-5 text-foreground" />}
      id={plan.id}
      meta={meta || plan.description || 'No targets set'}
      textValue={plan.name}
      title={plan.name}
      trailing={
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      }
    />
  );
}
