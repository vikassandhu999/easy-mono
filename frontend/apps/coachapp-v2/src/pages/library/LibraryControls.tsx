import {Button, Input} from '@heroui/react';
import {ArrowUpDown} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {ResourceType} from '@/pages/library/libraryData';

import {FILTER_TABS} from '@/pages/library/libraryData';

type LibraryControlsProps = {
  activeSortLabel: string;
  filterType: ResourceType;
  onFilterChange: (value: ResourceType) => void;
  onSearchCommit: (value: string) => void;
  onSortRotate: () => void;
  searchQuery: string;
};

export default function LibraryControls({
  activeSortLabel,
  filterType,
  onFilterChange,
  onSearchCommit,
  onSortRotate,
  searchQuery,
}: LibraryControlsProps) {
  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchRowRef = useRef<HTMLDivElement>(null);
  const sectionLabel = FILTER_TABS.find((t) => t.value === filterType)?.label ?? 'Resources';

  const handleSearchFocus = useCallback(() => {
    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    if (isMobile && searchRowRef.current) {
      searchRowRef.current.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, []);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== searchQuery) {
        onSearchCommit(searchInput.trim());
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [onSearchCommit, searchInput, searchQuery]);

  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-separator pb-3">
      <div className="scrollbar-hide flex min-w-0 items-center gap-2 overflow-x-auto p-1">
        {FILTER_TABS.map((tab) => (
          <Button
            className="min-h-11 shrink-0"
            key={tab.value}
            onPress={() => onFilterChange(tab.value)}
            size="md"
            variant={tab.value === filterType ? 'secondary' : 'ghost'}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4"
        ref={searchRowRef}
      >
        <Input
          aria-label={`Search ${sectionLabel.toLowerCase()}`}
          className="min-h-11 w-full sm:max-w-sm"
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={handleSearchFocus}
          placeholder={`Search ${sectionLabel.toLowerCase()}`}
          type="search"
          value={searchInput}
          variant="secondary"
        />

        <Button
          className="min-h-11 w-full justify-start gap-2 sm:w-auto sm:justify-center"
          onPress={onSortRotate}
          size="md"
          variant="outline"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort: {activeSortLabel}</span>
        </Button>
      </div>
    </div>
  );
}
