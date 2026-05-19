import type {Key} from '@heroui/react';
import type {ReactNode} from 'react';

import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';

import type {Exercise} from '@/api/exercises';

type Props = {
  emptyState: ReactNode;
  exercises: Exercise[];
  fetchNextPage: () => void;
  isLoading: boolean;
  onAction?: (key: Key) => void;
  renderItem: (exercise: Exercise) => ReactNode;
};

export default function ExerciseListBox({emptyState, exercises, fetchNextPage, isLoading, onAction, renderItem}: Props) {
  return (
    <ListBox
      aria-label="Exercises"
      className="flex-1"
      onAction={onAction}
      renderEmptyState={() => emptyState}
      selectionMode="none"
    >
      <Collection items={exercises}>{renderItem}</Collection>
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
