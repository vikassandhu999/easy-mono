import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Chip} from '@heroui/react';
import {cn} from '@heroui/styles';

import {BrowseRow} from '@/@components/browse-list-box';
import type {Client} from '@/api/clients';
import type {Client as ListClient} from '@/api/generated';
import {INACTIVE_REASON_LABEL, stageChip} from '@/clients/lib/client';

// RECIPES.md R5 — plan chip (neutral grey) and attention chip (warning-soft).
// Plain spans, not `Chip`: the spec chip is 7px radius / 11.5px / 600, and the
// tokens live in index.css (`rounded-chip`, `text-chip`, `--warning-text`).
const PLAN_CHIP_CLASS = 'rounded-chip bg-surface-secondary px-2 py-0.5 text-chip font-semibold text-foreground!';
const ATTENTION_CHIP_CLASS = 'rounded-chip bg-warning-soft px-2 py-0.5 text-chip font-semibold text-warning-text!';

// RECIPES.md R6 — status dot tone. success=active, accent=invited,
// danger=expired, muted=inactive. Full class names (never interpolated) so
// Tailwind keeps them.
const DOT_CLASS = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  muted: 'bg-muted-2',
  success: 'bg-success',
} as const;

const MOBILE_SUBTITLE_CLASS = 'block max-w-full truncate text-xs text-muted sm:hidden';
const MOBILE_SUBTITLE_ATTENTION_CLASS = 'block max-w-full truncate text-xs text-warning-text! sm:hidden';

type StatusCell = {label: string; time: null | string; tone: keyof typeof DOT_CLASS};

function isExpired(client: ListClient): boolean {
  return (
    client.status === 'inactive' && client.inactive_reason === 'subscription_expired' && !!client.subscription_ends_on
  );
}

// COPY.md §CL row status strings. `Active {time} ago` has no data behind it —
// the client list carries no last-active timestamp — so active rows show the
// dot + `Active` and leave the relative-time column empty (see PORT-TICKET).
function getStatusCell(client: ListClient): StatusCell {
  if (client.status === 'active') {
    return {label: 'Active', time: null, tone: 'success'};
  }
  if (client.status === 'pending') {
    return {
      label: 'Awaiting acceptance',
      time: `Invited ${formatTimeAgo(client.invitation_sent_at ?? client.inserted_at)}`,
      tone: 'accent',
    };
  }
  if (isExpired(client)) {
    return {label: `Expired ${formatIsoDateShort(client.subscription_ends_on as string)}`, time: null, tone: 'danger'};
  }
  return {label: 'Inactive', time: null, tone: 'muted'};
}

function getAttentionLabels(client: ListClient): string[] {
  if (client.status !== 'active') {
    return [];
  }
  return [
    client.intake_incomplete ? 'Intake incomplete' : null,
    client.needs_plan ? 'Needs plan' : null,
    client.expiring_soon ? 'Expiring soon' : null,
  ].filter((label): label is string => label !== null);
}

// The neutral grey chip. The design shows assigned plan names there; the client
// list endpoint carries no plans, so the row shows the client's coaching stage
// (or the inactive reason) instead — real data in the same slot.
function getPlanChipLabel(client: ListClient): null | string {
  if (client.status === 'active') {
    return client.stage === 'coaching' ? 'Coaching' : 'Onboarding';
  }
  if (client.status === 'inactive' && !isExpired(client)) {
    return INACTIVE_REASON_LABEL[client.inactive_reason ?? 'manual'] ?? null;
  }
  return null;
}

// COPY.md §CL mobile row subtitles.
function getMobileSubtitle(client: ListClient): {isAttention: boolean; text: string} {
  if (client.status === 'active') {
    if (client.expiring_soon) {
      return {isAttention: true, text: 'Subscription expiring soon'};
    }
    if (client.needs_plan) {
      return {isAttention: true, text: 'Needs a plan assigned'};
    }
    if (client.intake_incomplete) {
      return {isAttention: true, text: 'Intake form incomplete'};
    }
    return {isAttention: false, text: client.stage === 'coaching' ? 'Coaching' : 'Onboarding'};
  }
  if (client.status === 'pending') {
    return {isAttention: false, text: `Invited · ${formatTimeAgo(client.invitation_sent_at ?? client.inserted_at)}`};
  }
  // The status already reads on the name line — the subtitle carries the reason
  // (or the contact) instead of repeating it.
  return {isAttention: false, text: getPlanChipLabel(client) ?? client.email ?? client.phone ?? '—'};
}

/** Chip row reused by the client detail header. */
export function RowChips({client}: {client: Client}) {
  if (client.status === 'active') {
    const stage = stageChip(client);
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        {getAttentionLabels(client).map((label) => (
          <Chip
            color="warning"
            key={label}
            size="sm"
            variant="soft"
          >
            {label}
          </Chip>
        ))}
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

  const status = getStatusCell(client);
  return (
    <Chip
      color={status.tone === 'success' ? 'success' : 'default'}
      size="sm"
      variant="soft"
    >
      {status.label}
    </Chip>
  );
}

export default function ClientListItem({client}: {client: ListClient}) {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
  const initials = getInitials(client.first_name, client.last_name);
  const status = getStatusCell(client);
  const attentionLabels = getAttentionLabels(client);
  const planChipLabel = getPlanChipLabel(client);
  const mobileSubtitle = getMobileSubtitle(client);

  return (
    <BrowseRow
      className={cn(
        // RECIPES.md R4 — row grid. Chips sit in their own LEFT-aligned track.
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3',
        'sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,2fr)_auto_auto] sm:gap-4 sm:px-4',
      )}
      icon={
        <Avatar
          className="size-9 shrink-0 bg-surface-secondary sm:size-10"
          size="md"
        >
          <Avatar.Fallback className="text-xs font-semibold text-foreground">{initials}</Avatar.Fallback>
        </Avatar>
      }
      iconClassName="size-9 rounded-full bg-transparent sm:size-11"
      id={client.id}
      meta={
        <>
          {/* Plain span: tw-merge misreads `text-warning-text` as a font size. */}
          <span className={mobileSubtitle.isAttention ? MOBILE_SUBTITLE_ATTENTION_CLASS : MOBILE_SUBTITLE_CLASS}>
            {mobileSubtitle.text}
          </span>
          <span className="hidden max-w-full truncate text-xs text-muted sm:block">
            {client.email ?? client.phone ?? '—'}
          </span>
        </>
      }
      textValue={name}
      title={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate">{name}</span>
          <span
            aria-hidden
            className={cn('size-1.5 shrink-0 rounded-full sm:hidden', DOT_CLASS[status.tone])}
          />
          <span className="shrink-0 truncate text-xs font-normal text-muted sm:hidden">{status.label}</span>
        </span>
      }
      trailing={
        <>
          <div className="hidden min-w-0 flex-wrap items-center justify-start gap-1.5 sm:flex">
            {planChipLabel ? <span className={PLAN_CHIP_CLASS}>{planChipLabel}</span> : null}
            {attentionLabels.map((label) => (
              <span
                className={ATTENTION_CHIP_CLASS}
                key={label}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="hidden items-center justify-end gap-1.5 text-xs text-muted sm:flex">
            <span
              aria-hidden
              className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[status.tone])}
            />
            <span className="whitespace-nowrap">{status.label}</span>
            {status.time ? <span className="whitespace-nowrap text-muted-2">· {status.time}</span> : null}
          </div>
        </>
      }
      trailingClassName="contents"
    />
  );
}
