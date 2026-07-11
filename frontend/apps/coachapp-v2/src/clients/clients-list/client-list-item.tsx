import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {ChevronRight, MessageCircle, MessagesSquare} from 'lucide-react';
import {Link} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {getWhatsAppUrl, INACTIVE_REASON_LABEL, STATUS_DISPLAY, stageChip} from '@/clients/lib/client';

const CHIP_TONE_CLASS =
  '[&.chip--default]:bg-surface-secondary! [&.chip--default]:text-muted! [&.chip--success]:bg-success-soft/50! [&.chip--success]:text-success! [&.chip--warning]:bg-warning-soft/50! [&.chip--warning]:text-warning!';
const ATTENTION_CHIP_CLASS = `h-auto! min-h-0! max-w-full px-[5px]! py-0.5! text-[10.5px] leading-[15.75px] font-bold! sm:px-2! sm:py-1! sm:text-[11.5px] sm:leading-[17.25px] ${CHIP_TONE_CLASS}`;
const STATUS_CHIP_CLASS = `h-auto! min-h-0! max-w-full px-1.5! py-0.5! text-[10.5px] leading-[15.75px] font-bold! sm:px-2! sm:py-[3px]! sm:text-[11.5px] sm:leading-[17.25px] ${CHIP_TONE_CLASS}`;

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
      <div className="flex w-[112px] min-w-0 flex-col items-end gap-1 sm:hidden">
        {attentionLabel ? (
          <Chip
            className={ATTENTION_CHIP_CLASS}
            color="warning"
            size="sm"
            variant="soft"
          >
            <span className="block max-w-[100px] truncate">{attentionLabel}</span>
          </Chip>
        ) : null}
        <Chip
          className={STATUS_CHIP_CLASS}
          color={stage.color}
          size="sm"
          variant="soft"
        >
          <span className="block max-w-[100px] truncate">{stage.label}</span>
        </Chip>
      </div>
    );
  }

  const status =
    client.status === 'inactive'
      ? {color: 'default' as const, label: inactiveStatusLabel(client)}
      : STATUS_DISPLAY[client.status];

  return (
    <div className="flex w-[112px] min-w-0 justify-end sm:hidden">
      <Chip
        className={STATUS_CHIP_CLASS}
        color={status.color}
        size="sm"
        variant="soft"
      >
        <span className="block max-w-[100px] truncate">{status.label}</span>
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
            className={ATTENTION_CHIP_CLASS}
            color="warning"
            size="sm"
            variant="soft"
          >
            Intake incomplete
          </Chip>
        ) : null}
        {client.stage === 'coaching' && client.needs_plan ? (
          <Chip
            className={ATTENTION_CHIP_CLASS}
            color="warning"
            size="sm"
            variant="soft"
          >
            Needs plan
          </Chip>
        ) : null}
        {client.expiring_soon ? (
          <Chip
            className={ATTENTION_CHIP_CLASS}
            color="warning"
            size="sm"
            variant="soft"
          >
            Expiring soon
          </Chip>
        ) : null}
        <Chip
          className={STATUS_CHIP_CLASS}
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
      <span className="flex min-w-0">
        <Chip
          className={STATUS_CHIP_CLASS}
          color="default"
          size="sm"
          variant="soft"
        >
          {inactiveStatusLabel(client)}
        </Chip>
      </span>
    );
  }

  const status = STATUS_DISPLAY[client.status];
  return (
    <span className="flex min-w-0">
      <Chip
        className={STATUS_CHIP_CLASS}
        color={status.color}
        size="sm"
        variant="soft"
      >
        {status.label}
      </Chip>
    </span>
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
      className="group mt-0 min-h-0 rounded-none! border-b border-surface-secondary px-3.5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-surface-hover active:scale-100! active:bg-surface-hover data-[pressed=true]:scale-100! sm:px-5 sm:py-3.5"
      id={client.id}
      textValue={name}
    >
      <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-3.5">
        <Avatar className="size-9.5 shrink-0 rounded-[11px]! bg-accent text-accent-foreground sm:size-[42px] sm:rounded-[12px]!">
          <Avatar.Fallback className="rounded-[11px]! bg-accent! text-[13px]! font-bold! text-accent-foreground! sm:rounded-[12px]! sm:text-sm!">
            {initials}
          </Avatar.Fallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <Label className="max-w-full truncate text-[13.5px] leading-[20.25px] font-semibold text-foreground sm:max-w-none sm:text-[14.5px] sm:leading-[21.75px]">
            {name}
          </Label>
          <Description className="truncate text-[11.5px] leading-[17.25px] text-muted sm:text-[12.5px] sm:leading-[18.75px]">
            {subtitle}
          </Description>
        </div>
        <div className="col-start-3 row-start-1 flex min-w-0 items-center justify-end gap-3.5">
          <div className="min-w-0">
            <MobileRowChips client={client} />
            <div className="hidden min-w-0 sm:block">
              <RowChips client={client} />
            </div>
          </div>
          <div className="hidden shrink-0 items-center sm:flex">
            {whatsappUrl ? (
              <a
                aria-label={`Message ${name} on WhatsApp`}
                className="grid min-h-11 min-w-11 place-items-center rounded-[10px] text-field-placeholder transition-colors duration-150 hover:bg-success-soft hover:text-success active:bg-success-soft"
                href={whatsappUrl}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle
                  size={17}
                  strokeWidth={2}
                />
              </a>
            ) : null}
            <Link
              aria-label={`Open messages with ${name}`}
              className="relative grid min-h-11 min-w-11 place-items-center rounded-[10px] text-field-placeholder transition-colors duration-150 hover:bg-surface-secondary hover:text-foreground active:bg-surface-secondary"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              to={ROUTES.CLIENT_MESSAGES.replace(':id', client.id)}
            >
              <MessagesSquare
                size={17}
                strokeWidth={2}
              />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.75 -right-0.75 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] leading-none font-bold text-danger-foreground">
                  {unreadLabel(unreadCount)}
                </span>
              ) : null}
            </Link>
            <ChevronRight
              aria-hidden
              className="hidden text-scrollbar lg:block"
              size={17}
              strokeWidth={2}
            />
          </div>
        </div>
      </div>
    </ListBox.Item>
  );
}
