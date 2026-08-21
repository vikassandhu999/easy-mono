/**
 * THROWAWAY PROTOTYPE — Programming queue interaction.
 *
 * Three variants on the existing workbench route, switchable with
 * `?view=programming&variant=A|B|C`. Sample reason data is intentionally local;
 * actions only reveal the proposed destination and never mutate server state.
 */
import {getInitials} from '@easy/utils';
import {
  Avatar,
  Button,
  Chip,
  Description,
  Label,
  Surface,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Dumbbell, Sparkles, Utensils} from 'lucide-react';
import {useState} from 'react';
import {GridListItem} from 'react-aria-components';
import {useSearchParams} from 'react-router-dom';

import BrowseListBox, {BrowseRow, LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {ViewShell} from '@/clients/workbench/view-shell';

import {PrototypeSwitcher} from './prototype-switcher';

type Service = 'nutrition' | 'training';
type ServiceFilter = 'all' | Service;
type ReasonCode = 'service_coverage_ending_soon' | 'service_coverage_missing' | 'service_never_programmed';

type ProgrammingReason = {
  code: ReasonCode;
  detail: string;
  firstUncoveredOn?: string;
  service: Service;
};

type ProgrammingClient = {
  id: string;
  name: string;
  reasons: ProgrammingReason[];
};

type ProposedAction = {
  client: ProgrammingClient;
  service: Service;
};

const CLIENTS: ProgrammingClient[] = [
  {
    id: 'maya-chen',
    name: 'Maya Chen',
    reasons: [
      {code: 'service_never_programmed', detail: 'No training plan has ever been assigned', service: 'training'},
      {
        code: 'service_coverage_missing',
        detail: 'Nutrition uncovered since 11 Aug',
        firstUncoveredOn: '2026-08-11',
        service: 'nutrition',
      },
    ],
  },
  {
    id: 'theo-grant',
    name: 'Theo Grant',
    reasons: [
      {code: 'service_never_programmed', detail: 'No training plan has ever been assigned', service: 'training'},
    ],
  },
  {
    id: 'priya-shah',
    name: 'Priya Shah',
    reasons: [
      {
        code: 'service_coverage_missing',
        detail: 'Nutrition uncovered since today',
        firstUncoveredOn: '2026-08-13',
        service: 'nutrition',
      },
    ],
  },
  {
    id: 'lucas-martin',
    name: 'Lucas Martin',
    reasons: [
      {
        code: 'service_coverage_ending_soon',
        detail: 'Training ends today · uncovered 14 Aug',
        firstUncoveredOn: '2026-08-14',
        service: 'training',
      },
    ],
  },
  {
    id: 'aisha-khan',
    name: 'Aisha Khan',
    reasons: [
      {
        code: 'service_coverage_ending_soon',
        detail: 'Training ends 16 Aug · uncovered 17 Aug',
        firstUncoveredOn: '2026-08-17',
        service: 'training',
      },
      {
        code: 'service_coverage_ending_soon',
        detail: 'Nutrition ends 18 Aug · uncovered 19 Aug',
        firstUncoveredOn: '2026-08-19',
        service: 'nutrition',
      },
    ],
  },
];

const VARIANTS = [
  {id: 'A', label: 'Priority list'},
  {id: 'B', label: 'Client task cards'},
  {id: 'C', label: 'Focus pane'},
];

const FILTERS: {id: ServiceFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'training', label: 'Training'},
  {id: 'nutrition', label: 'Nutrition'},
];

const PRIORITY: Record<ReasonCode, number> = {
  service_never_programmed: 0,
  service_coverage_missing: 1,
  service_coverage_ending_soon: 2,
};

const REASON_LABEL: Record<ReasonCode, string> = {
  service_never_programmed: 'Never programmed',
  service_coverage_missing: 'Coverage lapsed',
  service_coverage_ending_soon: 'Ending soon',
};

const REASON_TONE: Record<ReasonCode, string> = {
  service_never_programmed: 'bg-danger-soft text-danger',
  service_coverage_missing: 'bg-warning-soft text-warning-text',
  service_coverage_ending_soon: 'bg-accent-soft text-accent',
};

