import type {Key} from '@heroui/react';
import type {ReactNode} from 'react';

import {Collection, ListBox, ListBoxLoadMoreItem, Spinner, Typography} from '@heroui/react';

import type {Client} from '@/api/clients';

import type {ClientListSelection} from './types';

type ClientSelectionMode = 'multiple' | 'none' | 'single';

type Props = {
  'aria-label'?: string;
  clients: Client[];
  emptyState: ReactNode;
  fetchNextPage: () => void;
  isLoading: boolean;
  onAction?: (key: Key) => void;
  onSelectionChange?: (keys: ClientListSelection) => void;
  renderItem: (client: Client) => ReactNode;
  selectedKeys?: 'all' | Iterable<Key>;
  selectionMode?: ClientSelectionMode;
};

export default function ClientListBox({
  'aria-label': ariaLabel = 'Clients',
  clients,
  emptyState,
  fetchNextPage,
  isLoading,
  onAction,
  onSelectionChange,
  renderItem,
  selectedKeys,
  selectionMode = 'none',
}: Props) {
  return (
    <ListBox
      aria-label={ariaLabel}
      className="flex-1"
      onAction={onAction}
      onSelectionChange={onSelectionChange}
      renderEmptyState={() => emptyState}
      selectedKeys={selectedKeys}
      selectionMode={selectionMode}
    >
      <Collection items={clients}>{renderItem}</Collection>
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
