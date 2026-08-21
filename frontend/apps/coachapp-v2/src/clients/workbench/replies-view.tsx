import {getInitials} from '@easy/utils';
import {
  AlertDialog,
  Avatar,
  Button,
  Chip,
  Description,
  Label,
  Surface,
  Typography,
  toast,
  useOverlayState,
} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Check, Eye, MessageCircle, Send, UserX} from 'lucide-react';
import {useEffect, useState} from 'react';
import {GridListItem} from 'react-aria-components';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {ROUTES} from '@/@config/routes';
import {useInfiniteItems} from '@/@hooks/use-infinite-items';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {ApiError} from '@/api/client';
import {useMarkCoachConversationReadMutation, useMarkConversationHandledMutation} from '@/api/conversations';
import {useRepliesQueueInfiniteQuery, type WorkbenchRepliesQueueItem} from '@/api/workbench';
import {requirePrimaryReason} from '@/clients/lib/workbench-programming';
import {presentReplyReason, presentReplySequenceFacts} from '@/clients/lib/workbench-reason-presentation';

function conversationName(item: WorkbenchRepliesQueueItem): string {
  return item.conversation.client_name || 'Client';
}

function TaskActions({
  item,
  onHandle,
}: {
  item: WorkbenchRepliesQueueItem;
  onHandle: (item: WorkbenchRepliesQueueItem) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
      <Button
        onPress={() => navigate(ROUTES.CLIENT_MESSAGES.replace(':id', item.conversation.client_id))}
        variant="secondary"
      >
        <Send /> Reply
      </Button>
      <Button
        onPress={() => onHandle(item)}
        variant="primary"
      >
        <Check /> Mark handled
      </Button>
    </div>
  );
}

function ConversationMeta({inactive, read, waiting}: {inactive: boolean; read: boolean; waiting: string}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Chip
        color="accent"
        size="sm"
        variant="soft"
      >
        {waiting}
      </Chip>
      {read ? (
        <Chip
          size="sm"
          variant="soft"
        >
          <Eye /> Read
        </Chip>
      ) : (
        <Chip
          color="accent"
          size="sm"
          variant="primary"
        >
          Unread
        </Chip>
      )}
      {inactive ? (
        <Chip
          color="warning"
          size="sm"
          variant="soft"
        >
          <UserX /> Inactive client
        </Chip>
      ) : null}
    </span>
  );
}

function SelectedTaskContent({
  item,
  onHandle,
}: {
  item: WorkbenchRepliesQueueItem;
  onHandle: (item: WorkbenchRepliesQueueItem) => void;
}) {
  const waiting = presentReplyReason(requirePrimaryReason(item.reasons)).description;
  const read = item.conversation.unread_count === 0;
  const inactive = item.client_status === 'inactive';
  const facts = presentReplySequenceFacts({
    clientStatus: item.client_status,
    unreadCount: item.conversation.unread_count,
    waitingMessageCount: item.waiting_message_count,
  });
  const name = conversationName(item);

  return (
    <>
      <div className="flex min-h-60 flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="md">
              <Avatar.Fallback>{getInitials(...name.split(/\s+/)) || '?'}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0">
              <Typography
                className="truncate"
                type="h6"
              >
                {name}
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {facts.messageCountLabel}
              </Typography>
            </div>
          </div>
          <ConversationMeta
            inactive={inactive}
            read={read}
            waiting={waiting}
          />
        </div>

        <div className="flex flex-1 flex-col justify-end gap-2 rounded-panel bg-surface-secondary p-3">
          {item.conversation.last_message_preview ? (
            <Surface className="max-w-4/5 self-start rounded-card p-3">
              <Typography type="body-sm">{item.conversation.last_message_preview}</Typography>
            </Surface>
          ) : null}
        </div>
      </div>
      <TaskActions
        item={item}
        onHandle={onHandle}
      />
    </>
  );
}

