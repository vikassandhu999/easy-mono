/* eslint-disable jsx-a11y/no-autofocus */
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  cn,
  Collection,
  Description,
  EmptyState,
  Label,
  ListBox,
  ListBoxLoadMoreItem,
  Modal,
  SearchField,
  Spinner,
  UseOverlayStateReturn,
} from '@heroui/react';
import {useMemo, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useIsMobile} from '@/@hooks/use-is-mobile';
import {Client, useClientsInfiniteQuery} from '@/api/clients';

const classNames = {
  backdrop: [
    'data-[entering]:duration-400',
    'data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)]',
    'data-[exiting]:duration-200',
    'data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]',
  ].join(' '),
  container: [
    'data-[entering]:animate-in',
    'data-[entering]:fade-in-0',
    'data-[entering]:zoom-in-95',
    'data-[entering]:duration-400',
    'data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)]',
    'data-[exiting]:animate-out',
    'data-[exiting]:fade-out-0',
    'data-[exiting]:zoom-out-95',
    'data-[exiting]:duration-200',
    'data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]',
  ].join(' '),
};

type Props = {
  heading: string;
  state: UseOverlayStateReturn;
  onSelect: (client: Client) => void;
};

export function ClientPicker({state, heading, onSelect}: Props) {
  const isMobile = useIsMobile();
  const [filterText, setFilterText] = useState('');
  const queryFilterText = useDebouncedValue(filterText);
  const list = useClientsInfiniteQuery({search: queryFilterText}, {skip: !state.isOpen});

  const clients = useMemo(() => {
    return list.data?.pages?.flatMap((p) => p.data) ?? [];
  }, [list.data]);

  return (
    <Modal.Backdrop
      className={classNames.backdrop}
      isOpen={state.isOpen}
      onOpenChange={state.setOpen}
    >
      <Modal.Container
        className={classNames.container}
        placement={'top'}
        scroll={'inside'}
        size={isMobile ? 'full' : 'lg'}
      >
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{heading}</Modal.Heading>
            <SearchField
              autoFocus
              name="search"
              onChange={setFilterText}
              value={filterText}
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search..." />
                <Spinner
                  className={cn('absolute top-1/2 right-2 -translate-y-1/2', {
                    'pointer-events-none opacity-0': !list.isLoading,
                  })}
                  size="sm"
                />
                <SearchField.ClearButton className={cn({'pointer-events-none opacity-0': !!list.isLoading})} />
              </SearchField.Group>
            </SearchField>
          </Modal.Header>
          <Modal.Body>
            <ListBox
              onSelectionChange={(keys) => {
                if (keys !== 'all') {
                  const id = Array.from(keys)?.[0];
                  if (!id) return;
                  const selected = clients.find((c) => c.id === id);
                  selected && onSelect(selected);
                }
              }}
              renderEmptyState={() => <EmptyState>No result found</EmptyState>}
              selectionMode={'single'}
            >
              <Collection items={clients}>
                {(client) => (
                  <ListBox.Item
                    id={client.id}
                    key={client.id}
                    textValue={client.first_name + ' ' + client.last_name}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={''} />
                      <AvatarFallback>{client.first_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <Label>{client.first_name + ' ' + client.last_name}</Label>
                      <Description>{client.email}</Description>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                )}
              </Collection>
              <ListBoxLoadMoreItem
                isLoading={list.isLoading}
                onLoadMore={list.fetchNextPage}
              >
                <div className="flex items-center justify-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="muted text-sm">Loading more...</span>
                </div>
              </ListBoxLoadMoreItem>
            </ListBox>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
