import { Button, Card } from "@heroui/react";
import { CopyPlus, Salad, UserPlus } from "lucide-react";

import type { NutritionPlan } from "@/api/nutritionPlans";

import { formatDate } from "@/pages/library/libraryShared";

type NutritionPlanCardProps = {
  onAssign: (plan: NutritionPlan) => void;
  onOpenBuilder: (plan: NutritionPlan) => void;
  resource: NutritionPlan;
};

export default function NutritionPlanCard({
  onAssign,
  onOpenBuilder,
  resource,
}: NutritionPlanCardProps) {
  const statusTone =
    resource.status === "active"
      ? "bg-green-500/10 text-green-700"
      : resource.status === "archived"
        ? "bg-surface-secondary text-muted"
        : "bg-amber-500/10 text-amber-700";

  const topTags = resource.tags.slice(0, 3);

  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={() => onOpenBuilder(resource)}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
              <Salad className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">
                {resource.name}
              </span>
              <span className="truncate text-sm text-muted">
                {resource.type === "template" ? "Template" : "Personal"}
              </span>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone}`}
          >
            {resource.status}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {resource.meals.length} meal{resource.meals.length === 1 ? "" : "s"}
          </span>
          <span>Updated {formatDate(resource.updated_at)}</span>
        </div>

        {topTags.length > 0 ? (
          <div className="flex min-h-6 flex-wrap gap-1">
            {topTags.map((tag) => (
              <span
                className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))}
            {resource.tags.length > topTags.length ? (
              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                +{resource.tags.length - topTags.length}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="min-h-6 text-xs text-muted">No tags</div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-separator pt-3">
          <div
            className="flex items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              className="min-h-11"
              onPress={() => onOpenBuilder(resource)}
              size="sm"
              variant="outline"
            >
              <CopyPlus className="h-4 w-4" />
              Builder
            </Button>
            {resource.type === "template" ? (
              <Button
                className="min-h-11"
                onPress={() => onAssign(resource)}
                size="sm"
                variant="ghost"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </Button>
            ) : null}
          </div>
          <span className="text-xs text-muted">Tap to open</span>
        </div>
      </div>
    </Card>
  );
}
