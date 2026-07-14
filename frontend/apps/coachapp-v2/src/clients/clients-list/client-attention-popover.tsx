import type {Key} from '@heroui/react';
import {Avatar, Button, Collection, Description, Label, ListBox, Popover, Skeleton, Typography} from '@heroui/react';
import {ChevronRight, ClipboardCheck} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {type Client, useLazyListAttentionClientsQuery, useListAttentionClientsQuery} from '@/api/generated';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
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
  const {data, isError, isLoading} = useListAttentionClientsQuery({limit: PAGE_SIZE, offset: 0});
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

  if (isLoading) {
    return <Skeleton className="h-8 w-12 rounded-lg sm:w-36" />;
  }

  if (isError || !data || data.count === 0) {
    return null;
  }

  const list = (
    <ListBox
      aria-label="Client follow-ups"
      className={isDesktop ? 'max-h-64 overflow-y-auto p-0' : 'px-0'}
      onAction={openClient}
      selectionMode="none"
    >
      <Collection items={loadedClients}>
        {(client) => {
          const name = clientName(client);
          return (
            <ListBox.Item
              className={`${isDesktop ? 'min-h-12 px-2 py-1.5' : 'min-h-14 px-1 py-2'} rounded-lg transition-colors hover:bg-surface-hover active:scale-100! data-[pressed=true]:scale-100!`}
              id={client.id}
              textValue={name}
            >
              <div className="flex w-full min-w-0 items-center gap-2.5">
                <Avatar
                  className="shrink-0"
                  size="sm"
                >
                  <Avatar.Fallback>{clientInitials(client)}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Label className="block truncate text-sm font-semibold text-foreground">{name}</Label>
                  <Description className="block truncate text-xs text-muted">{attentionReason(client)}</Description>
                </div>
                <ChevronRight
                  className="shrink-0 text-muted"
                  size={16}
                  strokeWidth={2}
                />
              </div>
            </ListBox.Item>
          );
        }}
      </Collection>
    </ListBox>
  );

  const loadMoreButton = hasMore ? (
    <Button
      className="h-9 min-h-9 w-full text-xs text-muted"
      isPending={isLoadingMore}
      onPress={loadMore}
      size="sm"
      variant="ghost"
    >
      {loadMoreFailed ? 'Retry' : 'Load more'}
    </Button>
  ) : null;

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${data.count} client follow-ups`}
        className="items-center gap-2"
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="secondary"
      >
        <ClipboardCheck
          size={17}
          strokeWidth={2.2}
        />
        <span className="hidden sm:inline">{data.count} follow-ups</span>
        <span className="sm:hidden">{data.count}</span>
      </Button>

      {isDesktop ? (
        <Popover
          isOpen={open}
          onOpenChange={handleOpenChange}
        >
          <Popover.Content
            className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-2 shadow-lg"
            placement="bottom end"
            triggerRef={triggerRef}
          >
            <Popover.Dialog
              aria-label="Client follow-ups"
              className="outline-none"
            >
              <div className="flex items-center justify-between px-2 pt-1 pb-2">
                <Typography
                  type="body-sm"
                  weight="semibold"
                >
                  Follow-ups
                </Typography>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  {data.count} clients
                </Typography>
              </div>

              {list}
              {loadMoreButton}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      ) : (
        <KeyboardSheet
          footer={loadMoreButton ?? undefined}
          onClose={close}
          open={open}
          title="Client follow-ups"
        >
          <p className="pb-2 text-xs text-muted">Active clients waiting on you</p>
          {list}
        </KeyboardSheet>
      )}
    </>
  );
}
