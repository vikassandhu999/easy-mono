import type {Key} from '@heroui/react';
import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';
import type {ReactNode} from 'react';

import type {Recipe} from '@/api/recipes';

type Props = {
  emptyState: ReactNode;
  fetchNextPage: () => void;
  isLoading: boolean;
  onAction?: (key: Key) => void;
  recipes: Recipe[];
  renderItem: (recipe: Recipe) => ReactNode;
};

export default function RecipeListBox({emptyState, fetchNextPage, isLoading, onAction, recipes, renderItem}: Props) {
  return (
    <ListBox
      aria-label="Recipes"
      className="flex-1"
      onAction={onAction}
      renderEmptyState={() => emptyState}
      selectionMode="none"
    >
      <Collection items={recipes}>{renderItem}</Collection>
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
