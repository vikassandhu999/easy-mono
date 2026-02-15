import { Button, Input, Label, Skeleton } from "@heroui/react";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

type SelectorItem = {
  id: string;
  name: string;
};

type ExerciseTagSelectorProps = {
  emptyLabel: string;
  items: SelectorItem[];
  isLoading?: boolean;
  label: string;
  onChange: (ids: string[]) => void;
  searchPlaceholder: string;
  selectedIds: string[];
};

export default function ExerciseTagSelector({
  emptyLabel,
  items,
  isLoading = false,
  label,
  onChange,
  searchPlaceholder,
  selectedIds,
}: ExerciseTagSelectorProps) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(normalizedSearch),
      ),
    [items, normalizedSearch],
  );

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {selectedIds.length > 0 ? (
          <Button
            className="min-h-11"
            onPress={() => onChange([])}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </Button>
        ) : null}
      </div>

      <Input
        className="min-h-11"
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
        type="search"
        value={search}
        variant="secondary"
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton className="h-11 rounded-lg" key={item} />
          ))}
        </div>
      ) : null}

      {!isLoading && filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-3 text-sm text-muted">
          {emptyLabel}
        </div>
      ) : null}

      {!isLoading && filteredItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);

            return (
              <Button
                className="min-h-11"
                key={item.id}
                onPress={() => toggleSelection(item.id)}
                size="sm"
                type="button"
                variant={isSelected ? "secondary" : "outline"}
              >
                {item.name}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
