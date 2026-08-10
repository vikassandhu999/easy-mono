import {TodayCard, type TodayEntry} from '@/@components/today-card';

/**
 * Desktop rail — the workbench's left column (spec §5): the Today card.
 * Roster-wide search left the rail 2026-08-08 — it's a modal in the utility
 * row above Today (and ⌘K), no longer a persistent field.
 */
export function WorkbenchRail({
  active,
  entries,
  onSelect,
}: {
  active: string | undefined;
  entries: TodayEntry[];
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-2 flex flex-col gap-3">
        <TodayCard
          active={active}
          entries={entries}
          onSelect={onSelect}
        />
      </div>
    </aside>
  );
}
