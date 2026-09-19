import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Button} from '../ui/button';
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
    <form
      className="border-t border-border pt-5 space-y-4"
      onSubmit={form.handleSubmit(onSave)}
    >
      <details className="space-y-4">
        <summary className="text-link py-2 cursor-pointer">Workout notes & soreness</summary>
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
          variant="outline"
          isDisabled={!canSave}
          isPending={pending}
        >
          Save workout notes
        </Button>
      </details>
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
    </form>
  );
}
