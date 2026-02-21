import {Button, Skeleton} from '@heroui/react';
import {Plus, UtensilsCrossed} from 'lucide-react';
import {useNavigate} from 'react-router';

import type {NutritionPlan} from '@/api/nutritionPlans';

import ClientPlanCard from '@/pages/clients/ClientPlanCard';
import {formatMacros} from '@/pages/library/libraryShared';

type ClientNutritionTabProps = {
  isLoading: boolean;
  onAssign: () => void;
  plans: NutritionPlan[];
};

const getMacrosSummary = (plan: NutritionPlan): string => {
  const macros = formatMacros(plan.macros_goal as Record<string, number> | undefined);
  if (!macros) return '';
  return `${macros.calories} kcal · ${macros.protein}p · ${macros.carbs}c · ${macros.fat}f`;
};

export default function ClientNutritionTab({isLoading, onAssign, plans}: ClientNutritionTabProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton
            className="h-20 w-full rounded-xl"
            key={i}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Nutrition plans</h2>
        <Button
          onPress={onAssign}
          size="sm"
          variant="primary"
        >
          <Plus className="mr-1 h-4 w-4" />
          Assign plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-separator bg-surface py-12">
          <UtensilsCrossed className="h-10 w-10 text-muted" />
          <p className="font-medium text-foreground">No nutrition plans yet</p>
          <p className="text-sm text-muted">Assign a template to get started</p>
          <Button
            className="mt-2"
            onPress={onAssign}
            size="sm"
            variant="ghost"
          >
            Assign plan
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => {
            const macrosSummary = getMacrosSummary(plan);
            return (
              <ClientPlanCard
                dateRange={macrosSummary || undefined}
                itemCount={`${plan.meals.length} meal${plan.meals.length !== 1 ? 's' : ''}`}
                key={plan.id}
                name={plan.name}
                onOpen={() => navigate(`/library/nutrition-plans/${plan.id}/builder`)}
                status={plan.status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
