import {Avatar, Chip, Collection, Description, Label, ListBox, Spinner, Tabs, Typography} from '@heroui/react';
import type {Key} from '@heroui/react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

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

  return (
    <ListBox.Item
      className="min-h-fit px-4 py-3 transition-none! active:scale-100! data-[pressed=true]:scale-100! sm:px-8"
      id={prospect.id}
      textValue={prospect.name}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initial}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{prospect.name}</Label>
        <Description className="truncate">{prospect.program?.name ?? 'General application'}</Description>
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
      <Page.Header>
        <Page.TitleGroup>
          <Page.Title>Prospects</Page.Title>
          <Page.Description>People who applied through your landing page.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>

      <Page.Toolbar className="sticky top-0 z-10 flex flex-col gap-3 pt-2 pb-3 border-b bg-surface">
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
                    className="w-auto! h-6 whitespace-nowrap data-[selected=true]:bg-segment data-[selected=true]:text-segment-foreground data-[selected=true]:shadow-sm"
                    id={f.id}
                    key={f.id}
                  >
                    {f.label}{count ? ` (${count})` : ''}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </Page.Toolbar>

      <Page.Content>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
            <Typography
              color="muted"
              type="body-sm"
            >
              Couldn't load prospects.
            </Typography>
            <button
              className="text-sm text-accent"
              onClick={() => refetch()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : (
          <ListBox
            aria-label="Prospects"
            className="flex-1 gap-0"
            onAction={(key) => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', String(key)))}
            renderEmptyState={() => (
              <div className="flex flex-col items-center gap-2 px-4 py-20 text-center">
                <Typography weight="medium">No prospects yet</Typography>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Publish your landing page and applications will show up here.
                </Typography>
              </div>
            )}
            selectionMode="none"
          >
            <Collection items={prospects}>
              {(prospect) => <ProspectListItem prospect={prospect} />}
            </Collection>
          </ListBox>
        )}
      </Page.Content>
    </Page>
  );
}
