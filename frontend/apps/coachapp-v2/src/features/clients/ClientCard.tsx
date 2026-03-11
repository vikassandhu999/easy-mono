import {Card} from '@heroui/react';

import type {Client} from '@/entities/clients/api/clients';

import {CLIENT_STATUS_STYLES, formatDate, getClientInitial, getClientName} from '@/features/clients/clientDisplay';

type ClientCardProps = {
  client: Client;
  onPress: () => void;
};

export default function ClientCard({client, onPress}: ClientCardProps) {
  return (
    <Card
      className="border border-separator bg-surface p-4 text-left transition-none"
      onClick={onPress}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-semibold text-foreground">
              {getClientInitial(client)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{getClientName(client)}</span>
              <span className="text-sm text-muted">{client.email}</span>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${CLIENT_STATUS_STYLES[client.status] ?? 'bg-default text-muted'}`}
          >
            {client.status}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{client.phone || '—'}</span>
            <span>Phone</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold capitalize text-foreground">{client.status}</span>
            <span>Status</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-separator pt-3 text-xs text-muted">
          <span>Joined {formatDate(client.inserted_at)}</span>
          <span>Updated {formatDate(client.updated_at)}</span>
        </div>
      </div>
    </Card>
  );
}