export default function RepliesView() {
  const isDesktop = useIsDesktop();
  const list = useInfiniteItems(useRepliesQueueInfiniteQuery());
  const markRead = useMarkCoachConversationReadMutation();
  const markHandled = useMarkConversationHandledMutation();
  const confirm = useOverlayState();
  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [pending, setPending] = useState<null | WorkbenchRepliesQueueItem>(null);

  const items = list.items;
  const selected = items.find((item) => item.conversation.id === selectedId) ?? items[0];

  useEffect(() => {
    if (!selectedId && items[0]) {
      setSelectedId(items[0].conversation.id);
    } else if (selectedId && !items.some((item) => item.conversation.id === selectedId)) {
      setSelectedId(items[0]?.conversation.id ?? null);
    }
  }, [items, selectedId]);

  // Mark read once when the selected conversation changes — not on every unread refetch.
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection id is the intentional trigger
  useEffect(() => {
    if (!selected) {
      return;
    }
    if (selected.conversation.unread_count > 0) {
      markRead.mutate(selected.conversation.id);
    }
  }, [selected?.conversation.id]);

  const requestHandle = (item: WorkbenchRepliesQueueItem) => {
    setPending(item);
    confirm.open();
  };

  const confirmHandle = async () => {
    if (!pending) {
      return;
    }
    const expected = pending.conversation.last_message_at;
    if (!expected) {
      toastMutationError(new Error('missing last message'), "Couldn't mark handled");
      return;
    }
    const index = items.findIndex((item) => item.conversation.id === pending.conversation.id);
    const next = items[index + 1] ?? items[index - 1];

    try {
      await markHandled.mutateAsync({
        body: {expected_last_message_at: expected},
        id: pending.conversation.id,
      });
      toast.success('Marked handled — no message was sent', {timeout: 2000});
      confirm.close();
      setPending(null);
      setSelectedId(next?.conversation.id ?? null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.info('This conversation changed — refreshing the queue', {timeout: 2500});
        confirm.close();
        setPending(null);
        await list.refetch();
        return;
      }
      toastMutationError(error, "Couldn't mark handled");
    }
  };

  const select = (item: WorkbenchRepliesQueueItem) => setSelectedId(item.conversation.id);

  const queue = (
    <BrowseListBox
      ariaLabel="Conversations waiting on you"
      className="gap-0 p-0"
      emptyState={
        <EmptyState
          body="Reading never clears this queue. A reply or Mark handled drains it."
          icon={MessageCircle}
          title="Replies cleared"
        />
      }
      fetchNextPage={list.fetchNextPage}
      grid
      isError={list.isError}
      isLoading={list.isLoading || list.isFetchingNextPage}
      items={items}
      onRetry={list.refetch}
      renderItem={(item) => {
        const waiting = presentReplyReason(requirePrimaryReason(item.reasons)).description;
        const name = conversationName(item);
        const selectedRow = item.conversation.id === selected?.conversation.id;
        const facts = presentReplySequenceFacts({
          clientStatus: item.client_status,
          unreadCount: item.conversation.unread_count,
          waitingMessageCount: item.waiting_message_count,
        });
        const rowClassName = cn('list-box-item', LIST_ITEM_CLASS, 'mt-0 flex flex-col items-stretch gap-0 p-0');
        const buttonClassName = cn(
          'button--row grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center justify-stretch gap-3 rounded-none px-3 py-3 text-start',
          'active:transform-none! data-[pressed=true]:transform-none!',
          selectedRow ? 'bg-accent-soft hover:bg-accent-soft' : 'hover:bg-surface-secondary',
        );

        return (
          <GridListItem
            {...(selectedRow ? {'aria-current': 'true' as const} : {})}
            {...(rowClassName ? {className: rowClassName} : {})}
            id={item.conversation.id}
            key={item.conversation.id}
            textValue={name}
          >
            <Button
              aria-pressed={selectedRow}
              {...(buttonClassName ? {className: buttonClassName} : {})}
              onPress={() => select(item)}
              variant="ghost"
            >
              <span
                aria-hidden
                className="w-0.75 self-stretch rounded-pill bg-accent"
              />
              <Avatar
                className="size-9 shrink-0"
                size="md"
              >
                <Avatar.Fallback className="bg-accent-soft type-eyebrow font-semibold text-accent">
                  {getInitials(...name.split(/\s+/)) || '?'}
                </Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <Label
                  className={cn('truncate type-body font-semibold', selectedRow ? 'text-accent' : 'text-foreground')}
                >
                  {name}
                </Label>
                <Description className="truncate type-eyebrow text-muted">
                  {waiting} · {facts.rowFacts}
                </Description>
              </div>
            </Button>
            {selectedRow && !isDesktop ? (
              <div className="w-full border-t border-border">
                <SelectedTaskContent
                  item={item}
                  onHandle={requestHandle}
                />
              </div>
            ) : null}
          </GridListItem>
        );
      }}
      skeletonAvatar
    />
  );

  if (!selected) {
    return queue;
  }

  if (!isDesktop) {
    return (
      <>
        {queue}
        <HandleDialog
          confirm={confirm}
          isPending={markHandled.isPending}
          name={pending ? conversationName(pending) : ''}
          onConfirm={confirmHandle}
          onDismiss={() => {
            if (!markHandled.isPending) {
              confirm.close();
              setPending(null);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="border-r border-border">{queue}</div>
        <div className="min-w-0">
          <SelectedTaskContent
            item={selected}
            onHandle={requestHandle}
          />
        </div>
      </div>
      <HandleDialog
        confirm={confirm}
        isPending={markHandled.isPending}
        name={pending ? conversationName(pending) : ''}
        onConfirm={confirmHandle}
        onDismiss={() => {
          if (!markHandled.isPending) {
            confirm.close();
            setPending(null);
          }
        }}
      />
    </>
  );
}

function HandleDialog({
  confirm,
  isPending,
  name,
  onConfirm,
  onDismiss,
}: {
  confirm: {isOpen: boolean; setOpen: (open: boolean) => void};
  isPending: boolean;
  name: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <AlertDialog.Backdrop
      isDismissable={!isPending}
      isOpen={confirm.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss();
        } else {
          confirm.setOpen(true);
        }
      }}
      variant="transparent"
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>Mark handled without replying?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            No message will be sent to {name || 'this client'}. A later client message starts a new waiting sequence.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isPending}
              slot="close"
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              isPending={isPending}
              onPress={onConfirm}
              variant="primary"
            >
              Mark handled
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
