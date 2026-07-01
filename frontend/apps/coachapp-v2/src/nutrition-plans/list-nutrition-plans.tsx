import {Button, Chip, Description, Label, ListBox, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import type {NutritionPlan} from '@/api/generated';
import {useCoachNutritionPlansInfiniteQuery} from '@/api/nutrition-plans-list';

type NutritionPlanStatus = NutritionPlan['status'];

const STATUS_MAP: Record<NutritionPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function getNutritionPlanSubtitle(plan: NutritionPlan): string {
  // The list endpoint returns plan summaries WITHOUT meals, so summarise the
  // macro targets it does carry (omitting any that are unset), falling back to
  // the description, then a neutral label.
  const targets = [
    plan.target_calories != null ? `${plan.target_calories} kcal` : null,
    plan.target_protein_g != null ? `${plan.target_protein_g}g protein` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return targets || plan.description || 'No targets set';
}

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const list = useCoachNutritionPlansInfiniteQuery({search: deferredSearch});
  const {fetchNextPage, isError, isLoading, items, refetch} = useInfiniteItems(list);

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className="flex items-center">
          <Button
            aria-label="Back"
            onPress={goBack}
            size="md"
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
      <Page.Toolbar className={'sticky top-0 z-10 flex flex-col gap-3 border-b bg-surface pt-2 pb-3'}>
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
        <BrowseListBox
          ariaLabel="Nutrition plans"
          className="flex-1 gap-0"
          emptyState={
            <ListEmptyState
              createLabel="Create Nutrition Plan"
              createRoute={ROUTES.CREATE_NUTRITION_PLAN}
              emptyDescription="Create your first nutrition plan to get started."
              hasFilter={!!deferredSearch}
              nounPlural="nutrition plans"
            />
          }
          fetchNextPage={fetchNextPage}
          isError={isError}
          isLoading={isLoading}
          onRetry={refetch}
          items={items}
          onAction={(key) => navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', String(key)))}
          renderItem={(plan) => {
            const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;

            return (
              <ListBox.Item
                className={LIST_ITEM_CLASS}
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
        />
      </Page.Content>
    </Page>
  );
}
