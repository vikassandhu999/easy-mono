import {Chip} from '@heroui/react';
import {MessageCircle} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Client, ClientStatus} from '@/api/clients';

type StatusConfig = {
  color: 'danger' | 'default' | 'success' | 'warning';
  label: string;
};

const STATUS_MAP: Record<ClientStatus, StatusConfig> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'default', label: 'Archived'},
  expired: {color: 'danger', label: 'Expired'},
  expiring: {color: 'warning', label: 'Expiring'},
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

function formatTimeRemaining(endDate: string): string {
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return 'ended';
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays === 1) return '1 day left';
  if (diffDays < 7) return `${diffDays} days left`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks} weeks left`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} months left`;
}

function getSubtitle(client: Client): string {
  // Pending: show offer name + time ago
  if (client.status === 'pending' && client.offer) {
    return `${client.offer.name} · ${formatTimeAgo(client.inserted_at)}`;
  }

  // Has program + end date: show program name + time remaining + payment
  if (client.program_name && client.program_end) {
    const parts = [client.program_name, formatTimeRemaining(client.program_end)];
    if (client.payment_amount && client.payment_status) {
      parts.push(client.payment_status === 'paid' ? 'paid' : `₹ ${client.payment_status}`);
    }
    return parts.join(' · ');
  }

  // Has program name only
  if (client.program_name) return client.program_name;

  // Fallback
  return client.email ?? client.phone ?? 'No details';
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
