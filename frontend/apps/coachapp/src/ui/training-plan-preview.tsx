import type {TrainingPlan} from '../api/training-plans';
import {ExercisePreview} from './exercise-preview';
import {setSummary} from './training-prescription';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function TrainingPlanPreview({plan}: {plan: TrainingPlan}) {
  return (
    <div className="space-y-5">
      {plan.description && <p className="text-sm whitespace-pre-wrap">{plan.description}</p>}
      {plan.content.workouts.map((workout) => (
        <details
          key={workout.id}
          open
          className="rounded-xl border border-border"
        >
          <summary className="min-h-12 px-4 py-3 font-semibold cursor-pointer">{workout.name}</summary>
          <div className="space-y-4 border-t border-border p-4">
            <p className="text-sm text-muted-foreground">
              {plan.content.schedule.entries
                .filter((entry) => entry.ref === workout.id)
                .map((entry) => weekdays[entry.day])
                .join(' · ') || 'No scheduled days'}
            </p>
            {workout.blocks.map((block) => (
              <section
                key={block.id}
                className="space-y-3"
              >
                <h3 className="capitalize font-semibold">
                  {block.format}
                  {block.rounds ? ` · ${block.rounds} rounds` : ''}
                </h3>
                {block.items.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-2"
                  >
                    <h4 className="font-medium">{item.exercise_name}</h4>
                    <ExercisePreview
                      id={item.exercise_id}
                      name={item.exercise_name ?? 'Exercise'}
                    />
                    <ol className="space-y-2">
                      {item.sets.map((set, index) => (
                        <li
                          key={set.id}
                          className="rounded-lg bg-muted/60 p-3 text-sm"
                        >
                          Set {index + 1} · {setSummary(set)}
                          {set.notes && <p>{set.notes}</p>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
