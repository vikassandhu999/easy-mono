import {Salad} from 'lucide-react';

import type {NutritionPlan} from '@/api/nutritionPlans';

import {formatDate, toSentenceCase} from '@/components/formatHelpers';
import LibraryCard from '@/pages/library/LibraryCard';

type NutritionPlanCardProps = {
  onOpenBuilder: (plan: NutritionPlan) => void;
  resource: NutritionPlan;
};

export default function NutritionPlanCard({onOpenBuilder, resource}: NutritionPlanCardProps) {
  const topTags = resource.tags.slice(0, 3);

  return (
    <LibraryCard
      badge={
        <span className="rounded-full bg-surface-secondary px-2 py-1 text-xs font-medium text-muted">
          {toSentenceCase(resource.status)}
        </span>
      }
      icon={<Salad className="h-5 w-5 text-foreground" />}
      onPress={() => onOpenBuilder(resource)}
      subtitle={resource.type === 'template' ? 'Template' : 'Personal'}
      title={resource.name}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-muted">
        <span className="truncate">
          {resource.meals.length} meal{resource.meals.length === 1 ? '' : 's'}
        </span>
        <span className="shrink-0 truncate">Updated {formatDate(resource.updated_at)}</span>
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
    </LibraryCard>
  );
}
