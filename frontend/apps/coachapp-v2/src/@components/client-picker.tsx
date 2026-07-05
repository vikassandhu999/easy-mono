import {Description, Label, SearchField, Spinner, Typography} from '@heroui/react';
import {Users} from 'lucide-react';
import {useDeferredValue, useState} from 'react';

import {type Client, useListClientsQuery} from '@/api/clients';
import {getFullName} from '@/clients/lib/invite-client';

type ClientPickerContentProps = {
  onSelect: (client: Client) => void;
};

/**
 * Body of the client picker — search + result rows. Rendered inside an anchored
 * Popover (desktop) or KeyboardSheet (mobile) by the caller (plan-add-to-client),
 * mirroring the food-picker-content / plan-assign-content pattern.
 */
export default function ClientPickerContent({onSelect}: ClientPickerContentProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const shouldQuery = deferredSearch.trim().length >= 1;

  const {data, isFetching} = useListClientsQuery({search: deferredSearch, limit: 10}, {skip: !shouldQuery});
  const clients = data?.data ?? [];

  return (
    <div className="flex w-full flex-col gap-2">
      <SearchField
        aria-label="Search clients"
        autoFocus
        onChange={setSearch}
        value={search}
        variant="secondary"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search clients…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {isFetching ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : !shouldQuery || clients.length === 0 ? (
        <Typography
          align="center"
          className="py-6"
          color="muted"
          type="body-sm"
        >
          {shouldQuery ? 'No clients found' : 'Type to search clients'}
        </Typography>
      ) : (
        <div className="flex max-h-[280px] flex-col overflow-y-auto">
          {clients.map((client) => (
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-secondary"
              key={client.id}
              onClick={() => onSelect(client)}
              type="button"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-secondary">
                <Users
                  className="text-muted"
                  size={14}
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <Label className="truncate">{getFullName(client.first_name, client.last_name) || 'No name'}</Label>
                <Description className="truncate">{client.email}</Description>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
