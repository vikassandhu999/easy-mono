import {SearchField} from '@heroui/react';

import {TodayCard, type TodayEntry} from '@/@components/today-card';

const SEARCH_GROUP =
  'min-h-9 gap-2 rounded-control border border-border bg-background type-body leading-[normal] [box-shadow:none] text-muted';

/** The roster's front door on both breakpoints — searches ALL clients. */
export function ClientSearchField({onSearchChange, search}: {onSearchChange: (value: string) => void; search: string}) {
  return (
    <SearchField
      aria-label="Search all clients"
      className="w-full min-w-0"
      onChange={onSearchChange}
      value={search}
    >
      <SearchField.Group className={SEARCH_GROUP}>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="Search clients" />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

/** Desktop rail — the workbench's left column (spec §5): search over the Today card. */
export function WorkbenchRail({
  active,
  entries,
  onSearchChange,
  onSelect,
  search,
}: {
  active: string | undefined;
  entries: TodayEntry[];
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  search: string;
}) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-2 flex flex-col gap-3">
        <ClientSearchField
          onSearchChange={onSearchChange}
          search={search}
        />
        <TodayCard
          active={active}
          entries={entries}
          onSelect={onSelect}
        />
      </div>
    </aside>
  );
}
