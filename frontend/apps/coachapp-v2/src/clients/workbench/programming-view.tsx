import {getInitials} from '@easy/utils';
import {Avatar, Button, Chip, Description, Label, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Dumbbell, Utensils} from 'lucide-react';
import {GridListItem} from 'react-aria-components';
import {useNavigate, useSearchParams} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {
  useProgrammingQueueInfiniteQuery,
  useWorkbenchCountsQuery,
  type WorkbenchProgrammingQueueItem,
} from '@/api/workbench';
import {workbenchCount} from '@/clients/lib/workbench-counts';
import {
  assignPlanHref,
  groupProgrammingItems,
  type ProgrammingServiceFilter,
  programmingGroupDescription,
} from '@/clients/lib/workbench-programming';
import {presentProgrammingReason} from '@/clients/lib/workbench-reason-presentation';

const FILTERS: {id: ProgrammingServiceFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'training', label: 'Training'},
  {id: 'nutrition', label: 'Nutrition'},
];

type ProgrammingReason = WorkbenchProgrammingQueueItem['reasons'][number];

const REASON_TONE: Record<ProgrammingReason['code'], string> = {
  service_coverage_ending_soon: 'bg-accent-soft text-accent',
  service_coverage_missing: 'bg-warning-soft text-warning-text',
  service_never_programmed: 'bg-danger-soft text-danger',
};

function parseFilter(raw: null | string): ProgrammingServiceFilter {
  return raw === 'training' || raw === 'nutrition' ? raw : 'all';
}

function clientName(item: WorkbenchProgrammingQueueItem): string {
  return [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || item.client.email || 'Client';
}

function ServiceIcon({service}: {service: ProgrammingReason['service']}) {
  const Icon = service === 'nutrition' ? Utensils : Dumbbell;
  return <Icon className="size-4 shrink-0" />;
}

function ReasonChip({reason}: {reason: ProgrammingReason}) {
  return (
    <Chip
      className={cn('shrink-0', REASON_TONE[reason.code])}
      size="sm"
      variant="soft"
    >
      {presentProgrammingReason(reason).title}
    </Chip>
  );
}

export function ProgrammingToolbar() {
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get('service'));
  const counts = useWorkbenchCountsQuery().data?.data;

  const filterCount = (id: ProgrammingServiceFilter) => {
    if (!counts) {
      return undefined;
    }
    return id === 'all' ? workbenchCount(counts, 'programming') : counts.programming[id];
  };

  return (
    <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ToggleButtonGroup
        aria-label="Filter Programming queue by service"
        className="flex w-max flex-nowrap gap-2"
        disallowEmptySelection
        isDetached
        onSelectionChange={(keys) => {
          const next = String([...keys][0] ?? 'all') as ProgrammingServiceFilter;
          const updated = new URLSearchParams(params);
          updated.set('view', 'programming');
          if (next === 'all') {
            updated.delete('service');
          } else {
            updated.set('service', next);
          }
          setParams(updated, {replace: true});
        }}
        selectedKeys={[filter]}
        selectionMode="single"
      >
        {FILTERS.map((option) => {
          const count = filterCount(option.id);
          return (
            <ToggleButton
              className="toggle-button--filter"
              id={option.id}
              key={option.id}
            >
              {option.label}
              {count != null ? ` · ${count}` : ''}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
}

export default function ProgrammingView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const filter = parseFilter(params.get('service'));
  const list = useInfiniteItems(useProgrammingQueueInfiniteQuery(filter));
  const groups = groupProgrammingItems(list.items, filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {groups.length === 0 && !list.isLoading ? (
        <EmptyState
          body="Clients appear here when a required service has never been programmed, has lapsed, or ends within the coverage window."
          icon={Dumbbell}
          title="Everyone's programmed"
        />
      ) : (
        groups.map((group) => (
          <section
            className="border-t border-separator first:border-t-0"
            key={group.id}
          >
            <div className="flex items-baseline justify-between gap-3 bg-surface-secondary px-4 py-2">
              <Typography
                type="body-xs"
                weight="semibold"
              >
                {group.label}
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {programmingGroupDescription(group.id)}
              </Typography>
            </div>
            <BrowseListBox
              ariaLabel={`${group.label} programming clients`}
              className="gap-0 p-0"
              emptyState={null}
              fetchNextPage={group.id === groups[groups.length - 1]?.id ? list.fetchNextPage : () => undefined}
              grid
              isError={list.isError}
              isLoading={list.isLoading}
              items={group.items}
              onRetry={list.refetch}
              renderItem={(item) => {
                const primary = presentProgrammingReason(item.reasons[0]!);
                const name = clientName(item);
                return (
                  <GridListItem
                    className={cn(
                      'list-box-item',
                      LIST_ITEM_CLASS,
                      'mt-0 flex flex-col items-stretch gap-3 py-3 hover:bg-surface-secondary sm:flex-row sm:items-center sm:px-4',
                    )}
                    id={item.client.id}
                    key={item.client.id}
                    onAction={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', item.client.id))}
                    textValue={name}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar
                        className="size-9 shrink-0"
                        size="md"
                      >
                        <Avatar.Fallback className="bg-warning-soft type-eyebrow font-semibold text-warning-text">
                          {getInitials(item.client.first_name, item.client.last_name) || '?'}
                        </Avatar.Fallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Label className="block truncate type-body font-semibold text-foreground">{name}</Label>
                        <Description className="mt-1 flex min-w-0 items-start gap-2 type-eyebrow text-muted">
                          <ServiceIcon service={item.reasons[0]!.service} />
                          <span className="min-w-0 flex-1 whitespace-normal sm:truncate">{primary.detail}</span>
                        </Description>
                      </div>
                      <ReasonChip reason={item.reasons[0]!} />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {item.reasons.map((reason) => {
                        const presented = presentProgrammingReason(reason);
                        return (
                          <Button
                            key={`${reason.code}-${reason.service}`}
                            onPress={() => navigate(assignPlanHref(item.client.id, reason.service))}
                            size="sm"
                            variant="outline"
                          >
                            {presented.action}
                          </Button>
                        );
                      })}
                    </div>
                  </GridListItem>
                );
              }}
              skeletonAvatar
            />
          </section>
        ))
      )}
    </div>
  );
}
