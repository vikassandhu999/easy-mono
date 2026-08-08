import {formatTimeAgo} from '@easy/utils';
import {Avatar, Chip, Description, Label, ListBox} from '@heroui/react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseScreen from '@/@components/browse-screen';
import ListEmptyState from '@/@components/list-empty-state';
import {ROUTES} from '@/@config/routes';
import {
  PROSPECT_STATUS_CHIP,
  PROSPECT_STATUS_LABEL,
  type Prospect,
  type ProspectStatus,
  useProspectsInfiniteQuery,
} from '@/api/prospects';

type ProspectFilter = 'all' | ProspectStatus;

const FILTERS: {id: ProspectFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'new', label: 'New'},
  {id: 'reviewing', label: 'Reviewing'},
  {id: 'won', label: 'Won'},
  {id: 'lost', label: 'Lost'},
];

function ProspectListItem({prospect}: {prospect: Prospect}) {
  const initial = prospect.name.split(' ')[0]?.[0]?.toUpperCase() ?? '';
  const applied = prospect.inserted_at ? ` · Applied ${formatTimeAgo(prospect.inserted_at)}` : '';

  return (
    <ListBox.Item
      className="min-h-16 px-4 py-3 transition-colors hover:bg-surface-hover active:transform-none! data-[pressed=true]:transform-none! sm:px-8"
      id={prospect.id}
      textValue={prospect.name}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{prospect.name}</Label>
        <Description className="truncate">
          {prospect.program?.name ?? 'General application'}
          {applied}
        </Description>
      </div>
      <div className="ms-auto shrink-0">
        <Chip
          color={PROSPECT_STATUS_CHIP[prospect.status]}
          size="sm"
          variant="soft"
        >
          {PROSPECT_STATUS_LABEL[prospect.status]}
        </Chip>
      </div>
    </ListBox.Item>
  );
}

export default function ListProspects() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProspectFilter>('all');
  const {data, fetchNextPage, isError, isLoading, refetch} = useProspectsInfiniteQuery({
    status: filter === 'all' ? undefined : (filter as ProspectStatus),
  });

  const prospects = data?.pages.flatMap((page) => page.data) ?? [];
  const summary = data?.pages[0]?.summary;

  return (
    <BrowseScreen
      description="People who applied through your landing page."
      empty={
        <ListEmptyState
          emptyDescription="Publish your landing page and applications will show up here."
          hasFilter={filter !== 'all'}
          nounPlural="prospects"
        />
      }
      filters={{
        onSelect: setFilter,
        options: FILTERS.map((f) => ({
          ...f,
          count: f.id === 'all' ? undefined : summary?.[f.id],
        })),
        selected: filter,
      }}
      onOpen={(key) => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', String(key)))}
      query={{fetchNextPage, isError, isLoading, items: prospects, refetch}}
      row={(prospect) => <ProspectListItem prospect={prospect} />}
      rowHasThumb
      title="Prospects"
    />
  );
}
