import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {MessageCircle, MessagesSquare} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {getWhatsAppUrl, INACTIVE_REASON_LABEL, STATUS_DISPLAY, stageChip} from '@/clients/lib/client';

function inactiveStatusLabel(client: Client): string {
  return client.inactive_reason === 'subscription_expired' && client.subscription_ends_on
    ? `Subscription ended ${formatIsoDateShort(client.subscription_ends_on)}`
    : (INACTIVE_REASON_LABEL[client.inactive_reason ?? 'manual'] ?? 'Inactive');
}

function mobileAttentionLabel(client: Client): string | null {
  if (client.stage === 'coaching' && client.intake_incomplete) {
    return 'Intake incomplete';
  }
  if (client.stage === 'coaching' && client.needs_plan) {
    return 'Needs plan';
  }
  if (client.expiring_soon) {
    return 'Expiring soon';
  }
  return null;
}

function MobileRowChips({client}: {client: Client}) {
  if (client.status === 'active') {
    const attentionLabel = mobileAttentionLabel(client);
    const stage = stageChip(client);

    return (
      <div className="flex max-w-28 flex-col items-end gap-1 sm:hidden">
        {attentionLabel ? (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            <span className="block max-w-24 truncate">{attentionLabel}</span>
          </Chip>
        ) : null}
        <Chip
          color={stage.color}
          size="sm"
          variant="soft"
        >
          <span className="block max-w-24 truncate">{stage.label}</span>
        </Chip>
      </div>
    );
  }

  const status =
    client.status === 'inactive'
      ? {color: 'default' as const, label: inactiveStatusLabel(client)}
      : STATUS_DISPLAY[client.status];

  return (
    <div className="max-w-28 sm:hidden">
      <Chip
        color={status.color}
        size="sm"
        variant="soft"
      >
        <span className="block max-w-24 truncate">{status.label}</span>
      </Chip>
    </div>
  );
}

export function RowChips({client}: {client: Client}) {
  if (client.status === 'active') {
    const stage = stageChip(client);
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        {client.stage === 'coaching' && client.intake_incomplete ? (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            Intake incomplete
          </Chip>
        ) : null}
        {client.stage === 'coaching' && client.needs_plan ? (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            Needs plan
          </Chip>
        ) : null}
        {client.expiring_soon ? (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            Expiring soon
          </Chip>
        ) : null}
        <Chip
          color={stage.color}
          size="sm"
          variant="soft"
        >
          {stage.label}
        </Chip>
      </span>
    );
  }

  if (client.status === 'inactive') {
    return (
      <Chip
        color="default"
        size="sm"
        variant="soft"
      >
        {inactiveStatusLabel(client)}
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

  const whatsappUrl = client.phone ? getWhatsAppUrl(client.phone) : null;

  return (
    <ListBox.Item
      className="min-h-fit px-4 py-3 sm:px-8"
      id={client.id}
      textValue={name}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="truncate">{name}</Label>
        <Description className="truncate">{subtitle}</Description>
      </div>
      <div className="ms-auto flex min-w-0 shrink-0 items-center gap-2">
        <MobileRowChips client={client} />
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          {whatsappUrl ? (
            <a
              aria-label={`Message ${name} on WhatsApp`}
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default-soft hover:text-success active:bg-default-soft"
              href={whatsappUrl}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle size={16} />
            </a>
          ) : null}
          <Link
            aria-label={`Open messages with ${name}`}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default-soft hover:text-foreground active:bg-default-soft"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            to={ROUTES.CLIENT_MESSAGES.replace(':id', client.id)}
          >
            <MessagesSquare size={16} />
            {unreadCount > 0 ? (
              <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-danger-foreground">
                {unreadLabel(unreadCount)}
              </span>
            ) : null}
          </Link>
          <RowChips client={client} />
        </div>
      </div>
    </ListBox.Item>
  );
}
