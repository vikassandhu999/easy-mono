/**
 * THROWAWAY PROTOTYPE — Replies handling.
 *
 * Three variants on the existing workbench route, switchable with
 * `?view=replies&variant=A|B|C`. All state is local: handling removes a
 * conversation, while the scenario controls demonstrate that reading does not
 * drain the queue and a later client message starts a new waiting sequence.
 */
import {getInitials} from '@easy/utils';
import {
  Alert,
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
import {Check, Eye, MessageCircle, RotateCcw, Send, UserX} from 'lucide-react';
import {useState} from 'react';
import {GridListItem} from 'react-aria-components';
import {useSearchParams} from 'react-router-dom';

import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {EmptyState} from '@/@components/empty-state';
import {QueueRow} from '@/clients/workbench/queue-row';
import {ViewShell} from '@/clients/workbench/view-shell';

import {PrototypeSwitcher} from './prototype-switcher';

type Conversation = {
  active: boolean;
  id: string;
  messageCount: number;
  name: string;
  preview: string;
  read: boolean;
  waiting: string;
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    active: true,
    id: 'maya-chen',
    messageCount: 3,
    name: 'Maya Chen',
    preview: 'One more thing — should I train tomorrow?',
    read: true,
    waiting: 'Waiting 2d',
  },
  {
    active: true,
    id: 'theo-grant',
    messageCount: 1,
    name: 'Theo Grant',
    preview: 'Thanks, that makes sense!',
    read: false,
    waiting: 'Waiting 5h',
  },
  {
    active: false,
    id: 'priya-shah',
    messageCount: 2,
    name: 'Priya Shah',
    preview: 'Can you still send me the recipe?',
    read: true,
    waiting: 'Waiting 4d',
  },
];

const VARIANTS = [
  {id: 'A', label: 'Direct queue action'},
  {id: 'B', label: 'Selected task pane'},
  {id: 'C', label: 'Conversation status banner'},
];

