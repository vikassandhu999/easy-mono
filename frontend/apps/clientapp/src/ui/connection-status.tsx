import {onlineManager} from '@tanstack/react-query';
import {useSyncExternalStore} from 'react';

const subscribe = (notify: () => void) => onlineManager.subscribe(notify);

export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => onlineManager.isOnline());
  return online ? null : (
    <p
      role="status"
      className="mx-auto max-w-md bg-muted px-5 py-3 text-sm"
    >
      You're offline. Reconnect and save to send changes to your coach.
    </p>
  );
}
