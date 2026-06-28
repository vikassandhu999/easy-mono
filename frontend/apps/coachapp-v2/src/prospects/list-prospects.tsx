import {Chip, Spinner, Tabs, Typography} from '@heroui/react';
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

function ProspectRow({prospect, onClick}: {prospect: Prospect; onClick: () => void}) {
  return (
    <button
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-hover"
      onClick={onClick}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <Typography
          truncate
          weight="medium"
        >
          {prospect.name}
        </Typography>
        <Typography
          color="muted"
          truncate
          type="body-xs"
        >
          {prospect.program?.name ?? 'General application'}
        </Typography>
      </div>
      <Chip
        color={PROSPECT_STATUS_CHIP[prospect.status]}
        size="sm"
        variant="soft"
      >
        {PROSPECT_STATUS_LABEL[prospect.status]}
      </Chip>
    </button>
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

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="w-full pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner color="accent" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
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
          ) : prospects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <Typography weight="medium">No prospects yet</Typography>
              <Typography
                color="muted"
                type="body-sm"
              >
                Publish your landing page and applications will show up here.
              </Typography>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              {prospects.map((prospect) => (
                <ProspectRow
                  key={prospect.id}
                  onClick={() => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', prospect.id))}
                  prospect={prospect}
                />
              ))}
            </div>
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
