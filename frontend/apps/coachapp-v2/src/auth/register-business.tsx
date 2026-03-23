import {Button, Input, Label, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useExchangeTokenMutation} from '@/api/auth';
import {getRefreshToken, setTokens} from '@/api/authStorage';
import {useCreateBusinessMutation} from '@/api/business';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const schema = z.object({
  name: z.string().min(1, 'Business name is required').max(100, 'Name is too long'),
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle is too long')
    .regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, hyphens and underscores'),
});

type RegisterBusinessFormValues = z.infer<typeof schema>;

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [createBusiness, {isLoading: isCreating}] = useCreateBusinessMutation();
  const [exchangeToken, {isLoading: isExchanging}] = useExchangeTokenMutation();
  const isLoading = isCreating || isExchanging;

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
  } = useForm<RegisterBusinessFormValues>({
    resolver: zodResolver(schema),
  });

  const nameValue = watch('name');

  const generateHandle = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
  };

  const onSubmit = async (data: RegisterBusinessFormValues) => {
    try {
      await createBusiness({name: data.name, handle: data.handle}).unwrap();

      // Exchange guest token for coach token that contains the business_id
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const tokens = await exchangeToken({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          role: 'coach',
        }).unwrap();
        setTokens(tokens);
      }

      navigate(ROUTES.DASHBOARD, {replace: true});
    } catch (err) {
      applyFormErrors(err, 'Failed to register business. Please try again.', setError);
    }
  };

  return (
    <AuthLayout
      description="Set up your coaching business to get started."
      title="Register your business"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Business name</Label>
          <Input
            autoComplete="organization"
            id="name"
            placeholder="Peak Performance Coaching"
            {...register('name', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const handle = generateHandle(e.target.value);
                setValue('handle', handle, {shouldValidate: !!nameValue});
              },
            })}
          />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="handle">Handle</Label>
          <Input
            id="handle"
            placeholder="peak-performance"
            {...register('handle')}
          />
          <p className="text-xs text-foreground-400">This will be your unique URL identifier</p>
          {errors.handle && <p className="text-xs text-danger">{errors.handle.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

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
              Creating business...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
