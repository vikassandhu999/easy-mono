import {Input, Label, Skeleton, TextField} from '@heroui/react';
import {Search} from 'lucide-react';
import {useMemo, useState} from 'react';

import {useListClientsQuery} from '@/api/clients';

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
    search: query.trim() || undefined,
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
    <div className="flex flex-col gap-3">
      <TextField>
        <Label className="text-sm font-medium text-foreground">Search clients</Label>
        <Input
          className="min-h-11"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          value={query}
          variant="secondary"
        />
      </TextField>

      <div className="max-h-60 overflow-y-auto rounded-lg border border-separator bg-surface">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3].map((i) => (
              <div
                className="flex items-center gap-3 p-2"
                key={i}
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <Search className="h-8 w-8 text-muted" />
            <p className="font-medium text-foreground">{query.trim() ? 'No clients found' : 'No clients available'}</p>
            <p className="text-sm text-muted">
              {query.trim() ? 'Try a different search term' : 'Add clients first to assign plans'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredClients.map((client) => {
              const label = getClientLabel(client);
              const initial = label.charAt(0).toUpperCase();
              const isSelected = selectedId === client.id;
              return (
                <button
                  className={`flex items-center gap-3 border-b border-separator p-3 text-left transition-colors last:border-b-0 ${
                    isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary'
                  }`}
                  key={client.id}
                  onClick={() => onSelect({email: client.email, id: client.id, name: label})}
                  type="button"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-foreground">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{label}</p>
                    <p className="truncate text-sm text-muted">{client.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
