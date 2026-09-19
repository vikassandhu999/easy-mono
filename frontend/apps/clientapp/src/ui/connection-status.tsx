import {onlineManager} from '@tanstack/react-query';
import {useSyncExternalStore} from 'react';
import {offlineIssue, subscribeOfflineIssue} from '../api/offline';

const subscribe = (notify: () => void) => onlineManager.subscribe(notify);

export function useOnline() {
  return useSyncExternalStore(subscribe, () => onlineManager.isOnline());
}
export function ConnectionStatus() {
  const online = useOnline();
  const issue = useSyncExternalStore(subscribeOfflineIssue, offlineIssue);
  return online && !issue ? null : (
    <p
      role="status"
      className="mx-auto max-w-md bg-muted px-5 py-3 text-sm"
    >
      {online ? issue : "You're offline. Reconnect and save to send changes to your coach."}
    </p>
  );
}
