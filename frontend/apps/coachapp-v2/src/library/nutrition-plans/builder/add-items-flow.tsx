import {Button} from '@heroui/react';
import {useCallback, useMemo, useRef, useState} from 'react';
import {
  useCoachFoodsInfiniteQuery,
  useCoachRecipesInfiniteQuery,
  useCreateCoachFoodMutation,
} from '@/api/nutrition-foods';
import {AmountSheetContent, type MealItemDraft} from '@/library/nutrition-plans/builder/amount-sheet';
import {type FoodOrRecipe, isRecipe, PickerItemRow} from '@/library/nutrition-plans/builder/picker-item-row';
import {toastMutationError} from '@/ui/mutation-toast';
import {PickerModal} from '@/ui/picker-modal';
import {type FilterChip, SearchPickerBody} from '@/ui/search-picker-sheet';
import {useDebounce} from '@/ui/use-debounce';

interface AddItemsFlowProps {
  mealName: string;
  open: boolean;
  onClose: () => void;
  /** The finished batch, in pick order, is added to the local menu. */
  onAdd: (items: {body: MealItemDraft; name: string | null}[]) => void;
}

/** The amounts phase renders as a form with this id; the dock submits it. */
const AMOUNT_FORM_ID = 'add-items-amount-form';

export function AddItemsFlow({mealName, open, onClose, onAdd}: AddItemsFlowProps) {
  // --- Phase: null = picking; an array = setting amounts for these items ---
  const [picked, setPicked] = useState<FoodOrRecipe[] | null>(null);
  const [index, setIndex] = useState(0);
  const [canConfirmAmount, setCanConfirmAmount] = useState(false);
  const drafts = useRef<MealItemDraft[]>([]);

  // --- Phase 1 state ---
  const [activeTab, setActiveTab] = useState<'foods' | 'recipes'>('foods');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  // One map, not a parallel Set and Map: the keys ARE the selection.
  const [selected, setSelected] = useState<Map<string, FoodOrRecipe>>(new Map());
  const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);

  const foodsQuery = useCoachFoodsInfiniteQuery(debouncedSearch ? {search: debouncedSearch} : undefined);
  const recipesQuery = useCoachRecipesInfiniteQuery(debouncedSearch ? {search: debouncedSearch} : undefined);
  const createFoodMutation = useCreateCoachFoodMutation();

  const foods = useMemo(() => foodsQuery.data?.pages.flatMap((page) => page.data) ?? [], [foodsQuery.data]);
  const recipes = useMemo(() => recipesQuery.data?.pages.flatMap((page) => page.data) ?? [], [recipesQuery.data]);

  const activeQuery = activeTab === 'foods' ? foodsQuery : recipesQuery;
  const items: FoodOrRecipe[] = activeTab === 'foods' ? foods : recipes;
  // Include the debounce window so typed-but-not-yet-queried search shows the
  // loading state instead of a flash of stale "no results".
  const loading = activeQuery.isFetching || search !== debouncedSearch;

  const filters: FilterChip[] = [
    {id: 'foods', label: 'Foods', active: activeTab === 'foods', onToggle: () => setActiveTab('foods')},
    {id: 'recipes', label: 'Recipes', active: activeTab === 'recipes', onToggle: () => setActiveTab('recipes')},
  ];

  const toggleItem = useCallback((item: FoodOrRecipe) => {
    setSelected((previous) => {
      const next = new Map(previous);
      if (!next.delete(item.id)) {
        next.set(item.id, item);
      }
      return next;
    });
  }, []);

  // In-flight guard — a double-tap on the create row must not POST twice.
  const creatingRef = useRef(false);
  const createFromSearch = useCallback(
    async (query: string) => {
      if (creatingRef.current) {
        return;
      }
      creatingRef.current = true;
      try {
        const {data: newFood} = await createFoodMutation.mutateAsync({name: query});
        setSelected((previous) => new Map(previous).set(newFood.id, newFood));
        setSearch('');
        setActiveTab('foods');
      } catch (error) {
        // Leave the search text so the coach can retry.
        toastMutationError(error, "Couldn't create food");
      } finally {
        creatingRef.current = false;
      }
    },
    [createFoodMutation],
  );

  const reset = useCallback(() => {
    setPicked(null);
    setIndex(0);
    drafts.current = [];
    setSelected(new Map());
    setSearch('');
    setActiveTab('foods');
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // --- Phase content -------------------------------------------------------

  const current = picked?.[index];
  const total = picked?.length ?? 0;

  const title = current ? `${current.name} — ${index + 1} of ${total}` : `Add to ${mealName}`;

  const body = current ? (
    <AmountSheetContent
      key={current.id}
      food={isRecipe(current) ? null : current}
      formId={AMOUNT_FORM_ID}
      onCanConfirmChange={setCanConfirmAmount}
      onCollect={(draft) => {
        drafts.current[index] = draft;
        if (index + 1 < total) {
          setIndex(index + 1);
        } else if (picked) {
          onAdd(drafts.current.map((body, position) => ({body, name: picked[position]?.name ?? null})));
          close();
        }
      }}
      recipe={isRecipe(current) ? current : null}
    />
  ) : (
    <SearchPickerBody<FoodOrRecipe>
      createLabel={(query) => `Create food "${query}"`}
      filters={filters}
      filtersLayout="segmented"
      hasMore={activeQuery.hasNextPage ?? false}
      itemKey={(item) => item.id}
      itemTextValue={(item) => item.name}
      items={items}
      error={activeQuery.isError}
      loading={loading}
      {...(activeTab === 'foods'
        ? {
            onCreateNoMatch: (query: string) => {
              createFromSearch(query).catch(() => undefined);
            },
          }
        : {})}
      onLoadMore={activeQuery.fetchNextPage}
      onRetry={activeQuery.refetch}
      onSearchChange={setSearch}
      onToggleItem={toggleItem}
      renderItem={(item, isSelected) => (
        <PickerItemRow
          isSelected={isSelected}
          item={item}
        />
      )}
      search={search}
      selectedKeys={selectedKeys}
      title={title}
    />
  );

  // One dock, both phases — the same primary button recipe as every picker dock.
  const dock = current ? (
    <Button
      className="w-full font-semibold"
      isDisabled={!canConfirmAmount}
      onPress={() => {
        const amountForm = document.getElementById(AMOUNT_FORM_ID);
        if (amountForm instanceof HTMLFormElement) {
          amountForm.requestSubmit();
        }
      }}
      variant="primary"
    >
      {index + 1 < total ? 'Next' : `Add ${total} item${total === 1 ? '' : 's'}`}
    </Button>
  ) : (
    <Button
      className="w-full font-semibold"
      isDisabled={selected.size === 0}
      onPress={() => {
        setPicked([...selected.values()]);
        setIndex(0);
        drafts.current = [];
      }}
      variant="primary"
    >
      {selected.size === 0 ? 'Select items' : `Set amounts — ${selected.size} item${selected.size === 1 ? '' : 's'}`}
    </Button>
  );

  return (
    <PickerModal
      // The amount step is content-sized; the pick step is the standard
      // fixed-height scroll body (PickerModal's default).
      {...(current ? {bodyClassName: 'px-4 pb-3'} : {})}
      footer={dock}
      onClose={close}
      open={open}
      title={title}
    >
      {body}
    </PickerModal>
  );
}
