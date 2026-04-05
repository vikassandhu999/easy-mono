import {Chip} from '@heroui/react';
import {ClipboardList} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {NutritionPlan} from '@/api/nutritionPlans';

const STATUS_MAP: Record<
  string,
  {
    color: 'accent' | 'danger' | 'default' | 'success' | 'warning';
    label: string;
  }
> = {
  active: {color: 'success', label: 'Active'},
  draft: {color: 'default', label: 'Draft'},
  archived: {color: 'warning', label: 'Archived'},
};

export default function NutritionPlanCard({plan}: {plan: NutritionPlan}) {
  const status = plan.status ? STATUS_MAP[plan.status] : null;
  const mealCount = plan.meals?.length ?? 0;

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/library/nutrition-plans/${plan.id}`}
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        <ClipboardList
          className="text-foreground-400"
          size={20}
        />
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{plan.name}</p>
        {mealCount > 0 ? (
          <p className="text-xs text-foreground-500">
            {mealCount} meal{mealCount !== 1 ? 's' : ''}
          </p>
        ) : plan.description ? (
          <p className="truncate text-xs text-foreground-500">{plan.description}</p>
        ) : (
          <p className="text-xs text-foreground-400">No meals yet</p>
        )}
      </div>

      {/* Status chip — hidden on small screens */}
      <div className="hidden gap-1.5 sm:flex">
        {status && (
          <Chip
            color={status.color}
            size="sm"
            variant="soft"
          >
            {status.label}
          </Chip>
        )}
        {plan.type && (
          <Chip
            size="sm"
            variant="soft"
          >
            {plan.type}
          </Chip>
        )}
      </div>
    </Link>
  );
}
