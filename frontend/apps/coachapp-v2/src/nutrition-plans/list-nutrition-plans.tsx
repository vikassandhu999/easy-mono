import type {Key} from '@heroui/react';
import {
  Button,
  Chip,
  Collection,
  Description,
  Label,
  ListBox,
  ListBoxLoadMoreItem,
  SearchField,
  Spinner,
  Typography,
} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useGoBack} from '@/@hooks/use-go-back';
import {type NutritionPlan, type NutritionPlanStatus, useNutritionPlansInfiniteQuery} from '@/api/nutritionPlans';

const STATUS_MAP: Record<NutritionPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function getNutritionPlanSubtitle(plan: NutritionPlan): string {
  const mealCount = plan.meals?.length ?? 0;

  if (mealCount > 0) {
    return `${mealCount} meal${mealCount !== 1 ? 's' : ''}`;
  }
  return plan.description || 'No meals yet';
}

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);
  const list = useNutritionPlansInfiniteQuery({search: debouncedSearch});
  const plans = useMemo<NutritionPlan[]>(() => list.data?.pages.flatMap((page) => page.data) ?? [], [list.data]);

  const openPlan = (key: Key) => {
    navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', String(key)));
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className="flex items-center">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
            isIconOnly
            className={'lg:hidden'}
          >
            <ArrowLeft size={18} />
          </Button>
          <Page.Title>Nutrition Plans</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 border-b'}>
        <SearchField
          aria-label="Search nutrition plans"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
          variant={'secondary'}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search nutrition plans..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Page.Toolbar>
      <Page.Content>
        <ListBox
          aria-label="Nutrition plans"
          className="flex-1 gap-0"
          onAction={openPlan}
          renderEmptyState={() => (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              {debouncedSearch ? (
                <>
                  <Typography type="h5">No nutrition plans found</Typography>
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    Try adjusting your search to find what you&apos;re looking for.
                  </Typography>
                </>
              ) : (
                <>
                  <Typography type="h5">No nutrition plans yet</Typography>
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    Create your first nutrition plan to get started.
                  </Typography>
                  <Button
                    className="mt-3"
                    onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
                    size="sm"
                  >
                    <Plus size={16} />
                    Create Nutrition Plan
                  </Button>
                </>
              )}
            </div>
          )}
          selectionMode="none"
        >
          <Collection items={plans}>
            {(plan: NutritionPlan) => {
              const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;

              return (
                <ListBox.Item
                  className="min-h-fit px-4 py-2 !transition-none active:!scale-100 data-[pressed=true]:!scale-100 sm:px-8"
                  id={plan.id}
                  textValue={plan.name}
                >
                  <div className="flex min-w-0 flex-col">
                    <Label className="truncate">{plan.name}</Label>
                    <Description className="truncate">{getNutritionPlanSubtitle(plan)}</Description>
                  </div>

                  <div className="ms-auto hidden shrink-0 gap-1.5 sm:flex">
                    <Chip
                      color={status.color}
                      size="sm"
                      variant="soft"
                    >
                      {status.label}
                    </Chip>
                  </div>
                </ListBox.Item>
              );
            }}
          </Collection>
          <ListBoxLoadMoreItem
            isLoading={list.isLoading}
            onLoadMore={list.fetchNextPage}
          >
            <div className="flex items-center justify-center gap-2 py-2">
              <Spinner size="sm" />
              <Typography
                color="muted"
                type="body-sm"
              >
                Loading more...
              </Typography>
            </div>
          </ListBoxLoadMoreItem>
        </ListBox>
      </Page.Content>
    </Page>
  );
}
