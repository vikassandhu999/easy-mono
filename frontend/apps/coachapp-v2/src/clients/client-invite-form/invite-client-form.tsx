import {Description, ErrorMessage, Fieldset, ListBox} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Send} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {
  FieldRow,
  FormActions,
  FormLayout,
  FormSelectField,
  FormTextAreaField,
  FormTextField,
} from '@/@components/form-fields';
import {useGetBillingQuery} from '@/api/billing';
import type {ClientInviteRequest} from '@/api/clients';
import {useGetCoachProfileQuery} from '@/api/profile';
import {toOptionalText} from '@/api/shared';
import {type TeamMember, useGetTeamQuery} from '@/api/team';
import {splitName} from '@/clients/lib/invite-client';

export const inviteClientFormSchema = z
  .object({
    assigned_trainer_id: z.string().optional(),
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

function memberName(member: TeamMember): string {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
}

export function inviteClientToRequest(values: InviteClientFormValues): ClientInviteRequest {
  const {firstName, lastName} = splitName(values.name);
  return {
    email: toOptionalText(values.email),
    first_name: firstName,
    last_name: lastName,
    notes: toOptionalText(values.notes),
    phone: toOptionalText(values.phone),
  };
}

export function useInviteClientForm() {
  return useForm<InviteClientFormValues>({
    defaultValues: {
      assigned_trainer_id: undefined,
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

  const {data: billing} = useGetBillingQuery();
  const isOwner = billing?.data.is_owner ?? false;
  const {data: team} = useGetTeamQuery(undefined, {skip: !isOwner});
  const activeTrainers = (team?.data ?? []).filter((member) => member.status === 'active');
  const {data: profile} = useGetCoachProfileQuery();
  // Unassigned means "the acting coach keeps this client", so the empty select
  // reads as the coach themself rather than a bare "Select an item".
  const selfLabel = `${[profile?.data.first_name, profile?.data.last_name].filter(Boolean).join(' ') || 'You'} (you)`;

  return (
    <FormLayout
      className="flex-1"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="bg-transparent p-0 sm:rounded-card sm:border sm:border-border sm:bg-surface sm:p-6">
        <Fieldset>
          <Fieldset.Legend className="hidden sm:block">Client details</Fieldset.Legend>
          <Description>Add an email or phone number so the client can receive the invite.</Description>

          <Fieldset.Group>
            <FormTextField
              control={control}
              fullWidth
              inputProps={{
                autoComplete: 'name',
                className: 'min-h-11 border border-border bg-surface shadow-none sm:min-h-10',
                placeholder: 'Jordan Miles',
              }}
              isRequired
              label="Name"
              name="name"
            />

            <FieldRow>
              <FormTextField
                control={control}
                fullWidth
                inputProps={{
                  autoComplete: 'email',
                  className: 'min-h-11 border border-border bg-surface shadow-none sm:min-h-10',
                  placeholder: 'name@email.com',
                }}
                label="Email"
                name="email"
                type="email"
              />
              <FormTextField
                control={control}
                fullWidth
                inputProps={{
                  autoComplete: 'tel',
                  className: 'min-h-11 border border-border bg-surface shadow-none sm:min-h-10',
                  placeholder: '+1 (555) 000-0000',
                }}
                label="Phone"
                name="phone"
                type="tel"
              />
            </FieldRow>

            {isOwner && activeTrainers.length > 0 ? (
              <FormSelectField
                control={control}
                description="Leave as-is to keep yourself assigned."
                descriptionClassName="hidden sm:block"
                label="Assigned trainer"
                name="assigned_trainer_id"
                placeholder={selfLabel}
                triggerProps={{
                  className: 'min-h-11 border border-border bg-surface shadow-none sm:min-h-10',
                }}
              >
                {activeTrainers.map((member) => (
                  <ListBox.Item
                    className="min-h-11 sm:min-h-9"
                    id={member.id}
                    key={member.id}
                    textValue={memberName(member)}
                  >
                    {memberName(member)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </FormSelectField>
            ) : null}

            <FormTextAreaField
              control={control}
              fullWidth
              label="Notes"
              name="notes"
              textAreaProps={{
                className: 'min-h-20 border border-border bg-surface shadow-none',
                placeholder: 'Goals, injuries, preferences, or anything the client mentioned…',
                rows: 3,
              }}
            />
          </Fieldset.Group>
        </Fieldset>
      </div>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitIcon={<Send className="size-4" />}
        submitLabel="Send invite"
        submittingLabel="Sending invite"
      />
    </FormLayout>
  );
}
