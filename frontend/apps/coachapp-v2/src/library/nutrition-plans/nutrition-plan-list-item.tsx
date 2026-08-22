import {Chip} from '@heroui/react';
import {Salad} from 'lucide-react';
import type {NutritionPlan} from '@/api/nutrition-plans';
import {BrowseRow} from '@/ui/browse-list-box';

type NutritionPlanStatus = NutritionPlan['status'];

const STATUS_MAP: Record<NutritionPlanStatus, {color: 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

// Row meta per COPY.md: `{kcal} kcal · {p}g protein · {n} clients`.
function getPlanMeta(plan: NutritionPlan): string {
  const clients = plan.assigned_client_count ?? 0;

  return [
    // `2,100 kcal`, as COPY.md and the ref write it — a four-digit target with no
    // separator reads as a different order of magnitude at a glance.
    plan.target_calories != null ? `${plan.target_calories.toLocaleString('en-US')} kcal` : null,
    plan.target_protein_g != null ? `${plan.target_protein_g}g protein` : null,
    // Only when someone is on it: `· 0 clients` on every unused template is noise,
    // and the design's rows that show it all have assignments.
    clients > 0 ? `${clients} ${clients === 1 ? 'client' : 'clients'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function NutritionPlanListItem({isFirst, plan}: {isFirst?: boolean; plan: NutritionPlan}) {
  const status = STATUS_MAP[plan.status];
  const meta = getPlanMeta(plan);

  return (
    <BrowseRow
      icon={<Salad className="size-5" />}
      id={plan.id}
      meta={meta || plan.description || 'No targets set'}
      testId={isFirst ? 'np-row' : undefined}
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
