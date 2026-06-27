/**
 * Workout history — read-only list of past sessions (spec: assets/client-training/
 * 07-history.html, list). Reverse-chron, grouped by month. Each row: date · workout ·
 * duration · sets · volume + soreness. Tap → session detail. Dark + periwinkle, new schema.
 */
import {formatDuration} from '@easy/utils';
import {Spinner} from '@heroui/react';
import {ChevronRight} from 'lucide-react';
import {Link} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {type TrainingSession, useListClientTrainingSessionsQuery} from '@/api/training';
import {formatDayDate, formatVolume, sessionVolumeKg, snapshotOf, sorenessEmoji} from '@/workout/session-utils';

function monthOf(iso: string): {key: string; label: string} {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return {
    key: `${d.getFullYear()}-${d.getMonth()}`,
    label: d.toLocaleDateString('en-US', sameYear ? {month: 'long'} : {month: 'long', year: 'numeric'}),
  };
}

function SessionRow({session}: {session: TrainingSession}) {
  const name = snapshotOf(session).workout_name ?? 'Workout';
  const sets = session.performed_sets.length;
  const stats = [
    formatDuration(session.started_at, session.ended_at),
    `${sets} set${sets === 1 ? '' : 's'}`,
    `${formatVolume(sessionVolumeKg(session.performed_sets))} volume`,
  ]
    .filter(Boolean)
    .join(' · ');
  const sore = sorenessEmoji(session.soreness_rating);
  return (
    <Link
      className="mb-2.5 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors active:bg-surface-secondary"
      to={`/history/${session.id}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] text-muted">{formatDayDate(session.started_at)}</p>
        <p className="mt-0.5 truncate font-semibold">{name}</p>
        <p className="mt-0.5 text-[11px] text-[#9aa]">{stats}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {sore ? <span className="text-lg">{sore}</span> : null}
        <ChevronRight
          className="text-muted"
          size={16}
        />
      </div>
    </Link>
  );
}

export default function WorkoutHistory() {
  const {data, isLoading} = useListClientTrainingSessionsQuery({});

  if (isLoading) {
    return (
      <PageLayout title="History">
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  const sessions = (data?.data ?? [])
    .filter((s) => s.state === 'completed')
    .sort((a, b) => b.started_at.localeCompare(a.started_at));

  if (sessions.length === 0) {
    return (
      <PageLayout title="History">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium">No workouts yet</p>
          <p className="mt-1.5 text-xs text-muted">Finished workouts will show up here.</p>
        </div>
      </PageLayout>
    );
  }

  // Sessions are reverse-chron, so months come out grouped already.
  const groups: Array<{key: string; label: string; sessions: TrainingSession[]}> = [];
  let current: null | (typeof groups)[number] = null;
  for (const s of sessions) {
    const {key, label} = monthOf(s.started_at);
    if (!current || current.key !== key) {
      current = {key, label, sessions: []};
      groups.push(current);
    }
    current.sessions.push(s);
  }

  return (
    <PageLayout title="History">
      {groups.map((g) => (
        <div
          className="mb-4"
          key={g.key}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{g.label}</p>
          {g.sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
            />
          ))}
        </div>
      ))}
    </PageLayout>
  );
}
