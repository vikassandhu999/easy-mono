import {Plus} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
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

  // The form-templates endpoint has no query params (see `useListFormTemplatesQuery`
  // in `api/checkins.ts`) — it always returns the full set, so search/status
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
    <BrowseScreen
      action={{icon: <Plus />, label: 'Create form', to: ROUTES.CREATE_CHECKIN}}
      backTo={ROUTES.LIBRARY}
      description="Intake and check-in forms for your clients"
      empty={
        <ListEmptyState
          createLabel="Create form"
          createRoute={ROUTES.CREATE_CHECKIN}
          emptyDescription="Build intake and check-in forms for your clients."
          hasFilter={hasFilter}
          nounPlural="forms"
        />
      }
      filters={{
        onSelect: setStatus,
        options: [
          {count: counts.all, id: 'all', label: 'All'},
          {count: counts.active, id: 'active', label: 'Active'},
          {count: counts.archived, id: 'archived', label: 'Archived'},
        ],
        selected: status,
      }}
      onOpen={(key) => navigate(ROUTES.CHECKIN_BUILDER.replace(':id', String(key)))}
      // The form-templates endpoint returns the full set in one call, so there
      // is no next page — BrowseScreen renders no load-more sentinel.
      query={{isError, isLoading, items: visibleTemplates, refetch}}
      row={(template) => <FormTemplateListItem template={template} />}
      search={{onChange: setSearch, placeholder: 'Search forms\u2026', value: search}}
      title="Forms"
    />
  );
}
