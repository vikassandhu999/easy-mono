import {Button} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight, type LucideIcon} from 'lucide-react';

/**
 * One Today-card item. `count` is a TOTAL (work remaining), never an unread
 * figure — only a total reaches zero by working (workbench spec §2). Zero
 * renders no number at all; `muted` keeps the New queue from shouting next to
 * churn/revenue queues. `meta` is the queue's one-line story — the dynamic
 * figure while there's work, the queue's definition when drained.
 */
export type TodayEntry = {
  count?: number;
  icon?: LucideIcon;
  id: string;
  label: string;
  meta?: string;
  muted?: boolean;
};

function EntryCount({detailed, entry}: {detailed: boolean; entry: TodayEntry}) {
  if (!entry.count) {
    return null;
  }
  return (
    <span
      className={cn(
        'tabular-nums',
        detailed ? 'type-body' : 'type-eyebrow',
        entry.muted ? 'font-normal text-muted' : 'font-semibold text-accent',
      )}
    >
      {entry.count > 99 ? '99+' : entry.count}
    </span>
  );
}

function CompactRow({
  entry,
  isActive,
  onSelect,
}: {
  entry: TodayEntry;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = entry.icon;
  return (
    <Button
      className={cn(
        'button--row h-8 w-full justify-start gap-2 rounded-control px-2 type-body',
        isActive
          ? 'bg-accent-soft font-semibold text-accent'
          : 'font-medium text-foreground hover:bg-surface-secondary',
      )}
      onPress={() => onSelect(entry.id)}
      variant="ghost"
    >
      {Icon ? <Icon className={cn('size-4 shrink-0', isActive ? 'text-accent' : 'text-muted')} /> : null}
      <span className="flex-1 truncate text-left">{entry.label}</span>
      <EntryCount
        detailed={false}
        entry={entry}
      />
    </Button>
  );
}

function MenuRow({entry, onSelect}: {entry: TodayEntry; onSelect: (id: string) => void}) {
  const Icon = entry.icon;
  return (
    <Button
      className="button--row w-full justify-start gap-3 rounded-control px-2.5 py-2.5 text-foreground"
      onPress={() => onSelect(entry.id)}
      variant="ghost"
    >
      {Icon ? <Icon className="size-5 shrink-0 text-muted" /> : null}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="type-body font-medium">{entry.label}</span>
        {entry.meta ? <span className="truncate type-eyebrow font-normal text-muted">{entry.meta}</span> : null}
      </span>
      <EntryCount
        detailed
        entry={entry}
      />
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </Button>
  );
}

/**
 * The Today card — the ONE representation of today's work, shared by the
 * workbench (desktop rail compact, mobile menu detailed) and the dashboard
 * (detailed). The workbench spec's §9 rule is the reason it is shared: two
 * surfaces at 80% overlap teach the coach to trust neither, so every surface
 * renders the same object — same labels, icons, order, counts.
 *
 * Compact: tight rows, count, active highlight. Detailed: meta line,
 * body-size count and a chevron — rows read as destinations, not tabs
 * (mobile push-nav, decision 2026-08-07).
 */
export function TodayCard({
  active,
  detailed = false,
  entries,
  onSelect,
}: {
  active?: string;
  detailed?: boolean;
  entries: TodayEntry[];
  onSelect: (id: string) => void;
}) {
  const total = entries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);
  // Counts still loading (or failed): claim nothing rather than "Clear".
  const known = entries.some((entry) => entry.count !== undefined);
  return (
    <nav className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="font-grotesk type-title font-semibold">Today</span>
        {known ? (
          <span className="tabular-nums type-eyebrow text-muted">{total > 0 ? `${total} to do` : 'Clear'}</span>
        ) : null}
      </div>
      <div className={cn('flex flex-col p-1.5', detailed ? '' : 'gap-0.5')}>
        {entries.map((entry) =>
          detailed ? (
            <MenuRow
              entry={entry}
              key={entry.id}
              onSelect={onSelect}
            />
          ) : (
            <CompactRow
              entry={entry}
              isActive={entry.id === active}
              key={entry.id}
              onSelect={onSelect}
            />
          ),
        )}
      </div>
    </nav>
  );
}
