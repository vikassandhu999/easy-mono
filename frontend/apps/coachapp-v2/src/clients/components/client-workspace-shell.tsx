import {getInitials} from '@easy/utils';
import {Avatar, Typography} from '@heroui/react';
import {CircleUserRound, ClipboardCheck, Dumbbell, LineChart, MessageCircle, Utensils} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Client} from '@/api/clients';
import {RowChips} from '@/clients/clients-list/client-list-item';

export type ClientWorkspaceTab = 'check-in' | 'detail' | 'nutrition' | 'progress' | 'training';

const TABS: {icon: ReactNode; id: ClientWorkspaceTab; label: string}[] = [
  {icon: <LineChart size={18} />, id: 'progress', label: 'Progress'},
  {icon: <Utensils size={18} />, id: 'nutrition', label: 'Nutrition plan'},
  {icon: <Dumbbell size={18} />, id: 'training', label: 'Training plan'},
  {icon: <ClipboardCheck size={18} />, id: 'check-in', label: 'Client check-in'},
  {icon: <CircleUserRound size={18} />, id: 'detail', label: 'Detail'},
];

export function getClientWorkspaceTab(searchParams: URLSearchParams): ClientWorkspaceTab {
  const tab = searchParams.get('tab');
  return TABS.some((item) => item.id === tab) ? (tab as ClientWorkspaceTab) : 'progress';
}

function clientName(client: Client) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email || 'Client';
}

function tabHref(clientId: string, tab: ClientWorkspaceTab) {
  const path = ROUTES.CLIENT_DETAIL.replace(':id', clientId);
  return tab === 'progress' ? path : `${path}?tab=${tab}`;
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
  const [searchParams] = useSearchParams();
  const goBack = useGoBack(ROUTES.CLIENTS);
  const activeTab = getClientWorkspaceTab(searchParams);
  const inChat = location.pathname.endsWith('/messages');
  const name = clientName(client);
  const initials = getInitials(client.first_name, client.last_name);
  const chatPath = ROUTES.CLIENT_MESSAGES.replace(':id', client.id);

  return (
    <div className="flex h-full min-h-0 w-full bg-surface">
      <aside className="hidden w-[274px] shrink-0 flex-col border-r border-separator bg-surface lg:flex">
        <div className="border-b border-separator p-5">
          <div className="flex items-center gap-3">
            <Avatar
              className="size-11 shrink-0"
              color="accent"
            >
              <Avatar.Fallback className="text-sm font-bold">{initials}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Typography
                truncate
                type="body-sm"
                weight="bold"
              >
                {name}
              </Typography>
              <div className="mt-1">
                <RowChips client={client} />
              </div>
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
          {TABS.map((tab) => (
            <WorkspaceLink
              active={!inChat && activeTab === tab.id}
              key={tab.id}
              to={tabHref(client.id, tab.id)}
            >
              {tab.icon}
              {tab.label}
            </WorkspaceLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-secondary">
        <header className="border-b border-separator bg-surface lg:hidden">
          <div className="flex min-h-16 items-center gap-3 px-3">
            <BackButton
              className="shrink-0"
              onPress={goBack}
            />
            <Avatar
              className="size-10 shrink-0"
              color="accent"
            >
              <Avatar.Fallback className="text-xs font-bold">{initials}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Typography
                truncate
                type="body-sm"
                weight="bold"
              >
                {name}
              </Typography>
              <div className="mt-0.5">
                <RowChips client={client} />
              </div>
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
              {TABS.map((tab) => (
                <Link
                  className={`flex min-h-11 shrink-0 items-center rounded-xl px-3 text-xs font-semibold ${
                    activeTab === tab.id ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-muted'
                  }`}
                  key={tab.id}
                  replace
                  to={tabHref(client.id, tab.id)}
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
