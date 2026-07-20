import {Button, ListBox, SearchField, Spinner, Typography} from '@heroui/react';
import {Apple, ArrowRight, X} from 'lucide-react';
import {type KeyboardEvent, useDeferredValue, useMemo, useState} from 'react';

import type {Food} from '@/api/generated';
import {useListFoodsQuery} from '@/api/generated';

interface Props {
  onSelect: (food: Food) => void;
  onClose: () => void;
  excludeIds?: string[];
}

/**
 * Body of the food picker — search + result rows. Rendered inside an anchored
 * Popover (desktop) or KeyboardSheet (mobile) by FoodPickerControl, mirroring
 * the nutrition/training PlanAssignContent pattern. Selecting a food adds it and
 * keeps the surface open so the coach can add several ingredients in a row
 * (already-added foods drop out of the results via excludeIds).
 */
export default function FoodPickerContent({onSelect, onClose, excludeIds = []}: Props) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const shouldQuery = deferredSearch.trim().length >= 1;

  const {data, isFetching} = useListFoodsQuery({search: deferredSearch, limit: 20}, {skip: !shouldQuery});
  const foods = useMemo(() => (data?.data ?? []).filter((f) => !excludeIds.includes(f.id)), [data, excludeIds]);

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Reset the highlight to the top whenever the query changes (new result set).
  const onSearchChange = (value: string) => {
    setSearch(value);
    setHighlightedIndex(0);
  };

  const select = (food: Food) => {
    onSelect(food);
    // Clear the search so the batch-add flow doesn't strand the coach on an
    // empty filtered result set after the chosen food drops out via excludeIds.
    onSearchChange('');
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (foods.length === 0) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, foods.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const food = foods[highlightedIndex] ?? foods[0];
      if (food) {
        select(food);
      }
    }
  };

  return (
    <div>
      {/* Search + close pinned so the field stays reachable while results scroll. */}
      <div className="sticky top-0 z-10 bg-surface pb-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Typography
            type="body-sm"
            weight="semibold"
          >
            Add ingredient
          </Typography>
          <Button
            aria-label="Close"
            className="-mr-1.5 flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent  "
            isIconOnly
            onPress={onClose}
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </div>

        <SearchField
          aria-label="Search foods"
          autoFocus
          onChange={onSearchChange}
          value={search}
          variant="secondary"
        >
          <SearchField.Group className="min-h-11 border border-border bg-surface shadow-none ">
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11 "
              onKeyDown={onInputKeyDown}
              placeholder="Search foods…"
            />
            {isFetching ? <Spinner size="sm" /> : <SearchField.ClearButton className="min-h-11 min-w-11  " />}
          </SearchField.Group>
        </SearchField>
      </div>

      <div className="mt-2 max-h-72 overflow-y-auto">
        {!shouldQuery ? (
          <Typography
            align="center"
            className="py-8"
            color="muted"
            type="body-sm"
          >
            Type to search foods
          </Typography>
        ) : foods.length === 0 ? (
          <Typography
            align="center"
            className="py-8"
            color="muted"
            type="body-sm"
          >
            {isFetching ? 'Searching…' : 'No foods found'}
          </Typography>
        ) : (
          <ListBox
            aria-label="Search results"
            className="flex flex-col gap-0.5"
            onAction={(key) => {
              const food = foods.find((item) => item.id === String(key));
              if (food) {
                select(food);
              }
            }}
            selectionMode="none"
          >
            {foods.map((food, index) => {
              const cal = food.calories_per_100g;
              const pro = food.protein_g_per_100g;
              const isHighlighted = index === highlightedIndex;
              return (
                <ListBox.Item
                  className={`group flex h-auto min-h-11 items-center justify-start gap-3 rounded-lg p-2 text-left font-normal hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                    isHighlighted ? 'bg-surface-hover' : ''
                  }`}
                  id={food.id}
                  key={food.id}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  textValue={food.name}
                >
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-secondary">
                    {food.image_url ? (
                      <img
                        alt={food.name}
                        className="size-8 object-cover"
                        src={food.image_url}
                      />
                    ) : (
                      <Apple
                        className="text-muted"
                        size={15}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Typography
                      truncate
                      type="body-sm"
                      weight="medium"
                    >
                      {food.name}
                    </Typography>
                    {food.category ? (
                      <Typography
                        color="muted"
                        truncate
                        type="body-xs"
                      >
                        {food.category}
                      </Typography>
                    ) : null}
                  </span>
                  {(cal != null && cal > 0) || (pro != null && pro > 0) ? (
                    <span className="shrink-0 text-right">
                      {cal != null && cal > 0 ? (
                        <Typography
                          color="muted"
                          type="body-xs"
                        >
                          {Math.round(cal)} kcal
                        </Typography>
                      ) : null}
                      {pro != null && pro > 0 ? (
                        <Typography
                          color="muted"
                          type="body-xs"
                        >
                          {pro}g protein
                        </Typography>
                      ) : null}
                    </span>
                  ) : null}
                  <ArrowRight
                    className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    size={16}
                  />
                </ListBox.Item>
              );
            })}
          </ListBox>
        )}
      </div>
    </div>
  );
}
