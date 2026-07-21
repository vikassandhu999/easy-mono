import {Button, SearchField, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {
  BROWSE_LIST_FRAME_CLASS,
  BROWSE_LIST_SURFACE_CLASS,
  BROWSE_SEARCH_GROUP_CLASS,
  FILTER_PILL_CLASS,
  FilterCount,
  TOOLBAR_DIVIDER_CLASS,
} from '@/@components/browse-list-box';
import {ErrorState} from '@/@components/error-state';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useListFormTemplatesQuery} from '@/api/checkins';

import FormTemplateListItem from './form-template-list-item';

type StatusFilter = 'active' | 'all' | 'archived';

function matchesSearch(name: string, search: string): boolean {
  return name.toLowerCase().includes(search.trim().toLowerCase());
}

// Templates only: the review queue lives on the dashboard (its banner deep-links
// straight into review), and the purpose filter was cut with it — product
// decision 2026-07-21.
export default function ListCheckins() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListFormTemplatesQuery();
  const templates = data?.data ?? [];

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const deferredSearch = useDeferredValue(search);

  // The form-templates endpoint has no query params (see `listFormTemplates`
  // in `api/generated.ts`) — it always returns the full set, so search/status
  // filtering composes client-side, same as clients' "attention" tab.
  const counts = useMemo(
    () => ({
      active: templates.filter((template) => template.status === 'active').length,
      all: templates.length,
      archived: templates.filter((template) => template.status === 'archived').length,
    }),
    [templates],
  );

  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (template) => (status === 'all' || template.status === status) && matchesSearch(template.name, deferredSearch),
      ),
    [templates, status, deferredSearch],
  );

  const hasFilter = !!deferredSearch || status !== 'all';

  return (
    <Page>
      <Page.Header
        className="bg-surface pb-1 sm:bg-transparent sm:pb-2"
        size="content"
      >
        <Page.TitleGroup>
          <div className="min-w-0">
            <Page.Title>Forms</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Intake, check-in, and questionnaire forms for your clients
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            aria-label="Create form"
            className="min-h-11 min-w-11 rounded-control"
            onPress={() => navigate(ROUTES.CREATE_CHECKIN)}
            variant="primary"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create form</span>
          </Button>
        </Page.Actions>
      </Page.Header>

      <Page.Toolbar
        className="sticky top-0 z-10 mb-0 flex flex-col gap-3 border-b border-border bg-surface pt-2 pb-3 sm:mb-6 sm:flex-row sm:items-center sm:border-0 sm:bg-background"
        size="content"
      >
        <SearchField
          aria-label="Search forms"
          className="w-full min-w-0 sm:max-w-72 sm:flex-1"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group className={BROWSE_SEARCH_GROUP_CLASS}>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="min-h-11"
              placeholder="Search forms…"
            />
            <SearchField.ClearButton className="min-h-11 min-w-11" />
          </SearchField.Group>
        </SearchField>
        <div className="-mx-4 flex min-w-0 items-center gap-3 overflow-x-auto px-4 sm:mx-0 sm:flex-1 sm:px-0">
          <Separator
            className={TOOLBAR_DIVIDER_CLASS}
            orientation="vertical"
          />
          <ToggleButtonGroup
            aria-label="Filter forms by status"
            className="flex shrink-0 flex-nowrap gap-2"
            isDetached
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next) {
                setStatus(next as StatusFilter);
              }
            }}
            selectedKeys={[status]}
            selectionMode="single"
          >
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="all"
            >
              All{' '}
              <FilterCount
                count={counts.all}
                isSelected={status === 'all'}
              />
            </ToggleButton>
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="active"
            >
              Active{' '}
              <FilterCount
                count={counts.active}
                isSelected={status === 'active'}
              />
            </ToggleButton>
            <ToggleButton
              className={FILTER_PILL_CLASS}
              id="archived"
            >
              Archived{' '}
              <FilterCount
                count={counts.archived}
                isSelected={status === 'archived'}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </Page.Toolbar>

      <Page.Content bare>
        <Page.Frame
          className={BROWSE_LIST_FRAME_CLASS}
          size="content"
        >
          {isError ? (
            <ErrorState message="Couldn't load forms." />
          ) : (
            <div className={BROWSE_LIST_SURFACE_CLASS}>
              <BrowseListBox
                ariaLabel="Forms"
                className="p-0"
                emptyState={
                  <ListEmptyState
                    createLabel="Create form"
                    createRoute={ROUTES.CREATE_CHECKIN}
                    emptyDescription="Build intake and check-in forms for your clients."
                    hasFilter={hasFilter}
                    nounPlural="forms"
                  />
                }
                fetchNextPage={() => undefined}
                isError={isError}
                isLoading={isLoading}
                items={visibleTemplates}
                onAction={(key) => navigate(ROUTES.EDIT_CHECKIN.replace(':id', String(key)))}
                onRetry={refetch}
                renderItem={(template) => <FormTemplateListItem template={template} />}
              />
            </div>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
