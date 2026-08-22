/**
 * "Add ingredient" button + its food-search picker — the canonical picker
 * anatomy (centered PickerModal via SearchPickerSheet): search · multi-select
 * rows · confirm dock, same as the nutrition builder's add-items flow.
 * Confirming appends every selected food as an ingredient (default amount);
 * amounts are edited inline in the ingredient list.
 */
import {Button, Chip} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Plus} from 'lucide-react';
import type {ComponentProps} from 'react';
import {useMemo, useState} from 'react';
import {type Food, useListFoodsQuery} from '@/api/nutrition-foods';
import {SearchPickerSheet} from '@/ui/search-picker-sheet';
import {useDebounce} from '@/ui/use-debounce';

interface Props {
  /** Batch: one callback with every confirmed food, so the caller appends them
   *  in a single state update (per-food calls would each see stale state). */
  onSelect: (foods: Food[]) => void;
  /** Foods already in the recipe — hidden from results. */
  excludeIds?: string[];
  triggerClassName?: string;
  triggerVariant?: ComponentProps<typeof Button>['variant'];
}

export default function FoodPickerControl({onSelect, excludeIds = [], triggerClassName, triggerVariant}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selected, setSelected] = useState<Map<string, Food>>(new Map());
  const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);

  const {data, isError, isFetching, refetch} = useListFoodsQuery(
    {limit: 20, ...(debouncedSearch ? {search: debouncedSearch} : {})},
    {enabled: open},
  );
  const foods = useMemo(() => (data?.data ?? []).filter((f) => !excludeIds.includes(f.id)), [data, excludeIds]);

  const close = () => {
    setOpen(false);
    setSearch('');
    setSelected(new Map());
  };

  const merged = cn(' ', triggerClassName);

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        {...(merged ? {className: merged} : {})}
        onPress={() => setOpen(true)}
        variant={triggerVariant ?? 'secondary'}
      >
        <Plus size={16} />
        Add ingredient
      </Button>

      <SearchPickerSheet<Food>
        confirmLabel={(count) => (count === 0 ? 'Add ingredients' : `Add ${count} ingredient${count === 1 ? '' : 's'}`)}
        itemKey={(food) => food.id}
        itemTextValue={(food) => food.name}
        items={foods}
        error={isError}
        loading={isFetching || search !== debouncedSearch}
        onClose={close}
        onConfirm={() => {
          onSelect([...selected.values()]);
          close();
        }}
        onSearchChange={setSearch}
        onRetry={refetch}
        onToggleItem={(food) => {
          setSelected((previous) => {
            const next = new Map(previous);
            if (!next.delete(food.id)) {
              next.set(food.id, food);
            }
            return next;
          });
        }}
        open={open}
        renderItem={(food) => (
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate type-body font-medium text-foreground">{food.name}</span>
              <span className="block truncate type-eyebrow text-muted">
                per 100g · {food.calories_per_100g ?? '—'} kcal
              </span>
            </span>
            <Chip
              className="shrink-0"
              color="accent"
              size="sm"
              variant="soft"
            >
              {food.protein_g_per_100g ?? 0}P
            </Chip>
          </span>
        )}
        search={search}
        selectedKeys={selectedKeys}
        title="Add ingredient"
      />
    </>
  );
}
