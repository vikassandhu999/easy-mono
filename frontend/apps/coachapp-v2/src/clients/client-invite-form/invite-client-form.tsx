import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

export const inviteClientFormSchema = z
  .object({
    email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
    name: z.string().min(1, 'Enter client name'),
    notes: z.string().optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.email && data.email.length > 0) || (data.phone && data.phone.length > 0)) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Add email or phone',
      path: ['email'],
    });
  });

export type InviteClientFormValues = z.infer<typeof inviteClientFormSchema>;

export const INVITE_CLIENT_FORM_FIELDS = ['email', 'name', 'notes', 'phone'] as const;

export function useInviteClientForm() {
  return useForm<InviteClientFormValues>({
    defaultValues: {
      email: '',
      name: '',
      notes: '',
      phone: '',
    },
    resolver: zodResolver(inviteClientFormSchema),
  });
}

type InviteClientFormProps = {
  form: ReturnType<typeof useInviteClientForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: InviteClientFormValues) => void;
};

export default function InviteClientForm({form, isSubmitting, onCancel, onSubmit}: InviteClientFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Client details</Fieldset.Legend>
        <Description>Add a name and at least one contact method</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.name}
                isRequired
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Name (required)</Label>
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <Input autoComplete="name" />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.email}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="email"
                value={field.value ?? ''}
              >
                <Label>Email (optional)</Label>
                <Description>Add email or phone so the client can receive the invite</Description>
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
                <Input autoComplete="email" />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.phone}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="tel"
                value={field.value ?? ''}
              >
                <Label>Phone (optional)</Label>
                {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
                <Input autoComplete="tel" />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.notes}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Notes (optional)</Label>
                <Description>Add private notes about this client</Description>
                {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                <TextArea rows={3} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <Fieldset.Actions>
        <Button
          isPending={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Sending invite
            </>
          ) : (
            'Send invite'
          )}
        </Button>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
      </Fieldset.Actions>
    </Form>
  );
}
