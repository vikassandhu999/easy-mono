import {formatIsoDateShort, formatTimeAgo, getInitials} from '@easy/utils';
import {Avatar, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';

import {ChevronRight} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
// The hand-written `Client` type in `@/api/clients` does not yet carry the
// `training_plan_name`/`nutrition_plan_name` fields the schema exposes
// (opt-in via `include_plans`), so this row derives its own type straight
// from the schema rather than widening the shared type for one consumer.
import type {components} from '@/api/schema';
import {INACTIVE_REASON_LABEL} from '@/clients/lib/client';

type ListClient = components['schemas']['Client'];

// RECIPES.md R5 — plan chip (neutral grey) and attention chip (warning-soft).
// Plain spans, not `Chip`: the spec chip is 7px radius / 11.5px / 600, and the
// tokens live in index.css (`rounded-chip`, `type-eyebrow`, `--warning-text`).
const PLAN_CHIP_CLASS = 'rounded-chip bg-surface-secondary px-2 py-0.5 type-eyebrow font-semibold text-foreground!';
const ATTENTION_CHIP_CLASS = 'rounded-chip bg-warning-soft px-2 py-0.5 type-eyebrow font-semibold text-warning-text!';

// RECIPES.md R6 — status dot tone. success=active, accent=invited,
// danger=expired, muted=inactive. Full class names (never interpolated) so
// Tailwind keeps them.
const DOT_CLASS = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  muted: 'bg-muted-2',
  success: 'bg-success',
} as const;

const MOBILE_SUBTITLE_CLASS = 'block max-w-full truncate type-eyebrow text-muted sm:hidden';
const MOBILE_SUBTITLE_ATTENTION_CLASS = 'block max-w-full truncate type-eyebrow text-warning-text! sm:hidden';

type StatusCell = {label: string; time: null | string; tone: keyof typeof DOT_CLASS};

function isExpired(client: ListClient): boolean {
  return (
    client.status === 'inactive' && client.inactive_reason === 'subscription_expired' && !!client.subscription_ends_on
  );
}

// COPY.md §CL row status strings. `last_active_at` is the latest successful
// workout completion, food log, check-in submission, or weight upsert. A client
// who has never done one shows the dot and label alone.
function getStatusCell(client: ListClient): StatusCell {
  if (client.status === 'active') {
    return {
      label: 'Active',
      time: client.last_active_at ? formatTimeAgo(client.last_active_at) : null,
      tone: 'success',
    };
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
  const missingPlan = !client.training_plan_name && !client.nutrition_plan_name;
  return [missingPlan ? 'Needs plan' : null, client.expiring_soon ? 'Expiring soon' : null].filter(
    (label): label is string => label !== null,
  );
}

// The neutral grey chips: the names of the plans in force today, then the
// coaching stage. The plan names arrive only because this list asks for them
// (`include_plans` — see `api/clients.ts`), and are absent for a client with no
// assigned plan, so the stage is what a bare row still shows.
function getNeutralChipLabels(client: ListClient): string[] {
  if (client.status === 'active') {
    return [
      client.training_plan_name,
      client.nutrition_plan_name,
      client.stage === 'coaching' ? 'Coaching' : 'Onboarding',
    ].filter((label): label is string => Boolean(label));
  }
  if (client.status === 'inactive' && !isExpired(client)) {
    return [INACTIVE_REASON_LABEL[client.inactive_reason ?? 'manual']].filter((label): label is string =>
      Boolean(label),
    );
  }
  return [];
}

// COPY.md §CL mobile row subtitles.
function getMobileSubtitle(client: ListClient): {isAttention: boolean; text: string} {
  if (client.status === 'active') {
    if (client.expiring_soon) {
      return {isAttention: true, text: 'Coaching period ending soon'};
    }
    if (!client.training_plan_name && !client.nutrition_plan_name) {
      return {isAttention: true, text: 'Needs a plan assigned'};
    }
    return {isAttention: false, text: client.stage === 'coaching' ? 'Coaching' : 'Onboarding'};
  }
  if (client.status === 'pending') {
    return {isAttention: false, text: `Invited · ${formatTimeAgo(client.invitation_sent_at ?? client.inserted_at)}`};
  }
  // The status already reads on the name line — the subtitle carries the reason
  // (or the contact) instead of repeating it.
  return {isAttention: false, text: getNeutralChipLabels(client)[0] ?? client.email ?? client.phone ?? '—'};
}

export default function ClientListItem({client}: {client: ListClient}) {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
  const initials = getInitials(client.first_name, client.last_name);
  const status = getStatusCell(client);
  const attentionLabels = getAttentionLabels(client);
  const neutralChipLabels = getNeutralChipLabels(client);
  const mobileSubtitle = getMobileSubtitle(client);

  // Not a BrowseRow: this row's anatomy is a 5-track grid (avatar · identity ·
  // chips · status · chevron), so it owns its ListBox.Item on LIST_ITEM_CLASS.
  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'mt-0',
        // RECIPES.md R4 — row grid. Chips sit in their own LEFT-aligned track.
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3',
        'sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,2fr)_auto_auto] sm:gap-4 sm:px-4',
      )}
      id={client.id}
      textValue={name}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-transparent sm:size-11">
        <Avatar
          className="size-9 shrink-0 bg-surface-secondary sm:size-10"
          size="md"
        >
          <Avatar.Fallback className="type-eyebrow font-semibold text-foreground">{initials}</Avatar.Fallback>
        </Avatar>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="min-w-0 max-w-full truncate type-body font-semibold text-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate">{name}</span>
            <span
              aria-hidden
              className={cn('size-1.5 shrink-0 rounded-pill sm:hidden', DOT_CLASS[status.tone])}
            />
            <span className="shrink-0 truncate type-eyebrow font-normal text-muted sm:hidden">{status.label}</span>
          </span>
        </Label>
        <Description className="max-w-full truncate type-eyebrow text-muted">
          {/* Plain span: tw-merge misreads `text-warning-text` as a font size. */}
          <span className={mobileSubtitle.isAttention ? MOBILE_SUBTITLE_ATTENTION_CLASS : MOBILE_SUBTITLE_CLASS}>
            {mobileSubtitle.text}
          </span>
          <span className="hidden max-w-full truncate type-eyebrow text-muted sm:block">
            {client.email ?? client.phone ?? '—'}
          </span>
        </Description>
      </div>

      <div className="hidden min-w-0 flex-wrap items-center justify-start gap-1.5 sm:flex">
        {neutralChipLabels.map((label) => (
          <span
            className={PLAN_CHIP_CLASS}
            key={label}
          >
            {label}
          </span>
        ))}
        {attentionLabels.map((label) => (
          <span
            className={ATTENTION_CHIP_CLASS}
            key={label}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="hidden items-center justify-end gap-1.5 type-eyebrow text-muted sm:flex">
        <span
          aria-hidden
          className={cn('size-1.5 shrink-0 rounded-pill', DOT_CLASS[status.tone])}
        />
        <span className="whitespace-nowrap">{status.label}</span>
        {status.time ? <span className="whitespace-nowrap text-muted-2">· {status.time}</span> : null}
      </div>

      <ChevronRight className="shrink-0 text-muted-2" />
    </ListBox.Item>
  );
}
