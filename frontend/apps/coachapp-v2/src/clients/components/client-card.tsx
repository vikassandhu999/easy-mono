import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {MessageCircle} from 'lucide-react';

import type {Client, ClientStatus} from '@/api/clients';

type StatusConfig = {
  color: 'default' | 'success';
  label: string;
};

const STATUS_MAP: Record<ClientStatus, StatusConfig> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'default', label: 'Archived'},
  inactive: {color: 'default', label: 'Inactive'},
  pending: {color: 'default', label: 'Pending'},
};

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

function getSubtitle(client: Client): string {
  if (client.status === 'active') {
    return `Active · since ${formatDateShort(client.inserted_at)}`;
  }
  if (client.status === 'pending') {
    return `Invited · ${formatTimeAgo(client.inserted_at)}`;
  }
  return client.email ?? client.phone ?? client.status;
}

function getDisplayName(client: Client): string {
  const parts = [client.first_name, client.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (client.email ?? client.phone ?? 'Unknown');
}

function getInitials(client: Client): string {
  if (client.first_name) {
    const first = client.first_name[0] ?? '';
    const last = client.last_name?.[0] ?? '';
    return (first + last).toUpperCase();
  }
  return (client.email?.[0] ?? '?').toUpperCase();
}

export default function ClientCard({client}: {client: Client}) {
  const status = STATUS_MAP[client.status] ?? {color: 'default' as const, label: client.status};
  const whatsappNumber = client.phone?.replace(/\D/g, '');

  return (
    <ListBox.Item
      className={'px-4 sm:px-8 py-2 min-h-fit'}
      id={client.id}
      textValue={getDisplayName(client)}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{getInitials(client)}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{getDisplayName(client)}</Label>
        <Description className="truncate">{getSubtitle(client)}</Description>
      </div>
      <div className="ms-auto flex shrink-0 items-center gap-2">
        {whatsappNumber ? (
          <a
            aria-label={`Message ${getDisplayName(client)} on WhatsApp`}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-foreground-400 transition-colors hover:bg-default-100 hover:text-success active:bg-default-200"
            href={`https://wa.me/${whatsappNumber}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle size={16} />
          </a>
        ) : null}
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      </div>
    </ListBox.Item>
  );
}
