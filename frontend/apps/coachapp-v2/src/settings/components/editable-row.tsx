import {Button, Input, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {applyFormErrors} from '@/api/shared';

const schema = z.object({
  value: z.string().min(1, 'Required'),
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

  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const startEdit = () => {
    reset({value: value || ''});
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    reset();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await onSave(data.value);
      setEditing(false);
    } catch (err) {
      applyFormErrors(err, 'Failed to save. Try again.', setError);
    }
  };

  const errorMessage = errors.value?.message || errors.root?.message;

  if (editing) {
    return (
      <form
        className="flex items-center gap-2 border-t border-divider px-4 py-2"
        onSubmit={handleSubmit(onSubmit)}
      >
        <span className="w-20 shrink-0 text-sm text-foreground-400">{label}</span>
        <div className="min-w-0 flex-1">
          <Input
            autoFocus
            className="w-full"
            isInvalid={!!errorMessage}
            size="sm"
            type={inputType}
            {...register('value')}
          />
          {errorMessage && <p className="mt-0.5 text-xs text-danger">{errorMessage}</p>}
        </div>
        <Button
          isPending={isSubmitting}
          size="sm"
          type="submit"
        >
          {isSubmitting ? (
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
      </form>
    );
  }

  return (
    <div className="flex min-h-11 items-center border-t border-divider px-4 py-3">
      <span className="w-20 shrink-0 text-sm text-foreground-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{value || '\u2014'}</span>
      <button
        className="shrink-0 text-sm text-accent"
        onClick={startEdit}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}
