import {Pin} from 'lucide-react';
import {useProfile} from '../api/auth';
import {CachedRead} from './cached-read';

export function Focus({showEmpty = false}: {showEmpty?: boolean}) {
  const query = useProfile();
  const focus = query.data?.data.focus;
  if (!focus && !showEmpty) {
    return null;
  }
  return (
    <section
      aria-label="Current Focus"
      className="mb-4 rounded-3xl bg-[var(--coach)] p-5 space-y-3"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Pin
          aria-hidden="true"
          className="size-5"
        />
        Focus
      </h2>
      <p className="wrap-break-word">{focus || 'Your coach has not set a Focus.'}</p>
      <CachedRead
        updatedAt={query.dataUpdatedAt}
        failed={query.isError}
        refreshing={query.isFetching}
        refresh={() => query.refetch()}
      />
    </section>
  );
}
