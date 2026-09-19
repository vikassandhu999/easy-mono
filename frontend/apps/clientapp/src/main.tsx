import {QueryClientProvider} from '@tanstack/react-query';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {restoreChallenge} from './api/challenge';
import {queryClient} from './api/query-client';
import {restoreSession} from './api/session';
import {router} from './router';
import {ConnectionStatus} from './ui/connection-status';
import {startNativeRuntime} from './ui/native-runtime';
import './index.css';

async function start() {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Application root is missing.');
  }
  await Promise.all([restoreSession(), restoreChallenge()]);
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <ConnectionStatus />
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await startNativeRuntime({navigate: (path) => router.navigate(path), back: () => router.navigate(-1)});
}

start().catch(() => {
  const root = document.getElementById('root');
  if (root) {
    root.textContent = 'Easy could not open your saved account. Please close the app and try again.';
  }
});
