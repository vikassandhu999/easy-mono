import {
  Button,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import {allowedStatusesFor, type AllowedUpdateStatus, type Client} from '@/api/clients';

const STATUS_LABELS: Record<AllowedUpdateStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  inactive: 'Inactive',
};

export const editClientFormSchema = z.object({
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export type EditClientFormValues = z.infer<typeof editClientFormSchema>;

export const EDIT_CLIENT_FORM_FIELDS = ['email', 'first_name', 'last_name', 'notes', 'phone', 'status'] as const;

export function useEditClientForm(options?: {values?: EditClientFormValues}) {
  return useForm<EditClientFormValues>({
    resolver: zodResolver(editClientFormSchema),
    values: options?.values,
  });
}

type EditClientFormProps = {
  client: Client;
  form: ReturnType<typeof useEditClientForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: EditClientFormValues) => void;
};

export default function EditClientForm({client, form, isSubmitting, onCancel, onSubmit}: EditClientFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Client details</Fieldset.Legend>
        <Fieldset.Group>
          <Fieldset.Group>
            <Controller
              control={control}
              name="first_name"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.first_name}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>First name (optional)</Label>
                  {errors.first_name && <FieldError>{errors.first_name.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="last_name"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.last_name}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Last name (optional)</Label>
                  {errors.last_name && <FieldError>{errors.last_name.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </Fieldset.Group>

          <Fieldset.Group>
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
                  <Input />
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
                  {errors.email && <FieldError>{errors.email.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </Fieldset.Group>

          {client.status === 'pending' ? null : (
            <Controller
              control={control}
              name="status"
              render={({field}) => {
                const statusOptions = allowedStatusesFor(client.status);
                return (
                  <Select
                    isInvalid={!!errors.status}
                    onSelectionChange={(key) => field.onChange(key ?? undefined)}
                    selectedKey={field.value || null}
                  >
                    <Label>Status (optional)</Label>
                    {errors.status && <FieldError>{errors.status.message}</FieldError>}
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {statusOptions.map((value) => (
                          <ListBox.Item
                            id={value}
                            key={value}
                            textValue={STATUS_LABELS[value]}
                          >
                            {STATUS_LABELS[value]}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                );
              }}
            />
          )}

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
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
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
              Saving changes
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </Fieldset.Actions>
    </Form>
  );
}
