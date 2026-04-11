import {Chip} from '@heroui/react';
import {MessageCircle} from 'lucide-react';
import {Link} from 'react-router-dom';

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
    return `Active \u00B7 since ${formatDateShort(client.inserted_at)}`;
  }
  if (client.status === 'pending') {
    return `Invited \u00B7 ${formatTimeAgo(client.inserted_at)}`;
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
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/clients/${client.id}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-default-100 text-xs font-semibold text-foreground-500">
        {getInitials(client)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{getDisplayName(client)}</p>
        <p className="truncate text-xs text-foreground-500">{getSubtitle(client)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {whatsappNumber ? (
          <a
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground-400 transition-colors hover:bg-default-100 hover:text-success active:bg-default-200"
            href={`https://wa.me/${whatsappNumber}`}
            onClick={(e) => e.stopPropagation()}
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
    </Link>
  );
}
