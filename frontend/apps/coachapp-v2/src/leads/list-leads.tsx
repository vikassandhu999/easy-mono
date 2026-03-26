import {Tabs} from '@heroui/react';
import {useMemo, useState} from 'react';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Lead, type LeadStatus, type ListLeadsFilters, useLeadsInfiniteQuery} from '@/api/leads';
import LeadCard from '@/leads/components/lead-card';

const STATUS_TABS = [
  {id: 'all', label: 'All'},
  {id: 'new', label: 'New'},
  {id: 'contacted', label: 'Contacted'},
  {id: 'converted', label: 'Converted'},
  {id: 'rejected', label: 'Rejected'},
] as const;

export default function ListLeads() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryArg: ListLeadsFilters | undefined = useMemo(() => {
    if (statusFilter === 'all') return undefined;
    return {status: statusFilter as LeadStatus};
  }, [statusFilter]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useLeadsInfiniteQuery(queryArg);

  const leads = useMemo<Lead[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const isFiltering = statusFilter !== 'all';

  return (
    <PageLayout
      description="Track and manage incoming leads"
      title="Leads"
    >
      {/* Status tabs */}
      <div className="mb-4">
        <Tabs
          defaultSelectedKey="all"
          onSelectionChange={(key) => setStatusFilter(String(key))}
          selectedKey={statusFilter}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Filter by status">
              {STATUS_TABS.map((tab) => (
                <Tabs.Tab
                  id={tab.id}
                  key={tab.id}
                >
                  {tab.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <InfiniteList
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            {isFiltering ? (
              <>
                <p className="text-sm font-medium text-foreground-500">No leads found</p>
                <p className="text-xs text-foreground-400">No leads with status &ldquo;{statusFilter}&rdquo;.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No leads yet</p>
                <p className="text-xs text-foreground-400">
                  Leads will appear here when people submit your storefront intake form.
                </p>
              </>
            )}
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={leads}
        keyExtractor={(lead) => lead.id}
        renderItem={(lead) => <LeadCard lead={lead} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
