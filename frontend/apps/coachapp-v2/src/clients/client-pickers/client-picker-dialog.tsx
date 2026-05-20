import type {Key, UseOverlayStateReturn} from '@heroui/react';
import {cn, EmptyState, Modal, SearchField, Spinner} from '@heroui/react';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useIsMobile} from '@/@hooks/use-is-mobile';
import type {Client} from '@/api/clients';
import ClientListBox from '@/clients/clients-list/client-list-box';
import ClientListItem from '@/clients/clients-list/client-list-item';
import ClientsListQuery from '@/clients/clients-list/clients-list-query';

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
  footer?: (clients: Client[]) => ReactNode;
  heading: string;
  onSelectionChange: (keys: 'all' | Set<Key>, clients: Client[]) => void;
  selectedKeys?: 'all' | Iterable<Key>;
  selectionMode: 'multiple' | 'single';
  state: UseOverlayStateReturn;
};

export default function ClientPickerDialog({
  footer,
  heading,
  onSelectionChange,
  selectedKeys,
  selectionMode,
  state,
}: Props) {
  const isMobile = useIsMobile();
  const [filterText, setFilterText] = useState('');
  const queryFilterText = useDebouncedValue(filterText);

  return (
    <Modal.Backdrop
      className={classNames.backdrop}
      isOpen={state.isOpen}
      onOpenChange={state.setOpen}
    >
      <Modal.Container
        className={classNames.container}
        placement="top"
        scroll="inside"
        size={isMobile ? 'full' : 'lg'}
      >
        <Modal.Dialog
          aria-label={heading}
          className={'p-0'}
        >
          <ClientsListQuery
            enabled={state.isOpen}
            search={queryFilterText}
          >
            {({clients, fetchNextPage, isLoading}) => (
              <>
                <Modal.Header className={'p-2 sm:p-4 border flex'}>
                  <div className={'flex items-center space-between gap-4'}>
                    <SearchField
                      autoFocus
                      className={'flex-1'}
                      name="search"
                      onChange={setFilterText}
                      value={filterText}
                      variant="secondary"
                    >
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="Choose client..." />
                        <Spinner
                          className={cn('absolute top-1/2 right-2 -translate-y-1/2', {
                            'pointer-events-none opacity-0': !isLoading,
                          })}
                          size="sm"
                        />
                        <SearchField.ClearButton className={cn({'pointer-events-none opacity-0': isLoading})} />
                      </SearchField.Group>
                    </SearchField>
                    <Modal.CloseTrigger className={'!static h-9 w-9'} />
                  </div>
                </Modal.Header>
                <Modal.Body>
                  <ClientListBox
                    clients={clients}
                    emptyState={<EmptyState>No result found</EmptyState>}
                    fetchNextPage={fetchNextPage}
                    isLoading={isLoading}
                    onSelectionChange={(keys) => onSelectionChange(keys, clients)}
                    renderItem={(client) => (
                      <ClientListItem
                        client={client}
                        showIndicator
                        showQuickActions={false}
                      />
                    )}
                    selectedKeys={selectedKeys}
                    selectionMode={selectionMode}
                  />
                </Modal.Body>
                {footer?.(clients)}
              </>
            )}
          </ClientsListQuery>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
