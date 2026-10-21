import {useEffect, useState} from 'react';
import {type Tracker, type TrackerTemplate, useTrackers, useTrackerTemplates} from '../api/trackers';
import {Button} from './button';
import {InfiniteList} from './infinite-list';
import {Input} from './input';

function usePickerSearch() {
  const [value, setValue] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);
  return {value, search, setValue};
}

export function TrackerPicker({onSelect}: {onSelect: (tracker: Tracker) => void}) {
  const search = usePickerSearch();
  const query = useTrackers({search: search.search, archived: false});
  return (
    <div className="space-y-4">
      <Input
        aria-label="Search Trackers"
        placeholder="Search Trackers"
        value={search.value}
        onChange={(event) => search.setValue(event.target.value)}
      />
      <InfiniteList
        query={query}
        label="Trackers"
        singular="Tracker"
        empty={<p>No Trackers match your search.</p>}
      >
        {(tracker) => (
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="break-words font-medium">{tracker.name}</p>
              <p className="text-sm text-muted-foreground">
                {tracker.kind.replace('_', '/')} {tracker.base_unit ?? ''}
              </p>
            </div>
            <Button
              variant="outline"
              aria-label={`Select ${tracker.name}`}
              onPress={() => onSelect(tracker)}
            >
              Select
            </Button>
          </div>
        )}
      </InfiniteList>
    </div>
  );
}

export function TrackerTemplatePicker({onSelect}: {onSelect: (template: TrackerTemplate) => void}) {
  const search = usePickerSearch();
  const query = useTrackerTemplates(search.search);
  return (
    <div className="space-y-4">
      <Input
        aria-label="Search Tracker templates"
        placeholder="Search templates"
        value={search.value}
        onChange={(event) => search.setValue(event.target.value)}
      />
      <InfiniteList
        query={query}
        label="Tracker templates"
        singular="Tracker template"
        empty={<p>No Tracker templates match your search.</p>}
      >
        {(template) => (
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="min-w-0 break-words font-medium">{template.name}</p>
            <Button
              variant="outline"
              aria-label={`Select ${template.name}`}
              onPress={() => onSelect(template)}
            >
              Select
            </Button>
          </div>
        )}
      </InfiniteList>
    </div>
  );
}
