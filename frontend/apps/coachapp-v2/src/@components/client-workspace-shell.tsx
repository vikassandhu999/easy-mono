import {formatIsoDateShort, getInitials} from '@easy/utils';
import {Avatar, Button, Dropdown, Label, Skeleton, toast} from '@heroui/react';
import {
  ChevronLeft,
  CircleUserRound,
  ClipboardCheck,
  Dumbbell,
  LineChart,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Utensils,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type Client, useUpdateClientMutation} from '@/api/clients';
import {getApiErrorMessage} from '@/api/shared';
import {getClientName} from '@/clients/lib/client';
import {formatStatusLabel} from '@/clients/lib/client-detail-metrics';
import {
  CLIENT_WORKSPACE_TABS,
  type ClientWorkspaceTab,
  clientWorkspaceTabPath,
  getClientWorkspaceTab,
} from '@/clients/lib/client-workspace';

const TAB_ICON: Record<ClientWorkspaceTab, ReactNode> = {
  progress: <LineChart size={18} />,
  nutrition: <Utensils size={18} />,
  training: <Dumbbell size={18} />,
  'check-in': <ClipboardCheck size={18} />,
  detail: <CircleUserRound size={18} />,
};

function clientStatus(client: Client): string {
  if (client.status === 'active') {
    return `Active · since ${formatIsoDateShort(client.inserted_at)}`;
  }
  if (client.status === 'pending') {
    return 'Invitation pending';
  }
  return client.inactive_reason ? formatStatusLabel(client.inactive_reason) : 'Inactive';
}

function WorkspaceLink({
  active,
  children,
  replace = true,
  to,
}: {
  active: boolean;
  children: ReactNode;
  replace?: boolean;
  to: string;
}) {
  return (
    <Link
      className={`flex items-center gap-[11px] rounded-[12px] px-3 py-[11px] text-[13.5px] leading-5 font-semibold transition-colors ${
        active
          ? '[background-color:var(--link-soft)] text-link'
          : '[color:var(--foreground-secondary)] hover:bg-surface-hover hover:text-foreground'
      }`}
      replace={replace}
      to={to}
    >
      {children}
    </Link>
  );
}

