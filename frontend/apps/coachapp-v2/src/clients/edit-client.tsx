import {Button, Input, Label, ListBox, Select, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {z} from 'zod';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {type ClientStatus, useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';

// ── Schema ───────────────────────────────────────────────────

const STATUS_OPTIONS: {label: string; value: ClientStatus}[] = [
  {label: 'Active', value: 'active'},
  {label: 'Pending', value: 'pending'},
  {label: 'Inactive', value: 'inactive'},
  {label: 'Archived', value: 'archived'},
];

const schema = z.object({
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'pending', 'inactive', 'archived']).optional(),
});

type EditClientFormValues = z.infer<typeof schema>;

// ── Component ────────────────────────────────────────────────

export default function EditClient() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(`/clients/${id}`);

  const {data, isLoading: isFetching} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();
  const client = data?.data;
  const backPath = `/clients/${id}`;

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
          status: client.status,
        }
      : undefined,
  });

  if (isFetching || !client) {
    return (
      <PageLayout title="Edit Client">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
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
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update client.', setError);
    }
  };

  return (
    <PageLayout title="Edit Client">
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <form
        className="flex max-w-lg flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* ── Name ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              placeholder="Vikas"
              {...register('first_name')}
            />
            {errors.first_name ? <p className="text-xs text-danger">{errors.first_name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              placeholder="Sandhu"
              {...register('last_name')}
            />
            {errors.last_name ? <p className="text-xs text-danger">{errors.last_name.message}</p> : null}
          </div>
        </div>

        {/* ── Contact ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="+91 98765 43210"
              type="tel"
              {...register('phone')}
            />
            {errors.phone ? <p className="text-xs text-danger">{errors.phone.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="vikas@email.com"
              type="email"
              {...register('email')}
            />
            {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
          </div>
        </div>

        {/* ── Status ──────────────────────────────────────── */}
        <Controller
          control={control}
          name="status"
          render={({field}) => (
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
                  {STATUS_OPTIONS.map((opt) => (
                    <ListBox.Item
                      id={opt.value}
                      key={opt.value}
                      textValue={opt.label}
                    >
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        />

        {/* ── Notes ───────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <TextArea
            id="notes"
            placeholder="Any notes about this client..."
            rows={3}
            {...register('notes')}
          />
        </div>

        {/* ── Form errors + actions ──────────────────────── */}
        {errors.root ? <p className="text-sm text-danger">{errors.root.message}</p> : null}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            onPress={() => navigate(backPath)}
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
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
