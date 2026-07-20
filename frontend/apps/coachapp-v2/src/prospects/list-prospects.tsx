import {formatTimeAgo} from '@easy/utils';
import type {Key} from '@heroui/react';
import {Avatar, Chip, Description, Label, ListBox, Tabs} from '@heroui/react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {
  PROSPECT_STATUS_CHIP,
  PROSPECT_STATUS_LABEL,
  type Prospect,
  type ProspectStatus,
  useListProspectsQuery,
} from '@/api/prospects';

const FILTERS: {id: string; label: string}[] = [
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
      className="min-h-16 px-4 py-3 transition-colors hover:bg-surface-hover active:scale-100! data-[pressed=true]:scale-100! sm:px-8"
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
  const [filter, setFilter] = useState<Key>('all');
  const {data, isError, isLoading, refetch} = useListProspectsQuery({
    limit: 100,
    status: filter === 'all' ? undefined : (filter as ProspectStatus),
  });

  const prospects = data?.data ?? [];
  const summary = data?.summary;

  return (
    <Page>
      <Page.Header size="list">
        <Page.TitleGroup>
          <Page.Title>Prospects</Page.Title>
          <Page.Description>People who applied through your landing page.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>

      <Page.Toolbar
        className="sticky top-0 z-10 flex flex-col gap-3 bg-background/95 pb-4 pt-2 backdrop-blur"
        size="list"
      >
        <Tabs
          aria-label="Filter prospects by status"
          className="min-w-0 flex-1"
          onSelectionChange={setFilter}
          selectedKey={filter}
        >
          <Tabs.ListContainer className="scrollbar-hide max-w-full overflow-x-auto">
            <Tabs.List className="w-max! min-w-max">
              {FILTERS.map((f) => {
                const count = f.id === 'all' ? undefined : summary?.[f.id as ProspectStatus];
                return (
                  <Tabs.Tab
                    className="min-h-11 w-auto! whitespace-nowrap data-[selected=true]:bg-segment data-[selected=true]:text-segment-foreground data-[selected=true]:shadow-sm"
                    id={f.id}
                    key={f.id}
                  >
                    {f.label}
                    {count !== undefined ? ` (${count})` : ''}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </Page.Toolbar>

      <Page.Content bare>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          <BrowseListBox
            ariaLabel="Prospects"
            className="flex-1 gap-0 overflow-hidden rounded-2xl border border-border bg-surface"
            emptyState={
              <ListEmptyState
                emptyDescription="Publish your landing page and applications will show up here."
                hasFilter={filter !== 'all'}
                nounPlural="prospects"
              />
            }
            // Flat query (limit: 100), no pagination — nothing to fetch.
            fetchNextPage={() => undefined}
            isError={isError}
            isLoading={isLoading}
            items={prospects}
            onAction={(key) => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', String(key)))}
            onRetry={refetch}
            renderItem={(prospect) => <ProspectListItem prospect={prospect} />}
            skeletonAvatar
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
