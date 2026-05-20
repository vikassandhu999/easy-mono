import type {Key} from '@heroui/react';
import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import type {Food} from '@/api/foods';

type Props = {
  emptyState: ReactNode;
  fetchNextPage: () => void;
  foods: Food[];
  isLoading: boolean;
  onAction?: (key: Key) => void;
  renderItem: (food: Food) => ReactNode;
};

export default function FoodListBox({emptyState, fetchNextPage, foods, isLoading, onAction, renderItem}: Props) {
  return (
    <ListBox
      aria-label="Foods"
      className="flex-1"
      onAction={onAction}
      renderEmptyState={() => emptyState}
      selectionMode="none"
    >
      <Collection items={foods}>{renderItem}</Collection>
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
