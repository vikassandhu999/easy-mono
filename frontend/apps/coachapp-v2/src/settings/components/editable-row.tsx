/**
 * One row of the Profile card: `{label} · {value} · Edit`. `Edit` swaps the row
 * for a labeled field + FormActions (INTERACTIONS.md § ST); Enter commits via
 * the native form submit, the saved value is trimmed, and an empty value renders
 * as an em dash.
 */
import {Button, ErrorMessage, Fieldset, Form, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {FormActions} from '@/@components/form-fields/form-actions';
import {FormTextField} from '@/@components/form-fields/form-text-field';
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
        className="flex flex-col gap-3 border-t border-border px-4 py-3"
        onSubmit={form.handleSubmit(onSubmit)}
        validationBehavior="aria"
      >
        <Fieldset>
          <Fieldset.Group>
            <FormTextField
              control={form.control}
              fullWidth
              inputProps={{autoFocus: true}}
              isRequired
              label={label}
              name="value"
              type={inputType}
            />
          </Fieldset.Group>
        </Fieldset>

        {form.formState.errors.root ? <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage> : null}

        <FormActions
          isSubmitting={form.formState.isSubmitting}
          onCancel={cancel}
          submitLabel="Save"
          submittingLabel="Saving"
        />
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
