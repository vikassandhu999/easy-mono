import {Avatar, Chip} from '@heroui/react';
import {MessageCircle} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Client} from '@/api/clients';

function getWhatsAppUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

type StatusConfig = {
  color: 'danger' | 'default' | 'success' | 'warning';
  label: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'danger', label: 'Archived'},
  inactive: {color: 'default', label: 'Inactive'},
  pending: {color: 'warning', label: 'Invited'},
};

function getInitials(firstName: null | string, lastName: null | string): string {
  const first = firstName?.charAt(0)?.toUpperCase() ?? '';
  const last = lastName?.charAt(0)?.toUpperCase() ?? '';
  return first + last || '?';
}

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'No name';
}

export default function ClientCard({client}: {client: Client}) {
  const status = STATUS_MAP[client.status] ?? {
    color: 'default' as const,
    label: client.status,
  };
  const fullName = getFullName(client.first_name, client.last_name);
  const initials = getInitials(client.first_name, client.last_name);

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/clients/${client.id}`}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{fullName}</p>
        <p className="truncate text-xs text-foreground-500">{client.email ?? client.phone}</p>
      </div>
      {client.phone && (
        <a
          aria-label="Message on WhatsApp"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground-400 transition-colors hover:bg-default-100 active:bg-default-200"
          href={getWhatsAppUrl(client.phone)}
          onClick={(e) => e.stopPropagation()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle size={18} />
        </a>
      )}
      <Chip
        color={status.color}
        size="sm"
        variant="soft"
      >
        {status.label}
      </Chip>
    </Link>
  );
}
