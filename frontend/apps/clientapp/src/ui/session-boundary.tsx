import {type ReactNode, useSyncExternalStore} from 'react';
import {retryEndSession, sessionEndState, subscribeSession} from '../api/session';
import {Button} from './button';

export function SessionBoundary({children}: {children: ReactNode}) {
  const state = useSyncExternalStore(subscribeSession, sessionEndState);
  if (state === 'idle') {
    return children;
  }
  return (
    <main className="page space-y-6">
      <h1 className="text-3xl font-semibold">{state === 'pending' ? 'Signing out…' : 'Sign-out not finished'}</h1>
      {state === 'pending' ? (
        <p role="status">Please keep the app open for a moment.</p>
      ) : (
        <>
          <p role="alert">This device could not finish signing out. Please try again.</p>
          <Button onPress={retryEndSession}>Retry sign-out</Button>
        </>
      )}
    </main>
  );
}
