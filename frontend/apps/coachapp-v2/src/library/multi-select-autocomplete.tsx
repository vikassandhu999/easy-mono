import type {Key} from '@heroui/react';

import {
  Autocomplete,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  Popover,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from '@heroui/react';
import {Filter} from 'lucide-react';
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

  const handleRemoveTags = (keys: Set<Key>) => {
    onChange(value.filter((id) => !keys.has(id)));
  };

  return (
    <Autocomplete
      {...(label ? {} : {'aria-label': `${placeholder} filter`})}
      // `autocomplete--filter` pins the trigger to the control height (theme
      // rule) and sizes it to its label; the form flavour fills its field row
      // and grows with its tag rows.
      className={collapseToCount ? 'autocomplete--filter' : 'w-full'}
      isInvalid={isInvalid}
      name={name}
      onChange={(keys) => onChange(normalizeSelectedKeys(keys))}
      placeholder={placeholder}
      selectionMode="multiple"
      value={value}
    >
      {label ? <Label>{label}</Label> : null}
      <Autocomplete.Trigger>
        {/* The design puts a funnel on the FILTER trigger (EX toolbar), not on the
            form-field flavour of this control. */}
        {collapseToCount ? <Filter className="size-4 shrink-0 text-muted" /> : null}
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}: AutocompleteValueRenderProps) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }

            // Toolbar filter: the label never changes, so the trigger stays one
            // line whatever is selected — the count says how much, and the
            // popover list below is where things get deselected.
            if (collapseToCount) {
              return (
                <span className="flex items-center gap-1.5 truncate">
                  <span className="truncate">{placeholder}</span>
                  <span className="shrink-0 rounded-pill bg-ink px-1.5 type-eyebrow font-semibold text-ink-foreground">
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
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      {/* Fixed width: the popover holds a search field + option rows, which the
          160px filter trigger cannot fit (the placeholder clipped). The theme's
          popover max-width keeps it on-screen at 375px. */}
      <Autocomplete.Popover
        className="w-60"
        placement="bottom start"
      >
        <Popover.Heading className="sr-only">{label ?? placeholder} options</Popover.Heading>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            aria-label={searchPlaceholder}
            autoFocus
            // Not sticky: the field is a sibling of the scrolling ListBox, so
            // it never leaves the viewport. The rule separates the two bands.
            className="border-b border-border pb-2"
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
