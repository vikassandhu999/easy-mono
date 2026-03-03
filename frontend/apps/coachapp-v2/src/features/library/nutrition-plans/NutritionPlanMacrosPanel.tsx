import {Card} from '@heroui/react';

import {useGetNutritionPlanMacrosQuery} from '@/entities/nutritionPlans/api/nutritionPlans';

type NutritionPlanMacrosPanelProps = {
  isActive: boolean;
  planId: string;
};

const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const;

export default function NutritionPlanMacrosPanel({isActive, planId}: NutritionPlanMacrosPanelProps) {
  const {data, isError, isLoading} = useGetNutritionPlanMacrosQuery(planId, {
    skip: !isActive || !planId,
  });

  if (!isActive) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border border-separator bg-surface p-4">
        <p className="text-sm text-muted">Loading macros summary...</p>
      </Card>
    );
  }

  if (isError || !data?.data) {
    return (
      <Card className="border border-separator bg-surface p-4">
        <p className="font-medium text-foreground">Could not load macros</p>
        <p className="text-sm text-muted">Please try again after changes sync.</p>
      </Card>
    );
  }

  return (
    <Card className="border border-separator bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Plan macros</h3>
          <p className="text-sm text-muted">Aggregated from all scheduled meals.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACRO_KEYS.map((key) => {
            const value = data.data[key] ?? 0;
            return (
              <div
                className="rounded-lg border border-separator bg-background p-3"
                key={key}
              >
                <p className="text-xs uppercase tracking-wide text-muted">{key}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{Math.round(value)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
