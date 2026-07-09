import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {MessageCircle} from 'lucide-react';

import type {Client} from '@/api/clients';
import {INACTIVE_REASON_LABEL, STATUS_DISPLAY, stageChip} from '@/clients/lib/client';

function RowChips({client}: {client: Client}) {
  if (client.status === 'active') {
    const stage = stageChip(client);
    return (
      <>
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
      </>
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
        <RowChips client={client} />
      </div>
    </ListBox.Item>
  );
}
