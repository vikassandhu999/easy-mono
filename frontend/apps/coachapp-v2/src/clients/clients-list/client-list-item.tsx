import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {ChevronRight, MessageCircle} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {INACTIVE_REASON_LABEL, STATUS_DISPLAY, stageChip} from '@/clients/lib/client';

export function RowChips({client}: {client: Client}) {
  if (client.status === 'active') {
    const stage = stageChip(client);
    return (
      <Chip
        color={stage.color}
        size="sm"
        variant="soft"
      >
        {stage.label}
      </Chip>
    );
  }

  if (client.status === 'inactive') {
    const label =
      client.inactive_reason === 'subscription_expired' && client.subscription_ends_on
        ? `Subscription ended ${formatIsoDateShort(client.subscription_ends_on)}`
        : (INACTIVE_REASON_LABEL[client.inactive_reason ?? 'manual'] ?? 'Inactive');
    return (
      <Chip
        color="default"
        size="sm"
        variant="soft"
      >
        {label}
      </Chip>
    );
  }

  const status = STATUS_DISPLAY[client.status];
  return (
    <Chip
      color={status.color}
      size="sm"
      variant="soft"
    >
      {status.label}
    </Chip>
  );
}

function unreadLabel(unreadCount: number): string {
  return unreadCount > 99 ? '99+' : String(unreadCount);
}

export default function ClientListItem({client, unreadCount}: {client: Client; unreadCount: number}) {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
  const initials = getInitials(client.first_name, client.last_name);

  let subtitle = client.email ?? client.phone ?? client.status;
  if (client.status === 'active') {
    subtitle = `Active · since ${formatIsoDateShort(client.inserted_at)}`;
  }
  if (client.status === 'pending') {
    subtitle = `Invited · ${formatTimeAgo(client.inserted_at)}`;
  }

  return (
    <ListBox.Item
      className="group mt-0 min-h-fit border-b border-surface-secondary px-4 py-3.5 transition-colors last:border-b-0 hover:bg-surface-secondary active:bg-surface-secondary sm:px-5"
      id={client.id}
      textValue={name}
    >
      <Avatar className="size-11 shrink-0 bg-accent text-accent-foreground">
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="truncate text-sm font-semibold text-foreground">{name}</Label>
        <Description className="truncate text-xs text-muted">{subtitle}</Description>
      </div>
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <RowChips client={client} />
        <Link
          aria-label={`Open messages with ${name}`}
          className="relative grid min-h-11 min-w-11 place-items-center rounded-xl text-muted transition-colors hover:bg-success-soft hover:text-success-soft-foreground active:bg-success-soft"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          to={ROUTES.CLIENT_MESSAGES.replace(':id', client.id)}
        >
          <MessageCircle size={17} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-danger-soft px-1 text-[10px] leading-none font-bold text-danger-soft-foreground">
              {unreadLabel(unreadCount)}
            </span>
          ) : null}
        </Link>
        <ChevronRight
          aria-hidden
          className="hidden text-muted sm:block"
          size={17}
        />
      </div>
    </ListBox.Item>
  );
}
