import type {Key} from '@heroui/react';

import {Button, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {cn} from '@heroui/styles';

/**
 * One rail item. `count` is a TOTAL (work remaining), never an unread figure —
 * only a total reaches zero by working (spec §2). Zero renders no number at
 * all; `muted` keeps the New queue from shouting next to churn/revenue queues.
 */
export type RailEntry = {
  count?: number;
  id: string;
  label: string;
  muted?: boolean;
};

type RailProps = {
  active: string | undefined;
  browse: RailEntry[];
  onSelect: (id: string) => void;
  today: RailEntry[];
};

function RailCount({entry, isActive}: {entry: RailEntry; isActive: boolean}) {
  if (!entry.count) {
    return null;
  }
  return (
    <span
      className={cn(
        'tabular-nums type-eyebrow',
        entry.muted ? 'font-normal text-muted' : isActive ? 'font-semibold' : 'font-semibold text-accent',
      )}
    >
      {entry.count > 99 ? '99+' : entry.count}
    </span>
  );
}

function RailGroup({
  active,
  entries,
  label,
  onSelect,
}: {
  active: string | undefined;
  entries: RailEntry[];
  label: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="px-2.5 pb-1.5 pt-4 type-eyebrow font-semibold uppercase tracking-wider text-muted first:pt-0">
        {label}
      </div>
      {entries.map((entry) => {
        const isActive = entry.id === active;
        return (
          <Button
            className={cn(
              'button--row h-8 w-full justify-between rounded-control px-2.5 type-body',
              isActive
                ? 'bg-accent-soft font-semibold text-accent'
                : 'font-medium text-foreground hover:bg-surface-secondary',
            )}
            key={entry.id}
            onPress={() => onSelect(entry.id)}
            variant="ghost"
          >
            <span>{entry.label}</span>
            <RailCount
              entry={entry}
              isActive={isActive}
            />
          </Button>
        );
      })}
    </>
  );
}

/** Desktop rail — the workbench's left column (spec §5). */
export function WorkbenchRail({active, browse, onSelect, today}: RailProps) {
  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <nav className="sticky top-2 flex flex-col gap-0.5">
        <RailGroup
          active={active}
          entries={today}
          label="Today"
          onSelect={onSelect}
        />
        <RailGroup
          active={active}
          entries={browse}
          label="Browse"
          onSelect={onSelect}
        />
      </nav>
    </aside>
  );
}

/** The rail collapsed to a horizontally scrollable chip row below `lg` (spec §5 mobile). */
export function WorkbenchChips({active, browse, onSelect, today}: RailProps) {
  const entries = [...today, ...browse];
  return (
    <div className="-mx-4 min-w-0 max-w-full overflow-x-auto px-4 lg:hidden">
      <ToggleButtonGroup
        aria-label="Workbench queues"
        className="flex w-max flex-nowrap gap-2"
        isDetached
        onSelectionChange={(keys: Set<Key>) => {
          const next = [...keys][0];
          if (next) {
            onSelect(String(next));
          }
        }}
        selectedKeys={active ? [active] : []}
        selectionMode="single"
      >
        {entries.map((entry) => (
          <ToggleButton
            className="toggle-button--filter"
            id={entry.id}
            key={entry.id}
          >
            {entry.label}
            {entry.count ? (
              <span className="type-body font-light opacity-70">
                {' '}
                {entry.count > 99 ? '99+' : entry.count}
              </span>
            ) : null}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
