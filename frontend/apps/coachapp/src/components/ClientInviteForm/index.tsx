import {zodResolver} from '@hookform/resolvers/zod';
import {Stack, Textarea, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {forwardRef, useImperativeHandle} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {InviteClient_zod, InviteClientProps} from '@/services/clients';

export interface ClientInviteFormHandle {
  submit: () => Promise<void>;
}

interface ClientInviteFormProps {
  onSubmit: (data: InviteClientProps) => Promise<void>;
}

export const ClientInviteForm = forwardRef<ClientInviteFormHandle, ClientInviteFormProps>(({onSubmit}, ref) => {
  const {control, handleSubmit} = useForm<InviteClientProps>({
    defaultValues: {
      email: '',
      phone: undefined,
      full_name: '',
      notes: undefined,
    },
    resolver: zodResolver(InviteClient_zod),
  });

  const handleFormSubmit = async (values: InviteClientProps) => {
    try {
      await onSubmit(values);
    } catch (error) {
      notifications.show({
        autoClose: 3000,
        color: 'red',
        message: 'Failed to send invitation. Please try again.',
        title: 'Error',
      });
    }
  };

  useImperativeHandle(ref, () => ({
    submit: async () => {
      await handleSubmit(handleFormSubmit)();
    },
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Stack gap="md">
        <p
          style={{
            color: 'var(--ce-text-weak)',
            fontSize: 'var(--ce-font-size-tiny)',
            lineHeight: 'var(--ce-line-height-tiny)',
            margin: 0,
          }}
        >
          Your client will receive an email invitation to join your coaching program.
        </p>

        <Controller
          control={control}
          name="full_name"
          render={({field, fieldState}) => (
            <TextInput
              {...field}
              error={fieldState.error?.message}
              label="Client name"
              size={'md'}
              withAsterisk
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({field, fieldState}) => (
            <TextInput
              {...field}
              error={fieldState.error?.message}
              label="Email address"
              size={'md'}
              type="email"
              withAsterisk
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({field, fieldState}) => (
            <TextInput
              {...field}
              error={fieldState.error?.message}
              label="Phone number (optional)"
              onChange={(e) => field.onChange(e.target.value || undefined)}
              size={'md'}
              type="tel"
              value={field.value || ''}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({field, fieldState}) => (
            <Textarea
              {...field}
              error={fieldState.error?.message}
              label="Notes (optional)"
              onChange={(e) => field.onChange(e.target.value || undefined)}
              rows={4}
              size={'md'}
              value={field.value || ''}
            />
          )}
        />
      </Stack>
    </form>
  );
});

ClientInviteForm.displayName = 'ClientInviteForm';
