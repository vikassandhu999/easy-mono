import {formatIsoDateShort, getInitials} from '@easy/utils';
import {Avatar, Skeleton} from '@heroui/react';
import {ChevronLeft, CircleUserRound, ClipboardCheck, Dumbbell, LineChart, MessageCircle, Utensils} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Client} from '@/api/clients';
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
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-hover hover:text-foreground'
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

  return (
    <div className="flex h-full min-h-0 w-full bg-surface">
      <aside className="hidden w-[274px] shrink-0 flex-col border-r border-separator bg-surface lg:flex">
        <div className="border-b border-separator px-4 pt-4 pb-3.5">
          <Link
            className="mb-3 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-link transition-opacity hover:opacity-70"
            to={ROUTES.CLIENTS}
          >
            <ChevronLeft size={14} />
            All clients
          </Link>
          <div className="flex items-center gap-3">
            <Avatar
              className="size-[52px] shrink-0 rounded-[15px]!"
              color="accent"
            >
              <Avatar.Fallback className="rounded-[15px]! text-[17px] font-bold">{initials}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-grotesk text-base font-bold text-foreground">{name}</p>
              <p
                className={`mt-1 truncate text-[11px] font-semibold ${client.status === 'active' ? 'text-success' : 'text-muted'}`}
              >
                {status}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
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
                  <div className="mx-2 my-2 h-px bg-surface-secondary" />
                  <p className="px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.06em] text-field-placeholder uppercase">
                    Check-ins
                  </p>
                </>
              ) : null}
              {tab.id === 'detail' ? <div className="mx-2 my-2 h-px bg-surface-secondary" /> : null}
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
          <div className="flex min-h-16 items-center gap-3 px-3">
            <BackButton
              className="shrink-0"
              onPress={handleBack}
            />
            <Avatar
              className="size-10 shrink-0 rounded-[12px]!"
              color="accent"
            >
              <Avatar.Fallback className="rounded-[12px]! text-[13px] font-bold">{initials}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-grotesk text-[15px] font-bold text-foreground">{name}</p>
              <p
                className={`truncate text-[11px] font-semibold ${client.status === 'active' ? 'text-success' : 'text-muted'}`}
              >
                {status}
              </p>
            </div>
            <Link
              aria-label="Chat"
              className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${
                inChat ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent'
              }`}
              to={chatPath}
            >
              <MessageCircle size={18} />
            </Link>
          </div>
          {!inChat ? (
            <nav className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-3">
              {CLIENT_WORKSPACE_TABS.map((tab) => (
                <Link
                  className={`flex min-h-11 shrink-0 items-center rounded-xl px-3 text-xs font-semibold ${
                    activeTab === tab.id ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-muted'
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
        <header className="flex min-h-16 items-center gap-3 border-b border-separator bg-surface px-3 lg:hidden">
          <BackButton
            className="shrink-0"
            onPress={goBack}
          />
          <Skeleton className="size-10 shrink-0 rounded-2xl" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
