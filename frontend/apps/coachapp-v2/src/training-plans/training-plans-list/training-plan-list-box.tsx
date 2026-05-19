import type {Key} from '@heroui/react';
import type {ReactNode} from 'react';

import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';

import type {TrainingPlan} from '@/api/trainingPlans';

type Props = {
  emptyState: ReactNode;
  fetchNextPage: () => void;
  isLoading: boolean;
  onAction?: (key: Key) => void;
  plans: TrainingPlan[];
  renderItem: (plan: TrainingPlan) => ReactNode;
};

export default function TrainingPlanListBox({
  emptyState,
  fetchNextPage,
  isLoading,
  onAction,
  plans,
  renderItem,
}: Props) {
  return (
    <ListBox
      aria-label="Training plans"
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
