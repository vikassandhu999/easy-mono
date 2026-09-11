import type {TrainingPlan, TrainingPlanPlannedSet} from '../api/training-plans';

export function TrainingPlanPreview({plan}: {plan: TrainingPlan}) {
  return (
    <div className="space-y-5">
      {plan.description && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
          {plan.description}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {plan.workout_count} {plan.workout_count === 1 ? 'workout' : 'workouts'}
      </p>
      {plan.workout_count === 0 && <p className="text-sm">This plan has no workouts yet.</p>}
      {plan.workouts.map((workout) => (
        <details
          key={workout.id}
          className="rounded-xl border border-border"
          open
        >
          <summary className="min-h-12 cursor-pointer break-words px-4 py-3 font-semibold focus-visible:-outline-offset-4">
            {workout.name}
          </summary>
          <div className="space-y-4 border-t border-border px-4 py-4">
            <p className="text-sm capitalize text-muted-foreground">
              {workout.weekdays.length ? workout.weekdays.join(', ') : 'No weekly schedule'}
            </p>
            {workout.workout_elements.length === 0 && (
              <p className="text-sm text-muted-foreground">No exercises prescribed.</p>
            )}
            {workout.workout_elements.map((element) => (
              <section
                key={element.id}
                className="space-y-2"
                aria-label={element.exercise.name}
              >
                <h3 className="break-words font-medium">{element.exercise.name}</h3>
                {element.planned_sets.length === 0 && (
                  <p className="text-sm text-muted-foreground">No sets prescribed.</p>
                )}
                <ol
                  className="space-y-2"
                  aria-label={`${element.exercise.name} sets`}
                >
                  {element.planned_sets.map((set, index) => (
                    <li
                      key={index}
                      className="rounded-lg bg-muted/60 p-3 text-sm"
                    >
                      <p className="mb-2 font-medium">
                        Set {index + 1}
                        {set.set_type
                          ? ` · ${set.set_type === 'dropset' ? 'Drop set' : set.set_type === 'warmup' ? 'Warm-up' : 'Working'}`
                          : ''}
                      </p>
                      <SetPrescription set={set} />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function SetPrescription({set}: {set: TrainingPlanPlannedSet}) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
        {set.reps != null && (
          <>
            <dt>Reps</dt>
            <dd className="break-words text-foreground">{set.reps}</dd>
          </>
        )}
        {(set.load_value != null || set.load_unit === 'bodyweight') && (
          <>
            <dt>Load</dt>
            <dd className="text-foreground">
              {set.load_unit === 'bodyweight' ? (
                'Bodyweight'
              ) : (
                <>
                  {set.load_value} {set.load_unit === 'none' ? '' : set.load_unit}
                </>
              )}
            </dd>
          </>
        )}
        {set.duration_seconds != null && (
          <>
            <dt>Duration</dt>
            <dd className="text-foreground">{set.duration_seconds} sec</dd>
          </>
        )}
        {set.distance_value != null && (
          <>
            <dt>Distance</dt>
            <dd className="text-foreground">
              {set.distance_value} {set.distance_unit === 'none' ? '' : set.distance_unit}
            </dd>
          </>
        )}
        {set.rpe != null && (
          <>
            <dt>RPE</dt>
            <dd className="text-foreground">{set.rpe}</dd>
          </>
        )}
        {set.rest_seconds != null && (
          <>
            <dt>Rest</dt>
            <dd className="text-foreground">{set.rest_seconds} sec</dd>
          </>
        )}
      </dl>
      {set.notes && <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{set.notes}</p>}
    </>
  );
}