function filterClients(filter: ServiceFilter): ProgrammingClient[] {
  return CLIENTS.flatMap((client) => {
    const reasons = filter === 'all' ? client.reasons : client.reasons.filter((reason) => reason.service === filter);
    return reasons.length > 0 ? [{...client, reasons}] : [];
  });
}

function countFor(filter: ServiceFilter): number {
  return filterClients(filter).length;
}

function ServiceIcon({service}: {service: Service}) {
  const Icon = service === 'training' ? Dumbbell : Utensils;
  return <Icon className="size-4 shrink-0" />;
}

function ServiceName({service}: {service: Service}) {
  return <>{service === 'training' ? 'Training' : 'Nutrition'}</>;
}

function ReasonChip({code}: {code: ReasonCode}) {
  const merged = cn('shrink-0', REASON_TONE[code]);

  return (
    <Chip
      {...(merged ? {className: merged} : {})}
      size="sm"
      variant="soft"
    >
      {REASON_LABEL[code]}
    </Chip>
  );
}

function FilterBar({filter, onChange}: {filter: ServiceFilter; onChange: (filter: ServiceFilter) => void}) {
  return (
    <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ToggleButtonGroup
        aria-label="Filter Programming queue by service"
        className="flex w-max flex-nowrap gap-2"
        disallowEmptySelection
        isDetached
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next) {
            onChange(String(next) as ServiceFilter);
          }
        }}
        selectedKeys={[filter]}
        selectionMode="single"
      >
        {FILTERS.map((option) => (
          <ToggleButton
            className="toggle-button--filter"
            id={option.id}
            key={option.id}
          >
            {option.label}
            <span className="type-body font-light opacity-70">
              {' '}
              {countFor(option.id)}
            </span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

function PlanAction({
  client,
  onAction,
  reason,
}: {
  client: ProgrammingClient;
  onAction: (action: ProposedAction) => void;
  reason: ProgrammingReason;
}) {
  return (
    <Button
      className="shrink-0"
      onPress={() => onAction({client, service: reason.service})}
      size="sm"
      variant="outline"
    >
      Plan <ServiceName service={reason.service} />
    </Button>
  );
}

function ActionPreview({action}: {action: null | ProposedAction}) {
  if (!action) {
    return null;
  }

  const tab = action.service;
  return (
    <Surface className="rounded-card border border-accent bg-accent-soft p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="min-w-0">
          <Typography
            type="body-sm"
            weight="semibold"
          >
            Proposed action: open {action.client.name}&apos;s <ServiceName service={action.service} /> planning flow
          </Typography>
          <Typography
            className="mt-1 font-mono"
            color="muted"
            type="body-xs"
          >
            /clients/{action.client.id}?tab={tab}&amp;assign=plan
          </Typography>
        </div>
      </div>
    </Surface>
  );
}

function ReasonLine({
  client,
  onAction,
  reason,
}: {
  client: ProgrammingClient;
  onAction: (action: ProposedAction) => void;
  reason: ProgrammingReason;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-control bg-surface-secondary p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className="mt-0.5 text-muted">
          <ServiceIcon service={reason.service} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Typography
              type="body-sm"
              weight="semibold"
            >
              <ServiceName service={reason.service} />
            </Typography>
            <ReasonChip code={reason.code} />
          </div>
          <Typography
            className="mt-1"
            color="muted"
            type="body-xs"
          >
            {reason.detail}
          </Typography>
        </div>
      </div>
      <PlanAction
        client={client}
        onAction={onAction}
        reason={reason}
      />
    </div>
  );
}

function CompactPriorityRow({
  client,
  onAction,
}: {
  client: ProgrammingClient;
  onAction: (action: ProposedAction) => void;
}) {
  const primary = client.reasons[0];
  if (!primary) {
    return null;
  }

  const merged = cn(
    'list-box-item',
    LIST_ITEM_CLASS,
    'mt-0 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center',
  );

  return (
    <GridListItem
      {...(merged ? {className: merged} : {})}
      id={client.id}
      textValue={client.name}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar
          className="size-9 shrink-0"
          size="md"
        >
          <Avatar.Fallback className="type-eyebrow font-semibold">
            {getInitials(...client.name.split(' '))}
          </Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Label className="block truncate type-body font-semibold text-foreground">{client.name}</Label>
          <Description className="mt-1 flex min-w-0 items-center gap-2 type-eyebrow text-muted">
            <ServiceIcon service={primary.service} />
            <span className="truncate">{primary.detail}</span>
          </Description>
        </div>
        <ReasonChip code={primary.code} />
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {client.reasons.map((reason) => (
          <PlanAction
            client={client}
            key={`${reason.code}-${reason.service}`}
            onAction={onAction}
            reason={reason}
          />
        ))}
      </div>
    </GridListItem>
  );
}

function VariantA({clients, onAction}: {clients: ProgrammingClient[]; onAction: (action: ProposedAction) => void}) {
  const groups = [
    {code: 'service_never_programmed' as const, description: 'Initial plans first'},
    {code: 'service_coverage_missing' as const, description: 'Coverage is already broken'},
    {code: 'service_coverage_ending_soon' as const, description: 'Prepare the successor plan'},
  ];

  return (
    <div>
      {groups.map((group) => {
        const items = clients.filter((client) => client.reasons[0]?.code === group.code);
        if (items.length === 0) {
          return null;
        }
        return (
          <section key={group.code}>
            <div className="flex items-baseline justify-between gap-3 border-t border-separator bg-surface-secondary px-4 py-2 first:border-t-0">
              <Typography
                type="body-xs"
                weight="semibold"
              >
                {REASON_LABEL[group.code]}
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {group.description}
              </Typography>
            </div>
            <BrowseListBox
              ariaLabel={`${REASON_LABEL[group.code]} Programming clients`}
              className="gap-0 p-0"
              emptyState={null}
              fetchNextPage={() => undefined}
              grid
              isLoading={false}
              items={items}
              renderItem={(client) => (
                <CompactPriorityRow
                  client={client}
                  key={client.id}
                  onAction={onAction}
                />
              )}
              skeletonAvatar
            />
          </section>
        );
      })}
    </div>
  );
}

function ClientTaskCard({client, onAction}: {client: ProgrammingClient; onAction: (action: ProposedAction) => void}) {
  return (
    <GridListItem
      className="list-box-item m-0 flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm active:transform-none! data-[pressed=true]:transform-none!"
      id={client.id}
      textValue={client.name}
    >
      <div className="flex items-center gap-3">
        <Avatar
          className="size-10 shrink-0"
          size="md"
        >
          <Avatar.Fallback className="type-eyebrow font-semibold">
            {getInitials(...client.name.split(' '))}
          </Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Label className="block truncate type-body font-semibold text-foreground">{client.name}</Label>
          <Description className="type-eyebrow text-muted">
            {client.reasons.length} planning task{client.reasons.length === 1 ? '' : 's'}
          </Description>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {client.reasons.map((reason) => (
          <ReasonLine
            client={client}
            key={`${reason.code}-${reason.service}`}
            onAction={onAction}
            reason={reason}
          />
        ))}
      </div>
    </GridListItem>
  );
}

function VariantB({clients, onAction}: {clients: ProgrammingClient[]; onAction: (action: ProposedAction) => void}) {
  return (
    <BrowseListBox
      ariaLabel="Programming client task cards"
      className="grid gap-3 bg-background p-3 md:grid-cols-2"
      emptyState={null}
      fetchNextPage={() => undefined}
      grid
      isLoading={false}
      items={clients}
      renderItem={(client) => (
        <ClientTaskCard
          client={client}
          key={client.id}
          onAction={onAction}
        />
      )}
      skeletonAvatar
    />
  );
}

function FocusDetail({client, onAction}: {client: ProgrammingClient; onAction: (action: ProposedAction) => void}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar
          className="size-11 shrink-0"
          size="lg"
        >
          <Avatar.Fallback className="type-eyebrow font-semibold">
            {getInitials(...client.name.split(' '))}
          </Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <Typography
            className="truncate"
            type="h6"
          >
            {client.name}
          </Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Work from the highest-priority service downward
          </Typography>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {client.reasons.map((reason, index) => (
          <div
            className="flex flex-col gap-3 rounded-card border border-border p-4"
            key={`${reason.code}-${reason.service}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted">
                <ServiceIcon service={reason.service} />
              </span>
              <Typography
                type="body-sm"
                weight="semibold"
              >
                <ServiceName service={reason.service} />
              </Typography>
              <ReasonChip code={reason.code} />
              {index === 0 ? (
                <Chip
                  className="chip--outline"
                  size="sm"
                >
                  Do first
                </Chip>
              ) : null}
            </div>
            <Typography
              color="muted"
              type="body-sm"
            >
              {reason.detail}
            </Typography>
            <PlanAction
              client={client}
              onAction={onAction}
              reason={reason}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantC({clients, onAction}: {clients: ProgrammingClient[]; onAction: (action: ProposedAction) => void}) {
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? '');
  const selected = clients.find((client) => client.id === selectedId) ?? clients[0];

  if (!selected) {
    return null;
  }

  return (
    <div className="grid min-w-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <BrowseListBox
        ariaLabel="Programming clients"
        className="gap-0 border-b border-separator p-0 lg:border-r lg:border-b-0"
        emptyState={null}
        fetchNextPage={() => undefined}
        isLoading={false}
        items={clients}
        onAction={(key) => setSelectedId(String(key))}
        renderItem={(client) => {
          const primary = client.reasons[0];
          if (!primary) {
            return null;
          }
          return (
            <BrowseRow
              icon={<ServiceIcon service={primary.service} />}
              iconClassName={client.id === selected.id ? 'bg-ink text-ink-foreground' : undefined}
              id={client.id}
              key={client.id}
              meta={primary.detail}
              textValue={client.name}
              title={client.name}
              trailing={<ReasonChip code={primary.code} />}
            />
          );
        }}
      />
      <FocusDetail
        client={selected}
        onAction={onAction}
      />
    </div>
  );
}

export default function ProgrammingQueuePrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawVariant = searchParams.get('variant');
  const variant = rawVariant === 'B' || rawVariant === 'C' ? rawVariant : 'A';
  const rawFilter = searchParams.get('service');
  const filter: ServiceFilter = rawFilter === 'training' || rawFilter === 'nutrition' ? rawFilter : 'all';
  const [action, setAction] = useState<null | ProposedAction>(null);
  const clients = filterClients(filter).sort((left, right) => {
    const leftReason = left.reasons[0];
    const rightReason = right.reasons[0];
    const priority =
      PRIORITY[leftReason?.code ?? 'service_coverage_ending_soon'] -
      PRIORITY[rightReason?.code ?? 'service_coverage_ending_soon'];
    const uncovered = (leftReason?.firstUncoveredOn ?? '').localeCompare(rightReason?.firstUncoveredOn ?? '');
    return priority || uncovered || left.name.localeCompare(right.name);
  });

  const updateParam = (key: 'service' | 'variant', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'service' && value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, {replace: true});
  };

  return (
    <div className="flex flex-col gap-3 pb-20">
      <ViewShell
        meta={`${clients.length} client${clients.length === 1 ? '' : 's'}`}
        title="Programming"
        toolbar={
          <FilterBar
            filter={filter}
            onChange={(next) => updateParam('service', next)}
          />
        }
      >
        {variant === 'A' ? (
          <VariantA
            clients={clients}
            onAction={setAction}
          />
        ) : null}
        {variant === 'B' ? (
          <VariantB
            clients={clients}
            onAction={setAction}
          />
        ) : null}
        {variant === 'C' ? (
          <VariantC
            clients={clients}
            onAction={setAction}
          />
        ) : null}
      </ViewShell>
      <ActionPreview action={action} />
      <Typography
        color="muted"
        type="body-xs"
      >
        Sample reason data · All counts distinct clients; Training and Nutrition counts may overlap.
      </Typography>
      <PrototypeSwitcher
        current={variant}
        onChange={(next) => updateParam('variant', next)}
        variants={VARIANTS}
      />
    </div>
  );
}
