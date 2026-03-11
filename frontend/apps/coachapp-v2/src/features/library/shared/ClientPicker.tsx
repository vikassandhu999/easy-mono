import {Input, Skeleton, TextField} from '@heroui/react';
import {Check, Search} from 'lucide-react';
import {useMemo, useState} from 'react';

import {useListClientsQuery} from '@/entities/clients/api/clients';

export type PickedClient = {
  email: string;
  id: string;
  name: string;
};

type ClientPickerProps = {
  onSelect: (client: PickedClient) => void;
  selectedId: string;
};

const getClientLabel = (client: {email: string; first_name: null | string; last_name: null | string}) => {
  const name = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  return name || client.email;
};

export default function ClientPicker({onSelect, selectedId}: ClientPickerProps) {
  const [query, setQuery] = useState('');

  const {data: clientsData, isLoading} = useListClientsQuery({
    limit: 200,
    offset: 0,
  });

  const clients = useMemo(() => clientsData?.data ?? [], [clientsData?.data]);

  const filteredClients = useMemo(() => {
    if (!query.trim()) return clients;
    const normalized = query.trim().toLowerCase();
    return clients.filter((client) => {
      const name = getClientLabel(client).toLowerCase();
      return client.email.toLowerCase().includes(normalized) || name.includes(normalized);
    });
  }, [clients, query]);

  return (
    <div className="flex flex-col gap-1.5">
      <TextField aria-label="Search clients">
        <Input
          autoComplete="off"
          className="min-h-11"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          value={query}
          variant="secondary"
        />
      </TextField>

      <div className="max-h-32 overflow-y-auto overscroll-contain rounded-lg border border-separator">
        {isLoading ? (
          <div className="space-y-1 px-3 py-2.5">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <p className="text-sm text-muted">{query.trim() ? 'No clients found' : 'No clients yet'}</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const label = getClientLabel(client);
            const isSelected = selectedId === client.id;
            const showEmail = label !== client.email;
            return (
              <button
                className={`flex min-h-11 w-full items-center gap-2 border-b border-separator px-3 text-left last:border-b-0 ${
                  isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary'
                }`}
                key={client.id}
                onClick={() => {
                  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                  onSelect({email: client.email, id: client.id, name: label});
                }}
                type="button"
              >
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  {showEmail ? <span className="text-muted"> · {client.email}</span> : null}
                </p>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-foreground" /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
