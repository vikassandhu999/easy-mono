import {Avatar, Button, Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ReactNode} from 'react';

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
  action: string;
  chip: string;
  id: string;
  initials: string;
  name: string;
  onAction: () => void;
  subtitle: string;
  tone: QueueTone;
  /** Extra control after the verb — the snooze menu on Quiet/Expiring rows. */
  trailing?: ReactNode;
};

/**
 * One row grammar for every workbench queue (spec §4): severity stripe, avatar,
 * name first with the reason chip beside it, the actionable fact as subline,
 * and the queue's verb as an inline button. Row press opens the queue's
 * drill-in; the button does the verb without leaving the queue's mental frame.
 */
export function QueueRow({item}: {item: QueueRowItem}) {
  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'mt-0 grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 py-3',
        'hover:bg-surface-secondary sm:gap-4 sm:px-4',
      )}
      id={item.id}
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

      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <Label className="min-w-0 truncate type-body font-semibold text-foreground">{item.name}</Label>
          <Chip
            className="shrink-0"
            color={item.tone}
            size="sm"
            variant="soft"
          >
            {item.chip}
          </Chip>
        </span>
        <Description className="max-w-full truncate type-eyebrow text-muted">{item.subtitle}</Description>
      </div>

      <span className="flex shrink-0 items-center gap-1">
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
    </ListBox.Item>
  );
}
