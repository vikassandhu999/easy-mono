import {Button, Input, Spinner, Tabs, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, Search, UserPlus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import InfiniteList from '@/@components/infinite-list';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useInfiniteScroll} from '@/@hooks/use-infinite-scroll';
import {type Client, type ListClientsFilters, useClientsInfiniteQuery, useInviteClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import ClientCard from '@/clients/components/client-card';

const quickInviteSchema = z.object({
  contact: z.string().min(1, 'Email or phone is required'),
  name: z.string().min(1, 'Name is required'),
});

type QuickInviteFormValues = z.infer<typeof quickInviteSchema>;

function isEmail(value: string): boolean {
  return value.includes('@');
}

/**
 * Split a single name string into first_name and last_name.
 */
function splitName(name: string): {firstName: string; lastName?: string} {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return {firstName: trimmed};
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim() || undefined,
  };
}

/**
 * Quick-invite form — compact inline row for fast client onboarding.
 * Two fields (name + email/phone) + add button.
 */
function QuickInvite() {
  const [inviteClient, {isLoading}] = useInviteClientMutation();

  const {
    formState: {errors},
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<QuickInviteFormValues>({
    resolver: zodResolver(quickInviteSchema),
  });

  const onSubmit = async (data: QuickInviteFormValues) => {
    const {firstName, lastName} = splitName(data.name);
    const contactValue = data.contact.trim();
    const contactIsEmail = isEmail(contactValue);

    try {
      await inviteClient({
        email: contactIsEmail ? contactValue : undefined,
        first_name: firstName,
        last_name: lastName,
        phone: contactIsEmail ? undefined : contactValue,
      }).unwrap();
      toast.success(`${data.name} added`);
      reset();
    } catch (err) {
      applyFormErrors(err, 'Failed to invite client.', setError);
    }
  };

  return (
    <form
      className="mb-4 rounded-xl border border-divider bg-content1 p-3"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Client name"
            placeholder="Name"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Email or phone"
            placeholder="Email or phone"
            {...register('contact')}
          />
          {errors.contact && <p className="mt-1 text-xs text-danger">{errors.contact.message}</p>}
        </div>
        <Button
          isPending={isLoading}
          size="sm"
          type="submit"
        >
          {isLoading ? (
            <Spinner
              color="current"
              size="sm"
            />
          ) : (
            <UserPlus size={16} />
          )}
          Add
        </Button>
      </div>
      {errors.root && <p className="mt-2 text-xs text-danger">{errors.root.message}</p>}
    </form>
  );
}

const STATUS_TABS = [
  {id: 'all', label: 'All'},
  {id: 'active', label: 'Active'},
  {id: 'invited', label: 'Invited'},
  {id: 'inactive', label: 'Inactive'},
] as const;

export default function ListClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const debouncedSearch = useDebouncedValue(search);

  const queryArg: ListClientsFilters | undefined = useMemo(() => {
    const filters: ListClientsFilters = {};
    if (debouncedSearch) filters.search = debouncedSearch;
    if (statusFilter !== 'all') filters.status = statusFilter;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [debouncedSearch, statusFilter]);

  const {data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading} = useClientsInfiniteQuery(queryArg);

  // Flatten all pages into a single array
  const clients = useMemo<Client[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const {sentinelRef} = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const isFiltering = search.length > 0 || statusFilter !== 'all';

  return (
    <PageLayout
      action={
        <Button
          onPress={() => navigate(ROUTES.INVITE_CLIENT)}
          size="sm"
        >
          <Plus size={16} />
          Invite
        </Button>
      }
      title="Clients"
    >
      {/* Search + Filter */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"
            size={16}
          />
          <Input
            aria-label="Search clients"
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            type="search"
            value={search}
          />
        </div>

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

      {/* Quick-invite — visible on All and Invited tabs */}
      {(statusFilter === 'all' || statusFilter === 'invited') && <QuickInvite />}

      <InfiniteList
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            {isFiltering ? (
              <>
                <p className="text-sm font-medium text-foreground-500">No clients found</p>
                <p className="text-xs text-foreground-400">
                  Try adjusting your search or filter to find what you&apos;re looking for.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground-500">No clients yet</p>
                <p className="text-xs text-foreground-400">Invite your first client to get started.</p>
                <Button
                  className="mt-3"
                  onPress={() => navigate(ROUTES.INVITE_CLIENT)}
                  size="sm"
                >
                  <Plus size={16} />
                  Invite Client
                </Button>
              </>
            )}
          </div>
        }
        hasNextPage={hasNextPage}
        isError={isError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        items={clients}
        keyExtractor={(client) => client.id}
        renderItem={(client) => <ClientCard client={client} />}
        sentinelRef={sentinelRef}
      />
    </PageLayout>
  );
}
