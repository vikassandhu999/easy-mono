import {Button, Input, Label, ListBox, Select, Spinner, TextArea, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';
import {useParams} from 'react-router-dom';
import {z} from 'zod';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {allowedStatusesFor, type AllowedUpdateStatus, useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';

const STATUS_LABELS: Record<AllowedUpdateStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

const schema = z.object({
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

type EditClientFormValues = z.infer<typeof schema>;

// Schema fields — see applyFormErrors docstring for why this matters.
const KNOWN_FIELDS = ['email', 'first_name', 'last_name', 'notes', 'phone', 'status'] as const;

export default function EditClient() {
  const {id} = useParams<{id: string}>();
  const backPath = `/clients/${id}`;
  const goBack = useGoBack(backPath);

  const {data, isLoading: isFetching} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();
  const client = data?.data;

  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<EditClientFormValues>({
    resolver: zodResolver(schema),
    values: client
      ? {
          email: client.email ?? '',
          first_name: client.first_name ?? '',
          last_name: client.last_name ?? '',
          notes: client.notes ?? '',
          phone: client.phone ?? '',
          // Pending is not a valid PATCH value — leave the status field
          // undefined for pending clients. The UI hides the dropdown anyway.
          status: client.status === 'pending' ? undefined : client.status,
        }
      : undefined,
  });

  if (isFetching || !client) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit client</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  const onSubmit = async (formData: EditClientFormValues) => {
    try {
      await updateClient({
        body: {
          email: formData.email || null,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          notes: formData.notes || null,
          phone: formData.phone || null,
          status: formData.status,
        },
        id: id!,
      }).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Client wasn't updated. Check the details and try again", setError, KNOWN_FIELDS);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit client</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Client
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <form
          className="flex max-w-lg flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                placeholder="Vikas"
                {...register('first_name')}
              />
              {errors.first_name ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.first_name.message}
                </Typography>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                placeholder="Sandhu"
                {...register('last_name')}
              />
              {errors.last_name ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.last_name.message}
                </Typography>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                type="tel"
                {...register('phone')}
              />
              {errors.phone ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.phone.message}
                </Typography>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="vikas@email.com"
                type="email"
                {...register('email')}
              />
              {errors.email ? (
                <Typography
                  className="text-danger"
                  type="body-xs"
                >
                  {errors.email.message}
                </Typography>
              ) : null}
            </div>
          </div>

          {/*
          Per v2 spec: no dropdown for pending clients — the status is
          locked at Pending until the client accepts the invitation (or the
          coach revokes via the invitation widget). For all other statuses,
          show only the three valid transitions from allowedStatusesFor().
        */}
          {client.status === 'pending' ? null : (
            <Controller
              control={control}
              name="status"
              render={({field}) => {
                const statusOptions = allowedStatusesFor(client.status);
                return (
                  <Select
                    onSelectionChange={(key) => field.onChange(key)}
                    selectedKey={field.value || null}
                  >
                    <Label>Status</Label>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <TextArea
              id="notes"
              placeholder="Any notes about this client..."
              rows={3}
              {...register('notes')}
            />
          </div>

          {errors.root ? (
            <Typography
              className="text-danger"
              type="body-sm"
            >
              {errors.root.message}
            </Typography>
          ) : null}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              onPress={goBack}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              isPending={isUpdating}
              type="submit"
            >
              {isUpdating ? (
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
          </div>
        </form>
      </Page.Content>
    </Page>
  );
}
