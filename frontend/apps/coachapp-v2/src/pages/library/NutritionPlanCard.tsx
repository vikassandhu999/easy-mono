import { Card } from "@heroui/react";
import { Salad } from "lucide-react";

import { formatDate } from "@/pages/library/libraryData";
import type { NutritionPlanResource } from "@/pages/library/libraryData";

type NutritionPlanCardProps = {
  resource: NutritionPlanResource;
};

export default function NutritionPlanCard({
  resource,
}: NutritionPlanCardProps) {
  return (
    <Card className="h-full border border-separator bg-surface p-4">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
            <Salad className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-foreground">
              {resource.title}
            </span>
            <span className="truncate text-sm text-muted">Nutrition plans</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>{resource.items} items</span>
          <span>Used {resource.usageCount} times</span>
        </div>

        <div className="mt-auto border-t border-separator pt-3 text-sm text-muted">
          Updated {formatDate(resource.updatedAt)}
        </div>
      </div>
    </Card>
  );
}
