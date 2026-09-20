import {QueryClientProvider} from '@tanstack/react-query';
import {Flower2} from 'lucide-react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {restoreChallenge} from './api/challenge';
import {startOfflineCache} from './api/offline';
import {queryClient} from './api/query-client';
import {restoreSession} from './api/session';
import {isNative} from './api/storage';
import {router} from './router';
import {Button} from './ui/button';
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
    createRoot(root).render(
      <main className="page flex min-h-[80dvh] flex-col justify-center gap-6">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-[var(--training)] text-primary">
          <Flower2
            className="size-9"
            aria-hidden="true"
          />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight">Let’s try opening Easy again</h1>
          <p className="text-muted-foreground">
            We couldn’t open your saved account. Your saved drafts haven’t been removed.
          </p>
          {isNative && <p className="text-muted-foreground">Make sure your device is unlocked, then try again.</p>}
        </div>
        <Button
          autoFocus
          onPress={() => window.location.reload()}
        >
          Try again
        </Button>
      </main>,
    );
  }
});
