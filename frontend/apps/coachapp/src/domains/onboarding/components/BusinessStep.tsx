import {humanizeError} from '@easy/error-parser';
import {Button, FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';

import {useCreateBusinessMutation} from '@/services/business/business';
import {BusinessCreateForm_zod, type BusinessCreateFormValues} from '@/services/business/business_definition';
import {notifyError} from '@/utils/notification';

interface BusinessStepProps {
  onComplete: () => void;
}

/**
 * Onboarding Step 1: Create business.
 * Fields: name (required), handle (required), about (optional).
 */
const BusinessStep: React.FC<BusinessStepProps> = ({onComplete}) => {
  const [createBusiness] = useCreateBusinessMutation();

  const {control, handleSubmit, formState, watch, setValue} = useForm<BusinessCreateFormValues>({
    defaultValues: {
      name: '',
      handle: '',
      about: '',
    },
    resolver: zodResolver(BusinessCreateForm_zod),
    mode: 'onBlur',
  });

  const isSubmitting = formState.isSubmitting;

  // Auto-generate handle from name
  const nameValue = watch('name');
  React.useEffect(() => {
    // Only auto-generate if handle hasn't been manually edited
    if (!formState.dirtyFields.handle) {
      const generated = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 30);
      setValue('handle', generated);
    }
  }, [nameValue, formState.dirtyFields.handle, setValue]);

  const onSubmit = async (values: BusinessCreateFormValues) => {
    try {
      await createBusiness({
        name: values.name,
        handle: values.handle,
        about: values.about || undefined,
      }).unwrap();
      onComplete();
    } catch (err) {
      const errMsg = humanizeError(err);
      notifyError(errMsg);
    }
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Create your business</h2>
        <p className="mb-6 text-sm text-neutral-500">This is how clients will find and recognize you.</p>

        <div className="flex flex-col gap-5">
          {/* Business name */}
          <Controller
            control={control}
            name="name"
            render={({field, fieldState}) => (
              <TextField
                {...field}
                isInvalid={fieldState.invalid}
                isRequired
              >
                <Label className="text-sm font-medium">Business name</Label>
                <Input placeholder="e.g. Peak Performance Coaching" />
                {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />

          {/* Handle */}
          <Controller
            control={control}
            name="handle"
            render={({field, fieldState}) => (
              <TextField
                {...field}
                isInvalid={fieldState.invalid}
                isRequired
              >
                <Label className="text-sm font-medium">Handle</Label>
                <Input placeholder="e.g. peak_performance" />
                <p className="mt-1 text-xs text-neutral-400">
                  Lowercase letters, numbers, and underscores only. This will be your unique identifier.
                </p>
                {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />

          {/* About */}
          <Controller
            control={control}
            name="about"
            render={({field, fieldState}) => (
              <TextField
                {...field}
                isInvalid={fieldState.invalid}
                value={field.value ?? ''}
              >
                <Label className="text-sm font-medium">About</Label>
                <TextArea
                  placeholder="Tell clients what your business is about..."
                  rows={3}
                />
                {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />
        </div>
      </div>

      <Button
        className="w-full"
        isDisabled={isSubmitting}
        type="submit"
      >
        Continue
        <IconArrowRight size={18} />
      </Button>
    </form>
  );
};

export default BusinessStep;
