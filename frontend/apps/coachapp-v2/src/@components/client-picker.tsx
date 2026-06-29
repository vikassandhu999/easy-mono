import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Users} from 'lucide-react';
import {useCallback, useDeferredValue, useMemo, useState} from 'react';

import {type Client, useListClientsQuery} from '@/api/clients';

type ClientPickerProps = {
  onSelect: (client: Client) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  excludeIds?: string[];
  isDisabled?: boolean;
  autoFocus?: boolean;
};

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'No name';
}

// Shared component because nutrition plans and training plans both assign/copy
// plans to clients. After selecting a client the selection is cleared and the
// full Client object is passed to onSelect.
export default function ClientPicker({
  onSelect,
  label,
  description,
  placeholder = 'Search clients...',
  excludeIds = [],
  isDisabled = false,
  autoFocus = false,
}: ClientPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const shouldQuery = deferredSearch.length >= 1;

  const {data, isFetching} = useListClientsQuery(shouldQuery ? {search: deferredSearch, limit: 10} : undefined, {
    skip: !shouldQuery,
  });

  const clients = useMemo(() => data?.data ?? [], [data]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) {
        return;
      }
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) {
        return;
      }
      const client = clients.find((c) => c.id === id);
      if (client) {
        onSelect(client);
        setSearchInput('');
      }
    },
    [onSelect, clients],
  );

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-full"
      defaultOpen={autoFocus}
      disabledKeys={excludeIds}
      isDisabled={isDisabled}
      onChange={handleChange}
      placeholder={placeholder}
      selectionMode="single"
      value={null}
    >
      {label && <Label>{label}</Label>}
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      {description && <Description>{description}</Description>}
      <Autocomplete.Popover>
        <Autocomplete.Filter
          inputValue={searchInput}
          onInputChange={setSearchInput}
        >
          <SearchField
            autoFocus={autoFocus}
            className="sticky top-0 z-10"
            name="client-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search clients..." />
              <Spinner
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isFetching ? '' : 'pointer-events-none opacity-0'}`}
                size="sm"
              />
              <SearchField.ClearButton className={isFetching ? 'pointer-events-none opacity-0' : ''} />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-[280px] overflow-y-auto"
            items={clients}
            renderEmptyState={() => (
              <EmptyState>{shouldQuery ? 'No clients found' : 'Type to search clients'}</EmptyState>
            )}
          >
            {(client: Client) => (
              <ListBox.Item
                id={client.id}
                key={client.id}
                textValue={getFullName(client.first_name, client.last_name)}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-secondary">
                  <Users
                    className="text-muted"
                    size={14}
                  />
                </div>
                <div className="flex min-w-0 flex-col">
                  <Label className="truncate">{getFullName(client.first_name, client.last_name)}</Label>
                  <Description className="truncate">{client.email}</Description>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
