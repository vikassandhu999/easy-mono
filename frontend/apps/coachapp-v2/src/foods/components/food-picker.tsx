import {Input, Spinner} from '@heroui/react';
import {Apple, Search} from 'lucide-react';
import {useRef, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {type Food, useListFoodsQuery} from '@/api/foods';

type FoodPickerProps = {
  /** Called when the user selects a food from the dropdown */
  onSelect: (food: Food) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** IDs of foods already selected (will be visually marked) */
  excludeIds?: string[];
};

/**
 * Inline food search + select component.
 *
 * Container decision: INLINE — single text input that opens keyboard,
 * results render as a dropdown list directly below.
 *
 * Reusable: lives in foods/components/ and takes a generic onSelect callback.
 */
export default function FoodPicker({
  onSelect,
  placeholder = 'Search foods to add...',
  excludeIds = [],
}: FoodPickerProps) {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedValue(search);
  const shouldQuery = debouncedSearch.length >= 1;

  const {data, isFetching} = useListFoodsQuery(shouldQuery ? {search: debouncedSearch, limit: 10} : undefined, {
    skip: !shouldQuery,
  });

  const foods = data?.data ?? [];
  const showDropdown = isFocused && search.length >= 1;

  const handleSelect = (food: Food) => {
    onSelect(food);
    setSearch('');
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only close if focus leaves the entire container (not just moving between input and list)
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
    }
  };

  return (
    <div
      className="relative"
      onBlur={handleBlur}
      ref={containerRef}
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"
          size={16}
        />
        <Input
          aria-label="Search foods"
          className="pl-9"
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          type="search"
          value={search}
        />
        {isFetching && (
          <Spinner
            className="absolute right-3 top-1/2 -translate-y-1/2"
            color="accent"
            size="sm"
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-divider bg-content1 shadow-lg">
          {foods.length === 0 && !isFetching && (
            <p className="p-3 text-center text-xs text-foreground-400">
              {debouncedSearch.length >= 1 ? 'No foods found' : 'Type to search...'}
            </p>
          )}
          {foods.map((food) => {
            const isExcluded = excludeIds.includes(food.id);
            return (
              <button
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  isExcluded ? 'cursor-default opacity-40' : 'cursor-pointer hover:bg-content2 active:bg-content2'
                }`}
                disabled={isExcluded}
                key={food.id}
                onMouseDown={(e) => {
                  // Prevent blur from firing before click
                  e.preventDefault();
                  if (!isExcluded) handleSelect(food);
                }}
                type="button"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-content2">
                  {food.image_url ? (
                    <img
                      alt={food.name}
                      className="size-8 rounded-lg object-cover"
                      src={food.image_url}
                    />
                  ) : (
                    <Apple
                      className="text-foreground-400"
                      size={16}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{food.name}</p>
                  {food.category && <p className="truncate text-xs text-foreground-400">{food.category}</p>}
                </div>
                {isExcluded && <span className="text-xs text-foreground-400">Added</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
