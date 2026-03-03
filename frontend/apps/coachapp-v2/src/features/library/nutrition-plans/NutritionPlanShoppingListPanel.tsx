import {Card} from '@heroui/react';

import {useGetNutritionPlanShoppingListQuery} from '@/entities/nutritionPlans/api/nutritionPlans';

type NutritionPlanShoppingListPanelProps = {
  isActive: boolean;
  planId: string;
};

export default function NutritionPlanShoppingListPanel({isActive, planId}: NutritionPlanShoppingListPanelProps) {
  const {data, isError, isLoading} = useGetNutritionPlanShoppingListQuery(planId, {
    skip: !isActive || !planId,
  });

  if (!isActive) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border border-separator bg-surface p-4">
        <p className="text-sm text-muted">Loading shopping list...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-separator bg-surface p-4">
        <p className="font-medium text-foreground">Could not load shopping list</p>
        <p className="text-sm text-muted">Please try again after updates.</p>
      </Card>
    );
  }

  const rows = data?.data ?? [];

  return (
    <Card className="border border-separator bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Shopping list</h3>
          <p className="text-sm text-muted">Aggregated ingredients from all meal items.</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted">No items yet. Add meal items first.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-separator bg-background">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-separator text-left text-muted">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Weight (g)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => (
                  <tr
                    className="border-b border-separator last:border-b-0"
                    key={`${item.type}-${item.food_id ?? item.recipe_id ?? index}`}
                  >
                    <td className="px-3 py-2 text-foreground">{item.name ?? 'Unnamed'}</td>
                    <td className="px-3 py-2 text-muted">{item.type}</td>
                    <td className="px-3 py-2 text-muted">{item.amount}</td>
                    <td className="px-3 py-2 text-muted">{item.unit ?? '-'}</td>
                    <td className="px-3 py-2 text-muted">{item.weight_g}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