export default function ClientWorkspaceShell({children, client}: {children: ReactNode; client: Client}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const activeTab = getClientWorkspaceTab(searchParams);
  const name = getClientName(client);
  const initials = getInitials(client.first_name, client.last_name);
  const chatPath = ROUTES.CLIENT_MESSAGES.replace(':id', client.id);
  const detailPath = ROUTES.CLIENT_DETAIL.replace(':id', client.id);
  const inChat = location.pathname === chatPath;
  const handleBack = () => (inChat ? navigate(detailPath, {replace: true}) : goBack());
  const status = clientStatus(client);
  const [updateClient, {isLoading: isStatusUpdating}] = useUpdateClientMutation();

  const toggleClientStatus = async () => {
    const nextStatus = client.status === 'active' ? 'inactive' : 'active';
    try {
      await updateClient({body: {status: nextStatus}, id: client.id}).unwrap();
      toast.success(nextStatus === 'active' ? 'Client reactivated' : 'Client deactivated');
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Client status wasn't changed. Try again."));
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full bg-surface">
      <aside className="hidden w-[274px] shrink-0 flex-col border-r border-separator bg-surface lg:flex">
        <div className="border-b border-separator px-4 pt-4 pb-3.5">
          <div className="mb-[14px] flex min-h-[30px] items-center justify-between gap-2">
            <Link
              className="inline-flex items-center gap-[5px] text-xs font-bold text-link transition-opacity hover:opacity-70"
              to={ROUTES.CLIENTS}
            >
              <ChevronLeft size={13} />
              All clients
            </Link>
            {client.status !== 'pending' ? (
              <Dropdown>
                <Button
                  aria-label="Client actions"
                  className="size-[30px] min-w-[30px] rounded-[9px] text-muted"
                  isIconOnly
                  isPending={isStatusUpdating}
                  size="sm"
                  variant="ghost"
                >
                  <MoreHorizontal size={17} />
                </Button>
                <Dropdown.Popover className="w-[212px] rounded-[14px] border-[1.5px] border-separator bg-surface p-1.5 shadow-xl">
                  <Dropdown.Menu
                    onAction={() => {
                      toggleClientStatus();
                    }}
                  >
                    <Dropdown.Item
                      id="toggle-client-status"
                      isDisabled={isStatusUpdating}
                      textValue={client.status === 'active' ? 'Deactivate client' : 'Reactivate client'}
                    >
                      {client.status === 'active' ? (
                        <Pause className="size-4 text-warning-soft-foreground" />
                      ) : (
                        <Play className="size-4 text-success-soft-foreground" />
                      )}
                      <Label>{client.status === 'active' ? 'Deactivate client' : 'Reactivate client'}</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="size-[52px] shrink-0 rounded-[15px]! bg-accent! text-accent-foreground!">
              <Avatar.Fallback className="rounded-[15px]! bg-accent! text-[17px] font-bold text-accent-foreground!">
                {initials}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-foreground [font-family:var(--font-grotesk)]">{name}</p>
              <p
                className={`mt-[3px] flex items-center gap-[5px] truncate text-[11px] font-semibold ${client.status === 'active' ? 'text-success' : 'text-muted'}`}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-current" />
                {status}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <WorkspaceLink
            active={inChat}
            replace={false}
            to={chatPath}
          >
            <MessageCircle size={18} />
            Chat
          </WorkspaceLink>
          {CLIENT_WORKSPACE_TABS.map((tab) => (
            <div key={tab.id}>
              {tab.id === 'check-in' ? (
                <>
                  <div className="mx-2 my-[10px] h-px bg-surface-secondary" />
                  <p className="px-3 pt-0.5 pb-2 text-[10.5px] font-bold tracking-[0.06em] text-field-placeholder uppercase">
                    Check-ins
                  </p>
                </>
              ) : null}
              {tab.id === 'detail' ? <div className="mx-2 my-[10px] h-px bg-surface-secondary" /> : null}
              <WorkspaceLink
                active={!inChat && activeTab === tab.id}
                to={clientWorkspaceTabPath(client.id, tab.id)}
              >
                {TAB_ICON[tab.id]}
                {tab.label}
              </WorkspaceLink>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-secondary">
        <header className="border-b border-separator bg-surface lg:hidden">
          <div className={`flex items-center gap-[11px] px-[14px] ${inChat ? 'py-[11px]' : 'py-3'}`}>
            <button
              aria-label="Back"
              className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-surface-secondary"
              onClick={handleBack}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <Avatar
              className={`${inChat ? 'size-[38px] rounded-[11px]!' : 'size-10 rounded-[12px]!'} shrink-0 bg-accent! text-accent-foreground!`}
            >
              <Avatar.Fallback
                className={`${inChat ? 'rounded-[11px]!' : 'rounded-[12px]!'} bg-accent! text-[13px] font-bold text-accent-foreground!`}
              >
                {initials}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground [font-family:var(--font-grotesk)]">
                {name}
              </p>
              <p
                className={`truncate text-[11px] font-semibold ${client.status === 'active' ? 'text-success' : 'text-muted'}`}
              >
                {status}
              </p>
            </div>
            {!inChat ? (
              <Link
                aria-label="Chat"
                className="relative grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-focus text-white"
                to={chatPath}
              >
                <MessageCircle size={18} />
              </Link>
            ) : null}
          </div>
          {!inChat ? (
            <nav className="scrollbar-hide flex gap-[7px] overflow-x-auto px-[14px] pb-3">
              {CLIENT_WORKSPACE_TABS.map((tab) => (
                <Link
                  className={`flex h-[30px] shrink-0 items-center rounded-[9px] px-3 text-xs font-semibold ${
                    activeTab === tab.id ? 'bg-accent-soft text-accent' : 'text-foreground'
                  }`}
                  key={tab.id}
                  replace
                  to={clientWorkspaceTabPath(client.id, tab.id)}
                >
                  {tab.label.replace(' plan', '')}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export function ClientWorkspaceFallback({backTo = ROUTES.CLIENTS, children}: {backTo?: string; children: ReactNode}) {
  const goBack = useGoBack(backTo);

  return (
    <div className="flex h-full min-h-0 w-full bg-surface">
      <aside className="hidden w-[274px] shrink-0 flex-col border-r border-separator bg-surface lg:flex">
        <div className="border-b border-separator px-4 pt-4 pb-3.5">
          <button
            className="mb-3 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-link"
            onClick={goBack}
            type="button"
          >
            <ChevronLeft size={14} />
            All clients
          </button>
          <div className="flex items-center gap-3">
            <Skeleton className="size-[52px] shrink-0 rounded-[15px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-2 p-3">
          {CLIENT_WORKSPACE_TABS.map((tab) => (
            <Skeleton
              className="h-11 rounded-xl"
              key={tab.id}
            />
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-secondary">
        <header className="flex items-center gap-[11px] border-b border-separator bg-surface px-[14px] py-3 lg:hidden">
          <button
            aria-label="Back"
            className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-surface-secondary"
            onClick={goBack}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          <Skeleton className="size-10 shrink-0 rounded-[12px]" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
