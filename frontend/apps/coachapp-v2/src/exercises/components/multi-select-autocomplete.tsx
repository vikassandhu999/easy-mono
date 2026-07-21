import type {Key} from '@heroui/react';

import {
  Autocomplete,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ReactNode} from 'react';

export type MultiSelectOption = {
  id: string;
  name: string;
};

type AutocompleteValueRenderProps = {
  defaultChildren: ReactNode;
  isPlaceholder: boolean;
  state: {selectedItems: {key: Key}[]};
};

type MultiSelectAutocompleteProps = {
  // Filter mode: the trigger stays a fixed-width button showing `placeholder ·
  // N` instead of growing a chip per selection. Selections are added/removed in
  // the popover list. Use this anywhere the control lives in a horizontal
  // toolbar; leave it off (the default) for full-width form fields, where the
  // inline tags are the point.
  collapseToCount?: boolean;
  emptyMessage: string;
  errorMessage?: string;
  isInvalid?: boolean;
  items: MultiSelectOption[];
  label?: string;
  name: string;
  onChange: (ids: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  value: string[];
};

function normalizeSelectedKeys(keys: Key | Key[] | null): string[] {
  if (keys == null) {
    return [];
  }

  if (Array.isArray(keys)) {
    return keys.map(String);
  }

  return [String(keys)];
}

export default function MultiSelectAutocomplete({
  collapseToCount = false,
  emptyMessage,
  errorMessage,
  isInvalid = false,
  items,
  label,
  name,
  onChange,
  placeholder,
  searchPlaceholder,
  value,
}: MultiSelectAutocompleteProps) {
  const {contains} = useFilter({sensitivity: 'base'});
  const active = value.length > 0;

  const handleRemoveTags = (keys: Set<Key>) => {
    onChange(value.filter((id) => !keys.has(id)));
  };

  return (
    <Autocomplete
      className="w-full"
      isInvalid={isInvalid}
      name={name}
      onChange={(keys) => onChange(normalizeSelectedKeys(keys))}
      placeholder={placeholder}
      selectionMode="multiple"
      value={value}
    >
      {label ? <Label>{label}</Label> : null}
      <Autocomplete.Trigger
        className={cn('min-h-11', collapseToCount && active && 'border-ink font-medium text-foreground')}
      >
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}: AutocompleteValueRenderProps) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            // Toolbar filter: label + count badge, fixed width regardless of how
            // many are selected. Deselect happens in the popover list below.
            if (collapseToCount) {
              return (
                <span className="flex items-center gap-1.5 truncate">
                  <span className="truncate">{placeholder}</span>
                  <span className="shrink-0 rounded-full bg-ink px-1.5 text-xs font-semibold text-ink-foreground">
                    {state.selectedItems.length}
                  </span>
                </span>
              );
            }

            const selectedItemKeys = state.selectedItems.map((item) => item.key);

            return (
              // Cap the trigger chip area so many long selections can't grow it
              // unbounded and push the surrounding sticky toolbar around.
              <div className="max-h-16 overflow-y-auto">
                <TagGroup
                  onRemove={handleRemoveTags}
                  size="sm"
                  variant="surface"
                >
                  <TagGroup.List>
                    {selectedItemKeys.map((key) => {
                      const item = items.find((option) => option.id === String(key));

                      if (!item) {
                        return null;
                      }

                      return (
                        <Tag
                          className="[&_[data-slot=tag-remove-button]]:min-h-11 [&_[data-slot=tag-remove-button]]:min-w-11"
                          id={item.id}
                          key={item.id}
                          textValue={item.name}
                        >
                          {item.name}
                        </Tag>
                      );
                    })}
                  </TagGroup.List>
                </TagGroup>
              </div>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton className="min-h-11 min-w-11" />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            autoFocus
            className="sticky top-0 z-10"
            name={`${name}-search`}
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={searchPlaceholder} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-72 overflow-y-auto"
            renderEmptyState={() => <EmptyState>{emptyMessage}</EmptyState>}
          >
            {items.map((item) => (
              <ListBox.Item
                id={item.id}
                key={item.id}
                textValue={item.name}
              >
                {item.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </Autocomplete>
  );
}
