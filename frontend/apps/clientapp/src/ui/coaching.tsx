import {useProfile} from '../api/auth';

export function useCoaching() {
  const profile = useProfile().data?.data;
  return {
    canWrite: profile?.state === 'active' || profile?.state === 'ending_soon',
    endedOn:
      profile?.state === 'ended'
        ? profile.terms.reduce<string | null>(
            (latest, term) =>
              term.ends_on && term.ends_on < profile.local_date && (!latest || term.ends_on > latest)
                ? term.ends_on
                : latest,
            null,
          )
        : null,
  };
}

export function CoachingEnded() {
  const {endedOn} = useCoaching();
  if (!endedOn) {
    return null;
  }
  return (
    <aside className="mb-4 rounded-2xl bg-muted px-4 py-3 text-sm">
      <p className="font-semibold">
        Coaching ended{' '}
        <time dateTime={endedOn}>
          {new Date(`${endedOn}T12:00:00`).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
        </time>
      </p>
      <p className="mt-1 text-muted-foreground">Your history is here to read.</p>
    </aside>
  );
}
