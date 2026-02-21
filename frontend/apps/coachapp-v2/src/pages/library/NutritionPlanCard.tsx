import {Button} from '@heroui/react';
import {CopyPlus, Salad, UserPlus} from 'lucide-react';

import type {NutritionPlan} from '@/api/nutritionPlans';

import LibraryCard from '@/components/LibraryCard';
import {formatDate, toSentenceCase} from '@/pages/library/libraryShared';

type NutritionPlanCardProps = {
  onAssign: (plan: NutritionPlan) => void;
  onOpenBuilder: (plan: NutritionPlan) => void;
  resource: NutritionPlan;
};

export default function NutritionPlanCard({onAssign, onOpenBuilder, resource}: NutritionPlanCardProps) {
  const topTags = resource.tags.slice(0, 3);

  return (
    <LibraryCard
      icon={<Salad className="h-5 w-5 text-foreground" />}
      meta={{
        actions: (
          <>
            <Button
              className="min-h-11"
              onPress={() => onOpenBuilder(resource)}
              size="sm"
              variant="outline"
            >
              <CopyPlus className="h-4 w-4" />
              Builder
            </Button>
            {resource.type === 'template' ? (
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
          </>
        ),
        badge: (
          <span className="rounded-full bg-surface-secondary px-2 py-1 text-xs font-medium text-muted">
            {toSentenceCase(resource.status)}
          </span>
        ),
        hint: 'Tap to open',
      }}
      onPress={() => onOpenBuilder(resource)}
      subtitle={resource.type === 'template' ? 'Template' : 'Personal'}
      title={resource.name}
    >
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {resource.meals.length} meal{resource.meals.length === 1 ? '' : 's'}
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
    </LibraryCard>
  );
}
