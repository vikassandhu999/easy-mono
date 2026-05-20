import {Button, Description, ErrorMessage, FieldError, Form, Input, Label, Spinner, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useExchangeTokenMutation} from '@/api/auth';
import {getRefreshToken, setTokens} from '@/api/authStorage';
import {useCreateBusinessMutation} from '@/api/business';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

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
  const [createBusiness, {isLoading: isCreating}] = useCreateBusinessMutation();
  const [exchangeToken, {isLoading: isExchanging}] = useExchangeTokenMutation();
  const isLoading = isCreating || isExchanging;

  const form = useForm<RegisterBusinessFormValues>({
    defaultValues: {handle: '', name: ''},
    resolver: zodResolver(schema),
  });

  const nameValue = useWatch({control: form.control, name: 'name'});

  const onSubmit = async (data: RegisterBusinessFormValues) => {
    try {
      await createBusiness({name: data.name, handle: data.handle}).unwrap();

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
        <Controller
          control={form.control}
          name="name"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!form.formState.errors.name}
              name={field.name}
              onBlur={field.onBlur}
              onChange={(value) => {
                field.onChange(value);
                const handle = generateHandle(value);
                form.setValue('handle', handle, {shouldValidate: !!nameValue});
              }}
              value={field.value}
            >
              <Label>Business name</Label>
              {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
              <Input autoComplete="organization" />
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="handle"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!form.formState.errors.handle}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value}
            >
              <Label>Handle</Label>
              <Description>This will be your unique URL identifier</Description>
              {form.formState.errors.handle && <FieldError>{form.formState.errors.handle.message}</FieldError>}
              <Input />
            </TextField>
          )}
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
