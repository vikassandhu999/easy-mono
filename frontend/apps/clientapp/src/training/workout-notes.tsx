import {ChevronRight, NotebookPen} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {errorMessage} from '../api/client';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

type Notes = {notes: string; soreness: string};
export function WorkoutNotes({
  notes,
  soreness,
  savedSoreness,
  pending,
  canSave,
  onChange,
  onSave,
  onFinish,
}: Notes & {
  savedSoreness: number | null;
  pending: boolean;
  canSave: boolean;
  onChange: (values: Notes) => void;
  onSave: (values: Notes) => Promise<void>;
  onFinish: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const form = useForm<Notes>({defaultValues: {notes, soreness}});
  useEffect(() => {
    const subscription = form.watch(() => onChange(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, onChange]);
  useEffect(() => {
    if (savedSoreness !== null && form.getValues('soreness') === '') {
      form.setValue('soreness', String(savedSoreness));
    }
  }, [form, savedSoreness]);
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="w-full justify-between rounded-3xl bg-surface px-5 min-h-16"
        onPress={() => {
          setError('');
          setOpen(true);
        }}
      >
        <NotebookPen
          className="size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="flex-1 text-left whitespace-normal">Workout notes & soreness</span>
        <ChevronRight
          className="size-5 shrink-0"
          aria-hidden="true"
        />
      </Button>
      {open && (
        <BottomSheet
          title="Workout notes & soreness"
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
              name="notes"
              label="Workout notes"
              multiline
              maxLength={5000}
              isDisabled={pending}
            />
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
                  {savedSoreness === null && <SelectItem id="">Not rated</SelectItem>}
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
              Save workout notes
            </Button>
          </form>
        </BottomSheet>
      )}
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
    </div>
  );
}