function ConversationMeta({conversation}: {conversation: Conversation}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Chip
        color="accent"
        size="sm"
        variant="soft"
      >
        {conversation.waiting}
      </Chip>
      {conversation.read ? (
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
      {!conversation.active ? (
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

function ConversationPreview({conversation}: {conversation: Conversation}) {
  return (
    <div className="flex min-h-60 flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="md">
            <Avatar.Fallback>{getInitials(...conversation.name.split(' '))}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <Typography
              className="truncate"
              type="h6"
            >
              {conversation.name}
            </Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              {conversation.messageCount} client messages in this waiting sequence
            </Typography>
          </div>
        </div>
        <ConversationMeta conversation={conversation} />
      </div>

      <div className="flex flex-1 flex-col justify-end gap-2 rounded-panel bg-surface-secondary p-3">
        <Surface className="max-w-4/5 self-start rounded-card p-3">
          <Typography type="body-sm">I finished the session. Felt good overall.</Typography>
        </Surface>
        {conversation.messageCount > 1 ? (
          <Surface className="max-w-4/5 self-start rounded-card p-3">
            <Typography type="body-sm">{conversation.preview}</Typography>
          </Surface>
        ) : null}
      </div>
    </div>
  );
}

function ScenarioToolbar({onFollowUp, onReset}: {onFollowUp: () => void; onReset: () => void}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Typography
        color="muted"
        type="body-xs"
      >
        Prototype state only — try handling Maya, then simulate another message.
      </Typography>
      <div className="flex flex-wrap gap-2">
        <Button
          onPress={onFollowUp}
          size="sm"
          variant="secondary"
        >
          <MessageCircle /> Simulate Maya message
        </Button>
        <Button
          aria-label="Reset prototype conversations"
          isIconOnly
          onPress={onReset}
          size="sm"
          variant="ghost"
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}

function Queue({
  conversations,
  directHandle,
  onHandle,
  onSelect,
  selectedId,
}: {
  conversations: Conversation[];
  directHandle: boolean;
  onHandle: (conversation: Conversation) => void;
  onSelect: (conversation: Conversation) => void;
  selectedId: string;
}) {
  return (
    <BrowseListBox
      ariaLabel="Prototype conversations waiting on you"
      className="gap-0 p-0"
      emptyState={
        <EmptyState
          body="Reading never clears this queue. A reply or Mark handled drains it."
          icon={Check}
          title="Replies cleared"
        />
      }
      fetchNextPage={() => undefined}
      grid
      isLoading={false}
      items={conversations.map((conversation) => ({
        ...conversation,
        selected: conversation.id === selectedId,
      }))}
      renderItem={(conversation) => (
        <QueueRow
          item={{
            action: directHandle ? 'Mark handled' : conversation.selected ? 'Selected' : 'Review',
            id: conversation.id,
            initials: getInitials(...conversation.name.split(' ')) || '?',
            name: conversation.name,
            onAction: () => (directHandle ? onHandle(conversation) : onSelect(conversation)),
            onOpen: () => onSelect(conversation),
            subtitle: `${conversation.waiting} · ${conversation.messageCount} message${conversation.messageCount === 1 ? '' : 's'} · ${conversation.read ? 'Read' : 'Unread'}${conversation.active ? '' : ' · Inactive'}`,
            tone: conversation.active ? 'accent' : 'warning',
          }}
          key={conversation.id}
        />
      )}
      skeletonAvatar
    />
  );
}

function ActionBar({
  conversation,
  emphasis,
  onHandle,
}: {
  conversation: Conversation;
  emphasis: 'handled' | 'reply';
  onHandle: (conversation: Conversation) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
      <Button
        onPress={() => toast.info(`Prototype: reply to ${conversation.name}`)}
        variant={emphasis === 'reply' ? 'primary' : 'secondary'}
      >
        <Send /> Reply
      </Button>
      <Button
        onPress={() => onHandle(conversation)}
        variant={emphasis === 'handled' ? 'primary' : 'outline'}
      >
        <Check /> Mark handled
      </Button>
    </div>
  );
}

function SelectedTaskContent({
  conversation,
  onHandle,
}: {
  conversation: Conversation;
  onHandle: (conversation: Conversation) => void;
}) {
  return (
    <>
      <ConversationPreview conversation={conversation} />
      <Alert
        className="mx-4 mb-4"
        color="accent"
        status="accent"
      >
        <Alert.Content>
          <Alert.Title>Waiting is separate from read state</Alert.Title>
          <Alert.Description>
            Opening this pane marked messages read. The task remains until you reply or explicitly handle it.
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <ActionBar
        conversation={conversation}
        emphasis="handled"
        onHandle={onHandle}
      />
    </>
  );
}

function SelectableQueue({
  conversations,
  inlineDetails = false,
  onHandle,
  onSelect,
  selectedId,
}: {
  conversations: Conversation[];
  inlineDetails?: boolean;
  onHandle: (conversation: Conversation) => void;
  onSelect: (conversation: Conversation) => void;
  selectedId: string;
}) {
  return (
    <BrowseListBox
      ariaLabel="Prototype selectable conversations waiting on you"
      className="gap-0 p-0"
      emptyState={
        <EmptyState
          body="Reading never clears this queue. A reply or Mark handled drains it."
          icon={Check}
          title="Replies cleared"
        />
      }
      fetchNextPage={() => undefined}
      grid
      isLoading={false}
      items={conversations.map((conversation) => ({
        ...conversation,
        selected: conversation.id === selectedId,
      }))}
      renderItem={(conversation) => {
        const selected = conversation.selected;
        return (
          <GridListItem
            aria-current={selected ? 'true' : undefined}
            className={cn(
              'list-box-item',
              LIST_ITEM_CLASS,
              'mt-0 flex flex-col items-stretch gap-0 p-0',
              selected && inlineDetails && 'hover:bg-surface',
            )}
            id={conversation.id}
            key={conversation.id}
            textValue={conversation.name}
          >
            <Button
              aria-pressed={selected}
              className={cn(
                'button--row grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center justify-stretch gap-3 rounded-none px-3 py-3 text-start',
                'active:transform-none! data-[pressed=true]:transform-none!',
                selected ? 'bg-accent-soft hover:bg-accent-soft' : 'hover:bg-surface-secondary',
              )}
              onPress={() => onSelect(conversation)}
              variant="ghost"
            >
              <span
                aria-hidden
                className={cn('w-0.75 self-stretch rounded-pill', conversation.active ? 'bg-accent' : 'bg-warning')}
              />
              <Avatar
                className="size-9 shrink-0"
                size="md"
              >
                <Avatar.Fallback>{getInitials(...conversation.name.split(' '))}</Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <Label className={cn('truncate type-body font-semibold', selected ? 'text-accent' : 'text-foreground')}>
                  {conversation.name}
                </Label>
                <Description className="truncate type-eyebrow text-muted">
                  {conversation.waiting} · {conversation.messageCount} message
                  {conversation.messageCount === 1 ? '' : 's'} · {conversation.read ? 'Read' : 'Unread'}
                  {conversation.active ? '' : ' · Inactive'}
                </Description>
              </div>
            </Button>
            {selected && inlineDetails ? (
              <div className="w-full border-t border-border">
                <SelectedTaskContent
                  conversation={conversation}
                  onHandle={onHandle}
                />
              </div>
            ) : null}
          </GridListItem>
        );
      }}
      skeletonAvatar
    />
  );
}

function DirectQueueVariant({
  conversations,
  onHandle,
  onSelect,
  selected,
}: {
  conversations: Conversation[];
  onHandle: (conversation: Conversation) => void;
  onSelect: (conversation: Conversation) => void;
  selected?: Conversation;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Surface className="overflow-hidden rounded-card border border-border">
        <Queue
          conversations={conversations}
          directHandle
          onHandle={onHandle}
          onSelect={onSelect}
          selectedId={selected?.id ?? ''}
        />
      </Surface>
      {selected ? (
        <Surface className="overflow-hidden rounded-card border border-border">
          <ConversationPreview conversation={selected} />
          <ActionBar
            conversation={selected}
            emphasis="handled"
            onHandle={onHandle}
          />
        </Surface>
      ) : null}
    </div>
  );
}

function FocusPaneVariant({
  conversations,
  onHandle,
  onSelect,
  selected,
}: {
  conversations: Conversation[];
  onHandle: (conversation: Conversation) => void;
  onSelect: (conversation: Conversation) => void;
  selected?: Conversation;
}) {
  return (
    <>
      <Surface className="overflow-hidden rounded-card border border-border lg:hidden">
        <SelectableQueue
          conversations={conversations}
          inlineDetails
          onHandle={onHandle}
          onSelect={onSelect}
          selectedId={selected?.id ?? ''}
        />
      </Surface>

      <Surface className="hidden overflow-hidden rounded-card border border-border lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="border-r border-border">
          <SelectableQueue
            conversations={conversations}
            onHandle={onHandle}
            onSelect={onSelect}
            selectedId={selected?.id ?? ''}
          />
        </div>
        {selected ? (
          <div className="min-w-0">
            <SelectedTaskContent
              conversation={selected}
              onHandle={onHandle}
            />
          </div>
        ) : null}
      </Surface>
    </>
  );
}

function StatusBannerVariant({
  conversations,
  onHandle,
  onSelect,
  selected,
}: {
  conversations: Conversation[];
  onHandle: (conversation: Conversation) => void;
  onSelect: (conversation: Conversation) => void;
  selected?: Conversation;
}) {
  if (!selected) {
    return (
      <Surface className="overflow-hidden rounded-card border border-border">
        <Queue
          conversations={conversations}
          directHandle={false}
          onHandle={onHandle}
          onSelect={onSelect}
          selectedId=""
        />
      </Surface>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Surface className="overflow-hidden rounded-card border border-border">
        <Alert
          color="warning"
          status="warning"
        >
          <Alert.Content>
            <Alert.Title>{selected.name} is waiting for a response</Alert.Title>
            <Alert.Description>
              {selected.waiting}. Reading does not finish this task; reply or mark it handled.
            </Alert.Description>
          </Alert.Content>
          <Button
            onPress={() => onHandle(selected)}
            size="sm"
            variant="outline"
          >
            <Check /> Mark handled
          </Button>
        </Alert>
        <ConversationPreview conversation={selected} />
        <ActionBar
          conversation={selected}
          emphasis="reply"
          onHandle={onHandle}
        />
      </Surface>
      <Surface className="overflow-hidden rounded-card border border-border">
        <div className="border-b border-border p-3">
          <Typography
            color="muted"
            type="body-xs"
            weight="semibold"
          >
            Replies queue preview · {conversations.length} waiting
          </Typography>
        </div>
        <Queue
          conversations={conversations}
          directHandle={false}
          onHandle={onHandle}
          onSelect={onSelect}
          selectedId={selected.id}
        />
      </Surface>
    </div>
  );
}

export default function RepliesHandlingPrototype() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState(INITIAL_CONVERSATIONS[0]?.id ?? '');
  const [pendingHandle, setPendingHandle] = useState<Conversation | null>(null);
  const confirm = useOverlayState();
  const variant = ['A', 'B', 'C'].includes(searchParams.get('variant') ?? '')
    ? (searchParams.get('variant') ?? 'A')
    : 'A';
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];

  const select = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setConversations((current) => current.map((item) => (item.id === conversation.id ? {...item, read: true} : item)));
  };

  const requestHandle = (conversation: Conversation) => {
    setPendingHandle(conversation);
    confirm.open();
  };

  const handle = () => {
    if (!pendingHandle) {
      return;
    }
    const handledName = pendingHandle.name;
    const remaining = conversations.filter((conversation) => conversation.id !== pendingHandle.id);
    setConversations(remaining);
    setSelectedId(remaining[0]?.id ?? '');
    setPendingHandle(null);
    confirm.close();
    toast.success(`${handledName} removed from Replies. No message was sent.`);
  };

  const simulateFollowUp = () => {
    const existingMaya = conversations.some((conversation) => conversation.id === 'maya-chen');
    toast.info(
      existingMaya
        ? "Maya's waiting clock stayed at its original time."
        : 'Maya returned to Replies with a new waiting clock.',
    );
    setConversations((current) => {
      const maya = current.find((conversation) => conversation.id === 'maya-chen');
      if (maya) {
        return current.map((conversation) =>
          conversation.id === maya.id
            ? {
                ...conversation,
                messageCount: conversation.messageCount + 1,
                preview: 'Following up — should I train tomorrow?',
                read: false,
              }
            : conversation,
        );
      }
      return [
        ...current,
        {
          active: true,
          id: 'maya-chen',
          messageCount: 1,
          name: 'Maya Chen',
          preview: 'New question after the earlier thread was handled.',
          read: false,
          waiting: 'Waiting just now',
        },
      ];
    });
    setSelectedId('maya-chen');
  };

  const reset = () => {
    setConversations(INITIAL_CONVERSATIONS);
    setSelectedId(INITIAL_CONVERSATIONS[0]?.id ?? '');
    setPendingHandle(null);
    confirm.close();
  };

  const changeVariant = (next: string) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set('view', 'replies');
      params.set('variant', next);
      return params;
    });
  };

  return (
    <>
      <ViewShell
        meta={`${conversations.length} conversation${conversations.length === 1 ? '' : 's'} waiting`}
        title="Replies · prototype"
        toolbar={
          <ScenarioToolbar
            onFollowUp={simulateFollowUp}
            onReset={reset}
          />
        }
      >
        {variant === 'A' ? (
          <DirectQueueVariant
            conversations={conversations}
            onHandle={requestHandle}
            onSelect={select}
            selected={selected}
          />
        ) : variant === 'B' ? (
          <FocusPaneVariant
            conversations={conversations}
            onHandle={requestHandle}
            onSelect={select}
            selected={selected}
          />
        ) : (
          <StatusBannerVariant
            conversations={conversations}
            onHandle={requestHandle}
            onSelect={select}
            selected={selected}
          />
        )}
      </ViewShell>

      <PrototypeSwitcher
        current={variant}
        onChange={changeVariant}
        variants={VARIANTS}
      />

      <AlertDialog.Backdrop
        isOpen={confirm.isOpen}
        onOpenChange={confirm.setOpen}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Mark this conversation handled?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                {pendingHandle?.name ?? 'This client'} will leave Replies without receiving a message. A later client
                message will start a new waiting sequence.
              </Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
              >
                Keep waiting
              </Button>
              <Button
                onPress={handle}
                variant="primary"
              >
                Mark handled
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
