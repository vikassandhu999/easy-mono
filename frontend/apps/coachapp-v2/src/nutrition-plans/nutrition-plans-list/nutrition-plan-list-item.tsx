import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';

import type {NutritionPlan, NutritionPlanStatus} from '@/api/nutritionPlans';

const STATUS_MAP: Record<NutritionPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function getNutritionPlanSubtitle(plan: NutritionPlan): string {
  const mealCount = plan.meals?.length ?? 0;

  if (mealCount > 0) {
    return `${mealCount} meal${mealCount !== 1 ? 's' : ''}`;
  }
  return plan.description || 'No meals yet';
}

export default function NutritionPlanListItem({className, plan}: {className?: string; plan: NutritionPlan}) {
  const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;

  return (
    <ListBox.Item
      className={cn('min-h-fit rounded-none px-4 py-2 sm:px-8', className)}
      id={plan.id}
      textValue={plan.name}
    >
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{plan.name}</Label>
        <Description className="truncate">{getNutritionPlanSubtitle(plan)}</Description>
      </div>

      <div className="ms-auto hidden shrink-0 gap-1.5 sm:flex">
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 bottom-0 border-t-[0.5px] border-divider/70 sm:inset-x-8"
      />
    </ListBox.Item>
  );
}
