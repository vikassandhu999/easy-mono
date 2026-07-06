import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {MessageCircle} from 'lucide-react';

import type {Client, ClientStatus} from '@/api/clients';

const STATUS_CONFIG: Record<ClientStatus, {color: 'default' | 'success'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'default', label: 'Archived'},
  awaiting_seat: {color: 'default', label: 'Awaiting seat'},
  inactive: {color: 'default', label: 'Inactive'},
  pending: {color: 'default', label: 'Pending'},
};

export default function ClientListItem({client}: {client: Client}) {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
  const initials = getInitials(client.first_name, client.last_name);

  let subtitle = client.email ?? client.phone ?? client.status;
  if (client.status === 'active') {
    subtitle = `Active · since ${formatIsoDateShort(client.inserted_at)}`;
  }
  if (client.status === 'pending') {
    subtitle = `Invited · ${formatTimeAgo(client.inserted_at)}`;
  }

  const status = STATUS_CONFIG[client.status];
  const whatsapp = client.phone?.replace(/\D/g, '');

  return (
    <ListBox.Item
      className="min-h-fit px-4 py-3 sm:px-8"
      id={client.id}
      textValue={name}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{name}</Label>
        <Description className="truncate">{subtitle}</Description>
      </div>
      <div className="ms-auto flex shrink-0 items-center gap-2">
        {whatsapp ? (
          <a
            aria-label={`Message ${name} on WhatsApp`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default-soft hover:text-success active:bg-default-soft"
            href={`https://wa.me/${whatsapp}`}
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
