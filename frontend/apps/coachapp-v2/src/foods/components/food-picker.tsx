import {SearchField, Spinner, Typography} from '@heroui/react';
import {Apple} from 'lucide-react';
import {useDeferredValue, useEffect, useMemo, useRef, useState} from 'react';

import type {Food} from '@/api/generated';
import {useListFoodsQuery} from '@/api/generated';

type FoodPickerProps = {
  onSelect: (food: Food) => void;
  placeholder?: string;
  excludeIds?: string[];
};

/**
 * Single-input food search: type → a results panel drops below the field, click
 * a row to add it. Replaces the old Autocomplete (which awkwardly showed two
 * stacked search fields). Result rows follow the app's list-row pattern.
 */
export default function FoodPicker({onSelect, placeholder = 'Search foods to add…', excludeIds = []}: FoodPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const shouldQuery = deferredSearch.trim().length >= 1;
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const {data, isFetching} = useListFoodsQuery({search: deferredSearch, limit: 10}, {skip: !shouldQuery});
  const foods = useMemo(() => (data?.data ?? []).filter((f) => !excludeIds.includes(f.id)), [data, excludeIds]);

  // Close the panel on an outside click.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleSelect = (food: Food) => {
    onSelect(food);
    setSearch('');
    setOpen(false);
  };

  return (
    <div
      className="relative"
      ref={wrapRef}
    >
      <SearchField
        aria-label="Search foods to add"
        onChange={(value) => {
          setSearch(value);
          setOpen(true);
        }}
        value={search}
        variant="secondary"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={placeholder} />
          {isFetching ? <Spinner size="sm" /> : <SearchField.ClearButton />}
        </SearchField.Group>
      </SearchField>

      {open && shouldQuery ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
          {foods.length === 0 ? (
            <Typography
              align="center"
              className="px-3 py-6"
              color="muted"
              type="body-sm"
            >
              {isFetching ? 'Searching…' : 'No foods found'}
            </Typography>
          ) : (
            foods.map((food) => {
              const cal = food.calories_per_100g;
              const pro = food.protein_g_per_100g;
              return (
                <button
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-hover"
                  key={food.id}
                  onClick={() => handleSelect(food)}
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
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
