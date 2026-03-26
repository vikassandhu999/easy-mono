import {Button, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {z} from 'zod';

import PageLayout from '@/@components/page-layout';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';

const schema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
});

type EditClientFormValues = z.infer<typeof schema>;

export default function EditClient() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isLoading: isFetching} = useGetClientQuery(id!);
  const [updateClient, {isLoading: isUpdating}] = useUpdateClientMutation();

  const client = data?.data;
  const backPath = `/clients/${id}`;

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<EditClientFormValues>({
    resolver: zodResolver(schema),
    values: client
      ? {
          first_name: client.first_name ?? '',
          last_name: client.last_name ?? '',
          notes: client.notes ?? '',
          phone: client.phone ?? '',
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
      await updateClient({body: formData, id: id!}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update client. Please try again.', setError);
    }
  };

  return (
    <PageLayout
      description={client.email ?? undefined}
      title="Edit Client"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(backPath)}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first_name">First name</Label>
            <Input
              autoComplete="given-name"
              id="first_name"
              placeholder="Jane"
              {...register('first_name')}
            />
            {errors.first_name && <p className="text-xs text-danger">{errors.first_name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              autoComplete="family-name"
              id="last_name"
              placeholder="Doe"
              {...register('last_name')}
            />
            {errors.last_name && <p className="text-xs text-danger">{errors.last_name.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            autoComplete="tel"
            id="phone"
            placeholder="+1 (555) 000-0000"
            type="tel"
            {...register('phone')}
          />
          {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <TextArea
            id="notes"
            placeholder="Any notes about this client..."
            rows={4}
            {...register('notes')}
          />
          {errors.notes && <p className="text-xs text-danger">{errors.notes.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

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
