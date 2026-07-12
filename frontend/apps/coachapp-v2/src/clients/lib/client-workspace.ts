import {matchPath} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

export type ClientWorkspaceTab =
  | 'check-in'
  | 'detail'
  | 'nutrition'
  | 'progress'
  | 'subscription'
  | 'trainer'
  | 'training';

export const CLIENT_WORKSPACE_TABS: {id: ClientWorkspaceTab; label: string; mobileLabel?: string}[] = [
  {id: 'progress', label: 'Progress'},
  {id: 'nutrition', label: 'Nutrition plan'},
  {id: 'training', label: 'Training plan'},
  {id: 'trainer', label: 'Assigned trainer', mobileLabel: 'Trainer'},
  {id: 'check-in', label: 'Client check-in'},
  {id: 'detail', label: 'Detail'},
  {id: 'subscription', label: 'Subscription'},
];

export function getClientWorkspaceTab(searchParams: URLSearchParams): ClientWorkspaceTab {
  const tab = searchParams.get('tab');
  return CLIENT_WORKSPACE_TABS.some((item) => item.id === tab) ? (tab as ClientWorkspaceTab) : 'progress';
}

export function clientWorkspaceTabPath(clientId: string, tab: ClientWorkspaceTab) {
  const path = ROUTES.CLIENT_DETAIL.replace(':id', clientId);
  return tab === 'progress' ? path : `${path}?tab=${tab}`;
}

export function isClientWorkspacePath(pathname: string) {
  return Boolean(
    matchPath({end: true, path: ROUTES.CLIENT_DETAIL}, pathname) ||
      matchPath({end: true, path: ROUTES.CLIENT_MESSAGES}, pathname),
  );
}
