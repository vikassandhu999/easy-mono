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
      className="w-full"
      isInvalid={isInvalid}
      name={name}
      onChange={(keys) => onChange(normalizeSelectedKeys(keys))}
      placeholder={placeholder}
      selectionMode="multiple"
      value={value}
    >
      {label ? <Label>{label}</Label> : null}
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({defaultChildren, isPlaceholder, state}: AutocompleteValueRenderProps) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
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
