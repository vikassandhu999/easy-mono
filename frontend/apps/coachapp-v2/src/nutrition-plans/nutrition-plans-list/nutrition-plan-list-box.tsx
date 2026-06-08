import type {Key} from '@heroui/react';
import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import type {NutritionPlan} from '@/api/nutritionPlans';

type Props = {
  emptyState: ReactNode;
  fetchNextPage: () => void;
  isLoading: boolean;
  onAction?: (key: Key) => void;
  plans: NutritionPlan[];
  renderItem: (plan: NutritionPlan) => ReactNode;
};

export default function NutritionPlanListBox({
  emptyState,
  fetchNextPage,
  isLoading,
  onAction,
  plans,
  renderItem,
}: Props) {
  return (
    <ListBox
      aria-label="Nutrition plans"
      className={'flex-1 gap-0'}
      onAction={onAction}
      renderEmptyState={() => emptyState}
      selectionMode="none"
    >
      <Collection items={plans}>{renderItem}</Collection>
      <ListBoxLoadMoreItem
        isLoading={isLoading}
        onLoadMore={fetchNextPage}
      >
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner size="sm" />
          <Typography
            color="muted"
            type="body-sm"
          >
            Loading more...
          </Typography>
        </div>
      </ListBoxLoadMoreItem>
    </ListBox>
  );
}
