import type {Key} from '@heroui/react';

import {Autocomplete, EmptyState, ListBox, SearchField, Tag, TagGroup, useFilter} from '@heroui/react';
import {useCallback} from 'react';

import {type Muscle, useListMusclesQuery} from '@/api/exercises';

type MusclePickerProps = {
  value: string[];
  onChange: (muscleIds: string[]) => void;
};

export default function MusclePicker({value, onChange}: MusclePickerProps) {
  const {data: musclesData} = useListMusclesQuery();
  const muscles = musclesData?.data ?? [];
  const {contains} = useFilter({sensitivity: 'base'});

  const onRemoveTag = useCallback(
    (keys: Set<Key>) => {
      onChange(value.filter((id) => !keys.has(id)));
    },
    [onChange, value],
  );

  if (muscles.length === 0) {
    return null;
  }

  return (
    <Autocomplete
      className="w-full sm:w-44"
      onChange={(keys) => onChange(keys as string[])}
      placeholder="Muscle groups"
      selectionMode="multiple"
      value={value}
    >
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {({
            defaultChildren,
            isPlaceholder,
            state,
          }: {
            defaultChildren: React.ReactNode;
            isPlaceholder: boolean;
            state: {selectedItems: {key: Key}[]};
          }) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }
            const selectedItemsKeys = state.selectedItems.map((item) => item.key);
            return (
              <TagGroup
                onRemove={onRemoveTag}
                size="sm"
              >
                <TagGroup.List>
                  {selectedItemsKeys.map((key) => {
                    const muscle = muscles.find((m: Muscle) => m.id === key);
                    if (!muscle) {
                      return null;
                    }
                    return (
                      <Tag
                        id={muscle.id}
                        key={muscle.id}
                      >
                        {muscle.name}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            name="muscle-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search muscles..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>No muscles found</EmptyState>}>
            {muscles.map((muscle) => (
              <ListBox.Item
                id={muscle.id}
                key={muscle.id}
                textValue={muscle.name}
              >
                {muscle.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
