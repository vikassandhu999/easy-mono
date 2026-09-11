import {useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {type PrescriptionDraft, weekdays} from './prescription';

export function WeekStrip({
  readOnly,
  onAssign,
}: {
  readOnly: boolean;
  onAssign: (day: (typeof weekdays)[number]) => void;
}) {
  const form = useFormContext<PrescriptionDraft>();
  const workouts = useWatch({control: form.control, name: 'workouts'});
  const schedule = useWatch({control: form.control, name: 'schedule'});
  const [day, setDay] = useState<(typeof weekdays)[number] | null>(null);
  function assign(value: string) {
    if (day) {
      form.setValue(`schedule.${day}`, value, {shouldDirty: true});
      onAssign(day);
      setDay(null);
    }
  }
  return (
    <section
      aria-label="Weekly schedule"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Your week</h2>
        {!readOnly && <p className="text-xs text-muted-foreground">Choose a day to assign a workout.</p>}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {weekdays.map((weekday) => {
          const workout = workouts.find((item) => (item.id ?? item.local_ref) === schedule[weekday]);
          const name = workout ? workout.name || 'Unnamed workout' : 'Rest';
          const content = (
            <>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{weekday.slice(0, 3)}</span>
              <span className="line-clamp-2 w-full break-words text-xs font-medium">{name}</span>
            </>
          );
          return readOnly ? (
            <div
              key={weekday}
              className="flex min-h-20 flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3"
            >
              {content}
            </div>
          ) : (
            <Button
              key={weekday}
              variant={workout ? 'secondary' : 'outline'}
              aria-label={`${weekday}: ${name}`}
              className="h-auto min-h-20 min-w-0 flex-col items-start justify-start gap-2 whitespace-normal px-3 py-3 text-left"
              onPress={() => setDay(weekday)}
            >
              {content}
            </Button>
          );
        })}
      </div>
      <Dialog
        isOpen={day !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDay(null);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            <span className="capitalize">{day}</span> workout
          </DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onPress={() => assign('')}
          >
            Rest day
          </Button>
          {workouts.map((workout) => (
            <Button
              key={workout.id ?? workout.local_ref}
              variant="outline"
              className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left"
              onPress={() => assign(workout.id ?? workout.local_ref ?? '')}
            >
              {workout.name || 'Unnamed workout'}
            </Button>
          ))}
          {workouts.length === 0 && (
            <p className="pt-2 text-sm text-muted-foreground">Add exercises to create your first workout.</p>
          )}
        </div>
      </Dialog>
    </section>
  );
}
