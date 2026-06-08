import {Button, Description, ErrorMessage, Fieldset, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormTextAreaField, FormTextField} from '@/@components/form-fields';

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
          <FormTextField
            control={control}
            fullWidth
            inputProps={{autoComplete: 'name'}}
            isRequired
            label="Name (required)"
            name="name"
          />

          <FormTextField
            control={control}
            description="Add email or phone so the client can receive the invite"
            fullWidth
            inputProps={{autoComplete: 'email'}}
            label="Email (optional)"
            name="email"
            type="email"
          />

          <FormTextField
            control={control}
            fullWidth
            inputProps={{autoComplete: 'tel'}}
            label="Phone (optional)"
            name="phone"
            type="tel"
          />

          <FormTextAreaField
            control={control}
            description="Add private notes about this client"
            fullWidth
            label="Notes (optional)"
            name="notes"
            textAreaProps={{rows: 3}}
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
