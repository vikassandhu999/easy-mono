import {Button, ErrorMessage, FieldError, Form, Input, Label, Spinner, TextField, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

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
      applyFormErrors(err, "Value wasn't saved. Try again", form.setError);
    }
  };

  if (editing) {
    return (
      <Form
        className="flex items-center gap-2 border-t border-divider px-4 py-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Typography
          className="w-20 shrink-0"
          color="muted"
          type="body-sm"
        >
          {label}
        </Typography>
        <div className="min-w-0 flex-1">
          <Controller
            control={form.control}
            name="value"
            render={({field}) => (
              <TextField
                className="w-full"
                isInvalid={!!form.formState.errors.value}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type={inputType}
                value={field.value}
              >
                <Label className="sr-only">{label}</Label>
                {form.formState.errors.value ? <FieldError>{form.formState.errors.value.message}</FieldError> : null}
                <Input />
              </TextField>
            )}
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
        {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}
      </Form>
    );
  }

  return (
    <div className="flex min-h-11 items-center border-t border-divider px-4 py-3">
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
