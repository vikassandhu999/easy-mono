import {Button, ErrorMessage, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, useWatch} from 'react-hook-form';
import {Navigate, useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {useCreateBusinessMutation, useExchangeTokenMutation, useGetCurrentBusinessQuery} from '@/api/auth';
import {getRefreshToken, setTokens} from '@/api/authStorage';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/auth-layout';
import {ROUTES} from '@/routes';
import {FormTextField} from '@/ui/form-text-field';

const schema = z.object({
  name: z.string().min(1, 'Enter business name').max(100, 'Use 100 characters or fewer'),
  handle: z
    .string()
    .min(3, 'Use at least 3 characters')
    .max(30, 'Use 30 characters or fewer')
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, hyphens, and underscores'),
});

type RegisterBusinessFormValues = z.infer<typeof schema>;

function generateHandle(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const createBusinessMutation = useCreateBusinessMutation();
  const exchangeTokenMutation = useExchangeTokenMutation();
  const isLoading = createBusinessMutation.isPending || exchangeTokenMutation.isPending;

  // Already-onboarded coaches shouldn't see the registration form again.
  const {data: business, isLoading: isCheckingBusiness} = useGetCurrentBusinessQuery();

  const form = useForm<RegisterBusinessFormValues>({
    defaultValues: {handle: '', name: ''},
    resolver: zodResolver(schema),
  });

  const nameValue = useWatch({control: form.control, name: 'name'});

  if (isCheckingBusiness) {
    return (
      <AuthLayout
        description="Set up your coaching business to get started."
        title="Register your business"
      >
        <div className="flex justify-center py-10">
          <Spinner color="accent" />
        </div>
      </AuthLayout>
    );
  }
  if (business?.data) {
    return (
      <Navigate
        replace
        to={ROUTES.DASHBOARD}
      />
    );
  }

  const onSubmit = async (data: RegisterBusinessFormValues) => {
    try {
      await createBusinessMutation.mutateAsync({name: data.name, handle: data.handle});

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const tokens = await exchangeTokenMutation.mutateAsync({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          role: 'coach',
        });
        setTokens(tokens);
      }

      navigate(ROUTES.DASHBOARD, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Business wasn't registered. Try again", form.setError);
    }
  };

  return (
    <AuthLayout
      description="Set up your coaching business to get started."
      title="Register your business"
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormTextField
          control={form.control}
          fullWidth
          inputProps={{autoComplete: 'organization'}}
          isRequired
          label="Business name"
          name="name"
          onValueChange={(value) => {
            const handle = generateHandle(value);
            form.setValue('handle', handle, {shouldValidate: !!nameValue});
          }}
        />

        <FormTextField
          control={form.control}
          description="This becomes your unique URL identifier."
          fullWidth
          isRequired
          label="Handle"
          name="handle"
        />

        {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}

        <Button
          fullWidth
          isPending={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Creating business
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </Form>
    </AuthLayout>
  );
}
