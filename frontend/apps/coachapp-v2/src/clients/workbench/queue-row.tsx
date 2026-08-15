import {Avatar, Button, Description, Label} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ReactNode} from 'react';
import {GridListItem} from 'react-aria-components';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';

export type QueueTone = 'accent' | 'danger' | 'default' | 'warning';

const AVATAR_TONE: Record<QueueTone, string> = {
  accent: 'bg-accent-soft text-accent',
  danger: 'bg-danger-soft text-danger',
  default: 'bg-surface-secondary text-muted',
  warning: 'bg-warning-soft text-warning-text',
};

const STRIPE_TONE: Record<QueueTone, string> = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  default: 'bg-border',
  warning: 'bg-warning',
};

export type QueueRowItem = {
  /** Label of the queue's verb button. */
  action: string;
  id: string;
  initials: string;
  name: string;
  /** The verb — does the work without leaving the queue. */
  onAction: () => void;
  /** Row press — the drill-in. Grid rows own their press, the list can't. */
  onOpen: () => void;
  subtitle: string;
  tone: QueueTone;
  /** Extra control after the verb — the snooze menu on Quiet/Expiring rows. */
  trailing?: ReactNode;
};

/**
 * One row grammar for every workbench queue (spec §4): severity stripe, avatar,
 * name, the actionable fact as subline, and the queue's verb as an inline
 * button. Row press opens the queue's drill-in; the button does the verb
 * without leaving the queue's mental frame.
 *
 * The reason chip spec §4 put beside the name is gone (2026-08-06): in every
 * queue it restated either the queue title the coach is already in ("Quiet" in
 * Quiet) or the subtitle directly below it ("No plan" over "No plan in
 * force"), and at 375px it was what squeezed names down to "Hayden …". Tone
 * still reads from the stripe and the avatar tint.
 *
 * A GRID row, not a listbox option (`BrowseListBox grid`): a listbox option is
 * a single focusable unit, so the verb button and the snooze menu were
 * unreachable by keyboard — Tab entered the list once, the arrows moved
 * between rows, and Tab left the page. `list-box-item` is kept as the base
 * class so the row keeps the design system's row chrome and focus ring; only
 * the collection semantics changed.
 *
 * The identity track is `minmax(0, 1fr)` plus its own overflow clip: a long
 * name must ellipsize inside that column instead of painting under the verb
 * and snooze controls. The subtitle is the actionable fact (end date, missed
 * due date), so it wraps below `sm` and truncates only when the row has room.
 */
export function QueueRow({item}: {item: QueueRowItem}) {
  return (
    <GridListItem
      className={cn(
        'list-box-item',
        LIST_ITEM_CLASS,
        'mt-0 grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 py-3',
        'hover:bg-surface-secondary sm:gap-4 sm:px-4',
      )}
      id={item.id}
      onAction={item.onOpen}
      textValue={item.name}
    >
      <span
        aria-hidden
        className={cn('w-0.75 shrink-0 self-stretch rounded-pill', STRIPE_TONE[item.tone])}
      />

      <Avatar
        className="size-9 shrink-0"
        size="md"
      >
        <Avatar.Fallback className={cn('type-eyebrow font-semibold', AVATAR_TONE[item.tone])}>
          {item.initials}
        </Avatar.Fallback>
      </Avatar>

      <div className="flex min-w-0 flex-col overflow-hidden">
        <Label className="block min-w-0 max-w-full truncate type-body font-semibold text-foreground">{item.name}</Label>
        <Description className="max-w-full whitespace-normal type-eyebrow leading-tight text-muted sm:truncate">
          {item.subtitle}
        </Description>
      </div>

      {/* gap-2, not gap-1: the controls are 36px (below the 44px pointer
          target the app knowingly trades away), so the spacing between them is
          what keeps the effective tap areas apart. */}
      <span className="flex shrink-0 items-center gap-2">
        <Button
          className="shrink-0"
          onPress={item.onAction}
          size="sm"
          variant="outline"
        >
          {item.action}
        </Button>
        {item.trailing}
      </span>
    </GridListItem>
  );
}
