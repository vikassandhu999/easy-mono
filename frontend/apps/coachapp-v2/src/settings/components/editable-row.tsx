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
      await onSave(data.value);
      setEditing(false);
    } catch (err) {
      applyFormErrors(err, "Couldn't save. Try again.", form.setError);
    }
  };

  if (editing) {
    return (
      <Form
        className="flex flex-col gap-1 border-t border-border px-4 py-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Typography
            className="w-20 shrink-0"
            color="muted"
            type="body-sm"
          >
            {label}
          </Typography>
          <div className="min-w-0 flex-1">
            <FormTextField
              className="w-full"
              control={form.control}
              label={<span className="sr-only">{label}</span>}
              name="value"
              type={inputType}
            />
          </div>
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
    <div className="flex min-h-11 items-center border-t border-border px-4 py-3">
      <Typography
        className="w-20 shrink-0"
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
        className="shrink-0 text-sm text-accent"
        onPress={startEdit}
        size="sm"
        variant="ghost"
      >
        Edit
      </Button>
    </div>
  );
}
