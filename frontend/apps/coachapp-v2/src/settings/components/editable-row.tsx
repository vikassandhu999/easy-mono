/**
 * One row of the Profile card: `{label} · {value} · Edit`. `Edit` swaps the row
 * for an inline field with Save/Cancel (INTERACTIONS.md § ST); Enter commits via
 * the native form submit, the saved value is trimmed, and an empty value renders
 * as an em dash.
 */
import {Button, ErrorMessage, Form, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormTextField} from '@/@components/form-fields';

import {applyFormErrors} from '@/api/shared';

const schema = z.object({
  value: z.string().min(1, 'Enter a value'),
});

type FormValues = z.infer<typeof schema>;

export default function EditableRow({
  inputType = 'text',
  label,
  onSave,
  value,
}: {
  inputType?: string;
  label: string;
  onSave: (value: string) => Promise<void>;
  value: null | string;
}) {
  const [editing, setEditing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const startEdit = () => {
    form.reset({value: value || ''});
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    form.reset();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await onSave(data.value.trim());
      setEditing(false);
    } catch (err) {
      applyFormErrors(err, "Couldn't save. Try again.", form.setError);
    }
  };

  if (editing) {
    return (
      <Form
        className="flex flex-col gap-2 border-t border-border px-4 py-3 md:flex-row md:items-center md:gap-2.5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Typography
          className="w-20 shrink-0 md:w-22"
          color="muted"
          type="body-sm"
        >
          {label}
        </Typography>
        <FormTextField
          className="min-w-0 flex-1"
          control={form.control}
          inputProps={{autoFocus: true}}
          label={<span className="sr-only">{label}</span>}
          name="value"
          type={inputType}
        />
        <div className="flex shrink-0 justify-end gap-2">
          <Button
            isPending={form.formState.isSubmitting}
            size="sm"
            type="submit"
          >
            {form.formState.isSubmitting ? (
              <Spinner
                color="current"
                size="sm"
              />
            ) : (
              'Save'
            )}
          </Button>
          <Button
            onPress={cancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
        {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}
      </Form>
    );
  }

  return (
    <div className="flex min-h-12 items-center gap-3 border-t border-border px-4 py-3">
      <Typography
        className="w-20 shrink-0 md:w-22"
        color="muted"
        type="body-sm"
      >
        {label}
      </Typography>
      <Typography
        className="min-w-0 flex-1 truncate"
        type="body-sm"
        weight="medium"
      >
        {value || '—'}
      </Typography>
      <Button
        className="shrink-0 font-semibold text-accent"
        onPress={startEdit}
        size="sm"
        variant="ghost"
      >
        Edit
      </Button>
    </div>
  );
}
