import type {Key} from '@heroui/react';
import {Avatar, Button, Collection, Description, Label, ListBox, Popover, Skeleton} from '@heroui/react';
import {ArrowRight, TriangleAlert} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {type Client, useLazyListAttentionClientsQuery, useListAttentionClientsQuery} from '@/api/generated';
import {clientInitials, clientName} from '@/dashboard/lib/client-format';

const PAGE_SIZE = 20;

function attentionReason(client: Client): string {
  if (client.intake_incomplete) {
    return 'Intake incomplete';
  }
  if (client.needs_plan) {
    return 'Needs plan';
  }
  return 'Expiring soon';
}

function uniqueClients(clients: Client[]): Client[] {
  const seen = new Set<string>();
  return clients.filter((client) => {
    if (seen.has(client.id)) {
      return false;
    }
    seen.add(client.id);
    return true;
  });
}

export default function ClientAttentionPopover() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [appendedClients, setAppendedClients] = useState<Client[]>([]);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const {data, isError, isLoading} = useListAttentionClientsQuery({limit: PAGE_SIZE, offset: 0}, {skip: !isDesktop});
  const [loadPage, {isFetching: isLoadingMore}] = useLazyListAttentionClientsQuery();
  const firstPageVersion = data ? `${data.count}:${data.data.map((client) => client.id).join(',')}` : null;

  useEffect(() => {
    if (firstPageVersion !== null) {
      setAppendedClients([]);
      setLoadMoreFailed(false);
    }
  }, [firstPageVersion]);

  const loadedClients = useMemo(
    () => uniqueClients([...(data?.data ?? []), ...appendedClients]),
    [appendedClients, data?.data],
  );
  const hasMore = loadedClients.length < (data?.count ?? 0);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
    } else {
      close();
    }
  }

  async function loadMore() {
    setLoadMoreFailed(false);
    try {
      const nextPage = await loadPage({limit: PAGE_SIZE, offset: loadedClients.length}, true).unwrap();
      setAppendedClients((current) => uniqueClients([...current, ...nextPage.data]));
    } catch {
      setLoadMoreFailed(true);
    }
  }

  function openClient(key: Key) {
    close();
    navigate(ROUTES.CLIENT_DETAIL.replace(':id', String(key)));
  }

  if (!isDesktop) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="hidden h-11 w-36 rounded-lg md:block" />;
  }

  if (isError || !data || data.count === 0) {
    return null;
  }

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="hidden min-h-11 items-center gap-2 text-danger md:flex"
        onPress={() => setOpen(true)}
        ref={triggerRef}
        variant="secondary"
      >
        <TriangleAlert
          size={17}
          strokeWidth={2.2}
        />
        {data.count} need attention
      </Button>

      <Popover
        isOpen={open}
        onOpenChange={handleOpenChange}
      >
        <Popover.Content
          className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface p-0 shadow-lg"
          placement="bottom end"
          triggerRef={triggerRef}
        >
          <Popover.Dialog
            aria-label="Clients needing attention"
            className="outline-none"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
                <TriangleAlert
                  size={17}
                  strokeWidth={2.2}
                />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
                <p className="mt-0.5 text-xs text-muted">Active clients waiting on you</p>
              </div>
            </div>

            <ListBox
              aria-label="Clients needing attention"
              className="max-h-72 overflow-y-auto p-1"
              onAction={openClient}
              selectionMode="none"
            >
              <Collection items={loadedClients}>
                {(client) => {
                  const name = clientName(client);
                  return (
                    <ListBox.Item
                      className="min-h-14 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover active:scale-100! data-[pressed=true]:scale-100!"
                      id={client.id}
                      textValue={name}
                    >
                      <div className="flex w-full min-w-0 items-center gap-3">
                        <Avatar
                          className="shrink-0"
                          size="sm"
                        >
                          <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <Label className="block truncate text-sm font-medium text-foreground">{name}</Label>
                          <Description className="block truncate text-xs text-muted">
                            {attentionReason(client)}
                          </Description>
                        </div>
                        <ArrowRight
                          className="shrink-0 text-muted"
                          size={15}
                          strokeWidth={2.2}
                        />
                      </div>
                    </ListBox.Item>
                  );
                }}
              </Collection>
            </ListBox>

            {hasMore ? (
              <div className="border-t border-border px-4 py-2.5">
                <Button
                  className="min-h-11 w-full"
                  isPending={isLoadingMore}
                  onPress={loadMore}
                  size="sm"
                  variant="primary"
                >
                  {loadMoreFailed ? 'Retry' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </>
  );
}
