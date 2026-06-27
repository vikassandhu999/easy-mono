import {Chip, Spinner, Typography} from '@heroui/react';
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

type Filter = 'all' | ProspectStatus;

const FILTERS: {id: Filter; label: string}[] = [
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
  const [filter, setFilter] = useState<Filter>('all');
  const {data, isError, isLoading, refetch} = useListProspectsQuery({
    limit: 100,
    status: filter === 'all' ? undefined : filter,
  });

  const prospects = data?.data ?? [];
  const summary = data?.summary;

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Prospects</Page.Title>
        </Page.TitleGroup>
        <Page.Description>People who applied through your landing page.</Page.Description>
      </Page.Header>

      <Page.Toolbar className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-2 md:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = f.id === 'all' ? undefined : summary?.[f.id as ProspectStatus];
            return (
              <button
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-segment text-segment-foreground' : 'text-muted hover:text-foreground'
                }`}
                key={f.id}
                onClick={() => setFilter(f.id)}
                type="button"
              >
                {f.label}
                {count ? <span className="ml-1 text-xs opacity-70">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </Page.Toolbar>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl pt-4">
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
