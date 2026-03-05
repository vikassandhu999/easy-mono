import {ChevronRight} from 'lucide-react';
import {useNavigate} from 'react-router';

import type {Meal} from '@/entities/meals/api/meals';
import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';

import {toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';

const DAY_ABBREV: Record<string, string> = {
  friday: 'Fri',
  monday: 'Mon',
  saturday: 'Sat',
  sunday: 'Sun',
  thursday: 'Thu',
  tuesday: 'Tue',
  wednesday: 'Wed',
};

type NutritionDayCardProps = {
  day: string;
  mealsById: Record<string, Meal>;
  planId: string;
  planItems: PlanItem[];
};

export function NutritionDayCard({day, mealsById, planId, planItems}: NutritionDayCardProps) {
  const navigate = useNavigate();
  const mealCount = planItems.length;
  const totalItems = planItems.reduce((sum, pi) => sum + (mealsById[pi.meal_id]?.meal_items.length ?? 0), 0);

  return (
    <button
      className="flex w-full cursor-pointer items-center border-none bg-transparent text-left outline-none transition-colors hover:bg-surface-secondary"
      onClick={() => navigate(`/library/nutrition-plans/${planId}/builder/days/${day}`)}
      type="button"
    >
      <div className="flex w-12 shrink-0 items-center justify-center self-stretch border-r border-separator">
        <span className="text-xs font-semibold text-muted">{DAY_ABBREV[day] ?? day.slice(0, 3)}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{toSentenceLabel(day)}</p>
          <p className="text-xs text-muted">
            {mealCount} meal{mealCount === 1 ? '' : 's'} · {totalItems} item
            {totalItems === 1 ? '' : 's'}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </div>
    </button>
  );
}
