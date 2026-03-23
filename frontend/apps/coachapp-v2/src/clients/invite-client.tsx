import {Button, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useInviteClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
});

type InviteClientFormValues = z.infer<typeof schema>;

export default function InviteClient() {
  const navigate = useNavigate();
  const [inviteClient, {isLoading}] = useInviteClientMutation();

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<InviteClientFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: InviteClientFormValues) => {
    try {
      await inviteClient(data).unwrap();
      navigate(ROUTES.CLIENTS);
    } catch (err) {
      applyFormErrors(err, 'Failed to invite client. Please try again.', setError);
    }
  };

  return (
    <PageLayout
      description="Send an invitation to a new client."
      title="Invite Client"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.CLIENTS)}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <span className="text-danger">*</span>
          </Label>
          <Input
            autoComplete="email"
            id="email"
            placeholder="client@example.com"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

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
            rows={3}
            {...register('notes')}
          />
          {errors.notes && <p className="text-xs text-danger">{errors.notes.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            onPress={() => navigate(ROUTES.CLIENTS)}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            isPending={isLoading}
            type="submit"
          >
            {isLoading ? (
              <>
                <Spinner
                  color="current"
                  size="sm"
                />
                Sending invite...
              </>
            ) : (
              'Send Invite'
            )}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
