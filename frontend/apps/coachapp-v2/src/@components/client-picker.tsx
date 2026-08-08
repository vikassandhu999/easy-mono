import {formatDateShort, getFullName, getInitials} from '@easy/utils';
import {Button, Chip, SearchField, Skeleton, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {
  CLIENT_PICKER_PAGE_SIZE,
  clientContact,
  clientCoverage,
  eligibleClientPage,
} from '@/@components/client-picker-data';
import {ErrorState} from '@/@components/error-state';
import {ROUTES} from '@/@config/routes';
import {type Client, useListClientsQuery} from '@/api/clients';

/** The row's coverage copy, from the facts in `clientCoverage`. */
function coverageCopy(client: Client): {copy: string; warning: boolean} {
  const coverage = clientCoverage(client);
  switch (coverage.kind) {
    case 'needs-programming':
      return {
        copy: coverage.coverageEnds ? `Coverage ends ${formatDateShort(coverage.coverageEnds)}` : 'No plan in force',
        warning: true,
      };
    case 'covered':
      return {
        copy: coverage.until ? `Covered until ${formatDateShort(coverage.until)}` : 'On an open-ended plan',
        warning: false,
      };
    case 'uncovered':
      return {copy: 'No plan in force', warning: false};
  }
}

function ClientRow({client, onSelect}: {client: Client; onSelect: (client: Client) => void}) {
  const coverage = coverageCopy(client);
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
        {/* Contact, not the coverage fact: names duplicate, and phone-only
            invitations still need enough identity to assign safely. */}
        <span className="max-w-full truncate type-eyebrow font-normal text-muted">{clientContact(client)}</span>
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

  const activeQuery = useListClientsQuery({
    include_plans: true,
    limit: CLIENT_PICKER_PAGE_SIZE,
    search: deferredSearch,
    status: 'active',
  });
  const pendingQuery = useListClientsQuery({
    include_plans: true,
    limit: CLIENT_PICKER_PAGE_SIZE,
    search: deferredSearch,
    status: 'pending',
  });
  const clients = eligibleClientPage([...(activeQuery.data?.data ?? []), ...(pendingQuery.data?.data ?? [])]);
  const isError = activeQuery.isError || pendingQuery.isError;
  const isLoading = activeQuery.isLoading || pendingQuery.isLoading;
  const refetch = () => Promise.all([activeQuery.refetch(), pendingQuery.refetch()]);

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
      <div className="flex flex-col overflow-y-auto">
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
      <div className="flex flex-col overflow-y-auto">
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
    <div className="flex w-full flex-col gap-2 py-2 min-h-[80dvh]">
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
