import {QueryClientProvider} from '@tanstack/react-query';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {restoreChallenge} from './api/challenge';
import {startOfflineCache} from './api/offline';
import {queryClient} from './api/query-client';
import {restoreSession} from './api/session';
import {isNative} from './api/storage';
import {router} from './router';
import {ConnectionStatus} from './ui/connection-status';
import {startNativeRuntime} from './ui/native-runtime';
import {SessionBoundary} from './ui/session-boundary';
import './index.css';

async function start() {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Application root is missing.');
  }
  await Promise.all([restoreSession(), restoreChallenge()]);
  await startOfflineCache();
  // Resolve the native launch destination before route guards can redirect the initial screen.
  await startNativeRuntime({navigate: (path) => router.navigate(path), back: () => router.navigate(-1)});
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <SessionBoundary>
        <ConnectionStatus />
        <RouterProvider router={router} />
      </SessionBoundary>
    </QueryClientProvider>,
  );
  if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
}

start().catch(() => {
  const root = document.getElementById('root');
  if (root) {
    root.textContent = 'Easy could not open your saved account. Please close the app and try again.';
  }
});
