import {FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
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
    <form
      className={'flex flex-col gap-4'}
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <Controller
        control={control}
        name="full_name"
        render={({field, fieldState}) => (
          <TextField
            {...field}
            isInvalid={fieldState.invalid}
            isRequired
          >
            <Label>Client name</Label>
            <Input />
            {fieldState.error?.message && <FieldError>{fieldState.error?.message}</FieldError>}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({field, fieldState}) => (
          <TextField
            {...field}
            isInvalid={fieldState.invalid}
            isRequired
          >
            <Label>Email</Label>
            <Input />
            {fieldState.error?.message && <FieldError>{fieldState.error?.message}</FieldError>}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({field, fieldState}) => (
          <TextField
            {...field}
            isInvalid={fieldState.invalid}
            type="tel"
          >
            <Label>Phone number</Label>
            <Input />
            {fieldState.error?.message && <FieldError>{fieldState.error?.message}</FieldError>}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({field, fieldState}) => (
          <TextField
            {...field}
            isInvalid={fieldState.invalid}
          >
            <Label>Notes</Label>
            <TextArea rows={6} />
            {fieldState.error?.message && <FieldError>{fieldState.error?.message}</FieldError>}
          </TextField>
        )}
      />
    </form>
  );
});

ClientInviteForm.displayName = 'ClientInviteForm';
