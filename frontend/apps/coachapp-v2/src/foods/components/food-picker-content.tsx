import {SearchField, Spinner, Typography} from '@heroui/react';
import {Apple, ArrowRight, X} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';

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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          Add ingredient
        </Typography>
        <button
          aria-label="Close"
          className="text-muted transition-colors hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <SearchField
        aria-label="Search foods"
        autoFocus
        onChange={setSearch}
        value={search}
        variant="secondary"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search foods…" />
          {isFetching ? <Spinner size="sm" /> : <SearchField.ClearButton />}
        </SearchField.Group>
      </SearchField>

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
          <div className="flex flex-col gap-0.5">
            {foods.map((food) => {
              const cal = food.calories_per_100g;
              const pro = food.protein_g_per_100g;
              return (
                <button
                  className="group flex items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
                  key={food.id}
                  onClick={() => onSelect(food)}
                  type="button"
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
