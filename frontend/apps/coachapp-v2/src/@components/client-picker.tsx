import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Users} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {type Client, useListClientsQuery} from '@/api/clients';

type ClientPickerProps = {
  /** Called when the user selects a client from the list */
  onSelect: (client: Client) => void;
  /** Optional label text */
  label?: string;
  /** Optional description text */
  description?: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** IDs of clients to exclude (shown as disabled) */
  excludeIds?: string[];
  /** Whether the picker is disabled (e.g. during a mutation) */
  isDisabled?: boolean;
  // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in per call site
  /** Auto-focus the search input when the picker mounts */
  autoFocus?: boolean;
};

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'No name';
}

/**
 * Inline client search + select using HeroUI Autocomplete with async server filtering.
 *
 * Container decision: INLINE — single text input that opens a popover with results.
 *
 * Shared component because nutrition plans and training plans both assign/copy
 * plans to clients. Uses Autocomplete in single-select mode. After selecting a
 * client, the selection is cleared and the full Client object is passed to onSelect.
 */
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
  const debouncedSearch = useDebouncedValue(searchInput);
  const shouldQuery = debouncedSearch.length >= 1;

  const {data, isFetching} = useListClientsQuery(shouldQuery ? {search: debouncedSearch, limit: 10} : undefined, {
    skip: !shouldQuery,
  });

  const clients = useMemo(() => data?.data ?? [], [data]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    for (const client of clients) {
      map.set(client.id, client);
    }
    return map;
  }, [clients]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) return;
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) return;
      const client = clientMap.get(id);
      if (client) {
        onSelect(client);
        setSearchInput('');
      }
    },
    [onSelect, clientMap],
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
            // eslint-disable-next-line jsx-a11y/no-autofocus
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
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                  <Users
                    className="text-foreground-400"
                    size={14}
                  />
                </div>
                <div className="flex min-w-0 flex-col">
                  <Label>{getFullName(client.first_name, client.last_name)}</Label>
                  <Description>{client.email}</Description>
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
