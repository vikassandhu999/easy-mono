import {formatDateShort, getFullName, getInitials} from '@easy/utils';
import {Button, Chip, SearchField, Skeleton, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {ROUTES} from '@/@config/routes';
import {type Client, useListClientsQuery} from '@/api/clients';

/**
 * The client's coverage story, in the workbench vocabulary (add-to-client
 * spec §2.2). `covered` gates the caller's confirm step: adding on top of
 * live coverage is a choice, assigning to someone with none is frictionless.
 * A pending client with no plan is NOT "open-ended" — only an active client
 * with no `covered_until` earned that reading (open-ended plan in force).
 */
export function clientCoverage(client: Client): {copy: string; covered: boolean; warning: boolean} {
  if (client.needs_programming) {
    return {
      copy: client.covered_until ? `Coverage ends ${formatDateShort(client.covered_until)}` : 'No plan in force',
      covered: false,
      warning: true,
    };
  }
  if (client.covered_until) {
    return {copy: `Covered until ${formatDateShort(client.covered_until)}`, covered: true, warning: false};
  }
  if (client.status === 'active') {
    return {copy: 'On an open-ended plan', covered: true, warning: false};
  }
  return {copy: 'No plan in force', covered: false, warning: false};
}

function ClientRow({client, onSelect}: {client: Client; onSelect: (client: Client) => void}) {
  const coverage = clientCoverage(client);
  return (
    <Button
      // shrink-0: `button--row` releases min-height to 0, and a flex child
      // with min-height 0 inside the max-h scroll column SHRINKS instead of
      // scrolling — 28 rows compressed to ~24px and overlapped (caught live
      // at 375). The list scrolls; the rows must not give.
      className="button--row w-full shrink-0 justify-start gap-2 px-2 py-2 text-left"
      onPress={() => onSelect(client)}
      variant="ghost"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-warning-soft type-eyebrow font-semibold text-warning-soft-foreground">
        {getInitials(client.first_name, client.last_name) || '?'}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="flex min-w-0 max-w-full items-center gap-1.5">
          <span className="truncate type-body font-medium">
            {getFullName(client.first_name, client.last_name) || 'No name'}
          </span>
          {client.status === 'pending' ? (
            <Chip
              className="shrink-0"
              size="sm"
            >
              Invited
            </Chip>
          ) : null}
        </span>
        {/* Email, not the coverage fact: names duplicate (the seed DB has two
            Taylor Jacksons) and email is the row's only unique identity. */}
        <span className="max-w-full truncate type-eyebrow font-normal text-muted">{client.email}</span>
      </span>
      <span className={cn('shrink-0 type-eyebrow font-normal', coverage.warning ? 'text-warning' : 'text-muted')}>
        {coverage.copy}
      </span>
    </Button>
  );
}

function GroupLabel({children}: {children: string}) {
  return (
    <div className="px-2 pb-1 pt-2 type-eyebrow font-semibold uppercase tracking-wider text-muted first:pt-0.5">
      {children}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          className="flex items-center gap-2 px-2 py-1.5"
          key={i}
        >
          <Skeleton className="size-7 rounded-pill" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-2.5 w-40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

type ClientPickerContentProps = {
  onSelect: (client: Client) => void;
};

/**
 * Body of the "Add to client" picker (add-to-client spec §2): a default list,
 * grouped **Needs programming / Everyone else**, coverage fact per row —
 * assigning is placing coverage, so the picker is triage-aware, not an
 * identity lookup. Searching flattens the groups. Inactive clients are
 * excluded: programming for someone who can't log in is a mistake, not an
 * option.
 */
export default function ClientPickerContent({onSelect}: ClientPickerContentProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const searching = deferredSearch.trim().length > 0;

  const {data, isError, isLoading, refetch} = useListClientsQuery({limit: 30, search: deferredSearch});
  const clients = (data?.data ?? []).filter((client) => client.status !== 'inactive');

  const needsProgramming = clients
    .filter((client) => client.needs_programming)
    // The Programming queue's order: no coverage first, then soonest end.
    .sort((a, b) => (a.covered_until ?? '').localeCompare(b.covered_until ?? ''));
  const everyoneElse = clients
    .filter((client) => !client.needs_programming)
    .sort((a, b) => getFullName(a.first_name, a.last_name).localeCompare(getFullName(b.first_name, b.last_name)));
  const showLabels = !searching && needsProgramming.length > 0 && everyoneElse.length > 0;

  let body: React.ReactNode;
  if (isError) {
    body = (
      <ErrorState
        message="Couldn't load clients."
        onRetry={refetch}
      />
    );
  } else if (isLoading) {
    body = <SkeletonRows />;
  } else if (clients.length === 0) {
    body = searching ? (
      <Typography
        align="center"
        className="py-6"
        color="muted"
        type="body-sm"
      >
        No clients match your search.
      </Typography>
    ) : (
      <div className="flex flex-col items-center gap-3 py-6">
        <Typography
          color="muted"
          type="body-sm"
        >
          Invite your first client to get started.
        </Typography>
        <Button
          onPress={() => navigate(ROUTES.INVITE_CLIENT)}
          size="sm"
          variant="secondary"
        >
          Invite client
        </Button>
      </div>
    );
  } else if (searching) {
    // Flat results in server order — search is lookup, the groups are triage.
    body = (
      <div className="flex max-h-70 flex-col overflow-y-auto">
        {clients.map((client) => (
          <ClientRow
            client={client}
            key={client.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  } else {
    body = (
      <div className="flex max-h-70 flex-col overflow-y-auto">
        {showLabels ? <GroupLabel>Needs programming</GroupLabel> : null}
        {needsProgramming.map((client) => (
          <ClientRow
            client={client}
            key={client.id}
            onSelect={onSelect}
          />
        ))}
        {showLabels ? <GroupLabel>Everyone else</GroupLabel> : null}
        {everyoneElse.map((client) => (
          <ClientRow
            client={client}
            key={client.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <SearchField
        aria-label="Search clients"
        autoFocus
        onChange={setSearch}
        value={search}
        variant="secondary"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search clients…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {body}
    </div>
  );
}
