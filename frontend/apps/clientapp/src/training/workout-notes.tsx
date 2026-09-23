import {ChevronRight, NotebookPen} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Link} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {routes} from '../routes';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

type Notes = {notes: string; soreness: string; date: string};
export function WorkoutNotes({
  notes,
  soreness,
  date,
  localDate,
  pending,
  canSave,
  onChange,
  onSave,
  onFinish,
  completed = false,
}: Notes & {
  localDate: string;
  pending: boolean;
  canSave: boolean;
  onChange: (values: Notes) => void;
  onSave: (values: Notes) => Promise<void>;
  onFinish?: (() => void) | undefined;
  completed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const form = useForm<Notes>({defaultValues: {notes, soreness, date}});
  useEffect(() => {
    const subscription = form.watch(() => onChange(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="w-full justify-between rounded-3xl bg-surface px-5 min-h-16"
        onPress={() => {
          setError('');
          form.reset({notes, soreness, date});
          setOpen(true);
        }}
      >
        <NotebookPen
          className="size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="flex-1 text-left whitespace-normal">Workout date & note to coach</span>
        <ChevronRight
          className="size-5 shrink-0"
          aria-hidden="true"
        />
      </Button>
      {open && (
        <BottomSheet
          title="Workout date & note to coach"
          onClose={() => setOpen(false)}
        >
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setError('');
              try {
                await onSave(values);
                setOpen(false);
              } catch (cause) {
                setError(errorMessage(cause, 'Your notes could not be saved. They are kept on this device.'));
              }
            })}
          >
            <FormError message={error} />
            <FormField
              control={form.control}
              name="date"
              label="Workout date"
              type="date"
              isRequired
              isDisabled={pending}
              description="When this workout happened. You can record a past workout; its original targets stay the same."
              rules={{validate: (value) => value <= localDate || 'Choose today or an earlier date.'}}
            />
            <FormField
              control={form.control}
              name="notes"
              label="Note to coach"
              multiline
              maxLength={4000}
              isDisabled={pending}
            />
            <p className="text-sm text-muted-foreground">
              {completed
                ? 'Saving a changed note sends it to your coach in Messages. Replies may take time.'
                : 'This note is sent in Messages when you finish the workout. To ask before finishing, open Messages now. Replies may take time.'}
            </p>
            <Controller
              control={form.control}
              name="soreness"
              rules={{
                validate: (value) =>
                  value === '' || ['1', '2', '3', '4', '5'].includes(value) || 'Choose a soreness rating.',
              }}
              render={({field}) => (
                <SelectField
                  aria-label="Soreness"
                  value={field.value}
                  onChange={field.onChange}
                  isDisabled={pending}
                >
                  <SelectItem id="">Not rated</SelectItem>
                  <SelectItem id="1">1 · No soreness</SelectItem>
                  <SelectItem id="2">2 · Mild</SelectItem>
                  <SelectItem id="3">3 · Moderate</SelectItem>
                  <SelectItem id="4">4 · High</SelectItem>
                  <SelectItem id="5">5 · Very high</SelectItem>
                </SelectField>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              preventFocusOnPress
              isDisabled={!canSave || pending}
              isPending={pending}
            >
              {completed ? 'Save corrections and share note' : 'Save workout details'}
            </Button>
          </form>
        </BottomSheet>
      )}
      {!completed && (
        <Link
          className="flex min-h-12 items-center justify-center text-primary font-semibold"
          to={routes.messages}
        >
          Ask your coach before finishing
        </Link>
      )}
      {onFinish && (
        <Button
          className="w-full"
          variant="outline"
          isDisabled={!canSave || pending}
          onPress={() => {
            form.handleSubmit(onFinish)();
          }}
        >
          Finish workout
        </Button>
      )}
    </div>
  );
}
