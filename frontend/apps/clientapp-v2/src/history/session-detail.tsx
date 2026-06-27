/**
 * Session detail — actual vs plan (spec: assets/client-training/07-history.html, detail).
 * Reconstructs plan-vs-actual from planned_snapshot (targets) + performed_sets (actuals):
 * matched ✓, beat ↑, missed ↓; a planned exercise with no sets = skipped, a performed
 * exercise not in the plan = added. Coach note shown. Read-only. Dark + periwinkle, new schema.
 */
import {formatDuration} from '@easy/utils';
import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type TrainingPerformedSet, type TrainingSession, useGetClientTrainingSessionQuery} from '@/api/training';
import {
  addedExercises,
  assignPerformed,
  formatDayDate,
  formatVolume,
  type SnapshotSet,
  sessionVolumeKg,
  snapshotExercises,
  snapshotOf,
  sorenessEmoji,
} from '@/workout/session-utils';

function unitLabel(unit?: null | string): string {
  return unit === 'lbs' ? 'lb' : unit === 'kg' ? 'kg' : '';
}

function actualLabel(p: TrainingPerformedSet): string {
  if (p.load_value == null || p.load_unit === 'none' || p.load_unit === 'bodyweight') {
    return `${p.reps ?? '—'} reps`;
  }
  return `${p.load_value}${unitLabel(p.load_unit)} × ${p.reps ?? '—'}`;
}

function targetLabel(planned?: SnapshotSet): null | string {
  if (!planned) {
    return null;
  }
  if (planned.load_value == null) {
    return planned.reps != null ? `target ${planned.reps}` : null;
  }
  return `target ${planned.load_value}×${planned.reps ?? '—'}`;
}

// ↑ beat / ↓ missed / ✓ matched — compared like-for-like on whichever dimension the
// plan prescribes: load when a target load is set, else reps. No mark if neither.
function deltaMark(p: TrainingPerformedSet, planned?: SnapshotSet): '' | '↑' | '↓' | '✓' {
  if (!planned) {
    return '';
  }
  const [actual, target] =
    planned.load_value != null
      ? [p.load_value != null ? Number(p.load_value) : Number.NaN, Number(planned.load_value)]
      : planned.reps != null
        ? [Number(p.reps), Number(planned.reps)]
        : [Number.NaN, Number.NaN];
  if (!Number.isFinite(actual) || !Number.isFinite(target)) {
    return '';
  }
  return actual > target ? '↑' : actual < target ? '↓' : '✓';
}

type Row = {actual: string; id: string; mark: '' | '↑' | '↓' | '✓'; target: null | string};

function ExerciseCard({name, badge, rows}: {badge?: 'added' | 'skipped'; name: string; rows: Row[]}) {
  const markClass = (m: Row['mark']) => (m === '↑' ? 'text-success' : m === '↓' ? 'text-[#e0926c]' : 'text-muted');
  return (
    <div className="mb-2.5 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${badge === 'skipped' ? 'text-muted' : ''}`}>{name}</span>
        {badge === 'skipped' ? (
          <span className="rounded border border-[#3a3a42] px-1.5 py-px text-[9px] text-muted">skipped</span>
        ) : badge === 'added' ? (
          <span className="rounded border border-[#7d5a2f] px-1.5 py-px text-[9px] text-warning">added</span>
        ) : null}
      </div>
      {rows.map((r) => (
        <div
          className="mt-1.5 flex items-center justify-between gap-2 border-t border-[#202026] pt-1.5 text-xs"
          key={r.id}
        >
          <span className="text-[#cfe]">{r.actual}</span>
          {r.target ? (
            <span className="text-[11px] text-[#666]">
              {r.target} <span className={markClass(r.mark)}>{r.mark}</span>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Detail({session}: {session: TrainingSession}) {
  const goBack = useGoBack(ROUTES.WORKOUT_HISTORY);
  const exercises = snapshotExercises(session);
  const assigned = assignPerformed(exercises, session.performed_sets);
  const added = addedExercises(exercises, session.performed_sets);

  const setCount = session.performed_sets.length;
  const volume = formatVolume(sessionVolumeKg(session.performed_sets));
  const exerciseCount = exercises.filter((_, i) => (assigned[i]?.length ?? 0) > 0).length + added.size;
  const sub = [
    formatDayDate(session.started_at),
    formatDuration(session.started_at, session.ended_at),
    sorenessEmoji(session.soreness_rating),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <button
        aria-label="Back"
        className="mb-3 -ml-1 flex size-9 items-center justify-center rounded-lg text-muted active:bg-surface-secondary"
        onClick={goBack}
        type="button"
      >
        <ArrowLeft size={20} />
      </button>

      <h1 className="text-lg font-bold">{snapshotOf(session).workout_name ?? 'Workout'}</h1>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>

      <div className="my-3.5 flex gap-4 text-xs text-[#9aa]">
        <span>
          Sets <b className="text-foreground">{setCount}</b>
        </span>
        <span>
          Volume <b className="text-foreground">{volume}</b>
        </span>
        <span>
          Exercises <b className="text-foreground">{exerciseCount}</b>
        </span>
      </div>

      {exercises.map((ex, i) => {
        const done = assigned[i] ?? [];
        return (
          <ExerciseCard
            badge={done.length === 0 ? 'skipped' : undefined}
            key={`${ex.exercise_id}-${ex.position ?? i}`}
            name={ex.name ?? 'Exercise'}
            rows={done.map((p, si) => ({
              actual: actualLabel(p),
              id: p.id,
              mark: deltaMark(p, ex.sets?.[si]),
              target: targetLabel(ex.sets?.[si]),
            }))}
          />
        );
      })}

      {[...added.entries()].map(([id, ps]) => (
        <ExerciseCard
          badge="added"
          key={id}
          name={ps[0]?.exercise_name ?? 'Exercise'}
          rows={ps.map((p) => ({actual: actualLabel(p), id: p.id, mark: '' as const, target: null}))}
        />
      ))}

      {session.notes ? (
        <div className="mt-1 rounded-[10px] border border-border bg-surface p-2.5 text-xs text-[#9aa]">
          “{session.notes}”
        </div>
      ) : null}
    </div>
  );
}

export default function SessionDetail() {
  const {sessionId} = useParams<{sessionId: string}>();
  const goBack = useGoBack(ROUTES.WORKOUT_HISTORY);
  const {data, isLoading} = useGetClientTrainingSessionQuery({id: sessionId!}, {skip: !sessionId});

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted">Workout not found.</p>
        <Button
          onPress={goBack}
          variant="primary"
        >
          Back to history
        </Button>
      </div>
    );
  }

  return <Detail session={data.data} />;
}
