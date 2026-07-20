import {Button, SearchField, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useListNutritionPlansQuery} from '@/api/generated';
import {useCoachNutritionPlansInfiniteQuery} from '@/api/nutrition-plans-list';

import NutritionPlanListItem from './nutrition-plan-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

// HeroUI ToggleButton exposes selection as `data-selected="true"` (see
// @heroui/styles toggle-button.css), not a `selected:` Tailwind variant —
// there's no such variant registered in this project, so `selected:*`
// classes silently no-op. Target the data attribute directly.
const STATUS_PILL_CLASS =
  'rounded-control border border-border bg-surface px-3.5 py-2 text-pill font-medium text-muted ' +
  'data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:font-semibold ' +
  'data-[selected=true]:text-ink-foreground';

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachNutritionPlansInfiniteQuery({
    search: deferredSearch,
    status: status === 'all' ? undefined : status,
  });
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  // Lightweight counts for the status tabs — `count` on the list endpoint is
  // the total matching the filter regardless of `limit`, so `limit: 1` is
  // enough to read it back.
  const {data: allData} = useListNutritionPlansQuery({limit: 1});
  const {data: activeData} = useListNutritionPlansQuery({limit: 1, status: 'active'});
  const {data: archivedData} = useListNutritionPlansQuery({limit: 1, status: 'archived'});

  return (
    <Page className="bg-background">
      <Page.Header size="list">
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton
            className={'lg:hidden'}
            onPress={goBack}
          />
          <div className="min-w-0">
            <Page.Title>Nutrition plans</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Reusable daily macro targets and meal structures for your clients
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create plan"
            onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create plan</span>
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={'sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-background pt-2 pb-3'}
        size="list"
      >
        <SearchField
          aria-label="Search nutrition plans"
          className="w-full min-w-0 sm:max-w-72 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search nutrition plans…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Separator
          className="hidden h-6 sm:block"
          orientation="vertical"
        />
        <div className="shrink-0">
          <ToggleButtonGroup
            aria-label="Filter plans by status"
            className="flex flex-nowrap gap-2"
            isDetached
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next) {
                setStatus(next as StatusFilter);
              }
            }}
            selectedKeys={[status]}
            selectionMode="single"
          >
            <ToggleButton
              className={STATUS_PILL_CLASS}
              id="all"
            >
              All <span className="text-chip opacity-70">{allData?.count ?? 0}</span>
            </ToggleButton>
            <ToggleButton
              className={STATUS_PILL_CLASS}
              id="active"
            >
              Active <span className="text-chip opacity-70">{activeData?.count ?? 0}</span>
            </ToggleButton>
            <ToggleButton
              className={STATUS_PILL_CLASS}
              id="archived"
            >
              Archived <span className="text-chip opacity-70">{archivedData?.count ?? 0}</span>
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </Page.Toolbar>
      <Page.Content>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <BrowseListBox
              ariaLabel="Nutrition plans"
              className="flex-1 p-0"
              emptyState={
                <ListEmptyState
                  createLabel="Create Nutrition Plan"
                  createRoute={ROUTES.CREATE_NUTRITION_PLAN}
                  emptyDescription="Create your first nutrition plan to get started."
                  hasFilter={!!deferredSearch || status !== 'all'}
                  nounPlural="nutrition plans"
                />
              }
              fetchNextPage={fetchNextPage}
              isError={isError}
              isLoading={isLoading}
              onRetry={refetch}
              items={items}
              onAction={(key) => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', String(key)))}
              renderItem={(plan) => <NutritionPlanListItem plan={plan} />}
            />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
