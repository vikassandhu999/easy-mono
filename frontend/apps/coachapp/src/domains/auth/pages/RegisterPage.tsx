import {humanizeError} from '@easy/error-parser';
import {Avatar, Button, FieldError, Input, Label, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useDebouncedValue} from '@mantine/hooks';
import {IconArrowRight, IconCheck, IconX} from '@tabler/icons-react';
import React, {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {
  BusinessInfo_zod,
  BusinessInfoRequest,
  PersonalInfo_zod,
  PersonalInfoRequest,
  useCheckEmailMutation,
  useCheckHandleMutation,
  useRegisterMutation,
} from '@/services/auth';
import {notifyError} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

type RegistrationStep = 'business' | 'personal';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stepFromParams = searchParams.get('step') as null | RegistrationStep;
  const currentStep: RegistrationStep = stepFromParams === 'business' ? 'business' : 'personal';

  const storedEmail = searchParams.get('email') || '';
  const storedFirstName = searchParams.get('first_name') || '';
  const storedLastName = searchParams.get('last_name') || '';

  const [registerMutation, {isLoading: isRegistering}] = useRegisterMutation();
  const [checkEmail] = useCheckEmailMutation();
  const [checkHandle] = useCheckHandleMutation();

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);

  // Personal Info Form (Step 1)
  const personalForm = useForm<PersonalInfoRequest>({
    defaultValues: {
      email: storedEmail,
      first_name: storedFirstName,
      last_name: storedLastName,
    },
    resolver: zodResolver(PersonalInfo_zod),
  });

  // Business Info Form (Step 2)
  const businessForm = useForm<BusinessInfoRequest>({
    defaultValues: {
      business_name: '',
      business_handle: '',
    },
    resolver: zodResolver(BusinessInfo_zod),
  });

  // Watch email for debounced availability check
  const watchedEmail = personalForm.watch('email');
  const [debouncedEmail] = useDebouncedValue(watchedEmail, 500);

  // Watch handle for debounced availability check
  const watchedHandle = businessForm.watch('business_handle');
  const [debouncedHandle] = useDebouncedValue(watchedHandle, 500);

  // Check email availability
  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (!debouncedEmail || debouncedEmail.length < 5 || !debouncedEmail.includes('@')) {
        setEmailAvailable(null);
        return;
      }

      // Validate email format first
      const emailRegex = /^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
      if (!emailRegex.test(debouncedEmail)) {
        setEmailAvailable(null);
        return;
      }

      setEmailChecking(true);
      try {
        const result = await checkEmail({email: debouncedEmail}).unwrap();
        setEmailAvailable(result.available);
      } catch {
        setEmailAvailable(null);
      } finally {
        setEmailChecking(false);
      }
    };

    checkEmailAvailability();
  }, [debouncedEmail, checkEmail]);

  // Check handle availability
  useEffect(() => {
    const checkHandleAvailability = async () => {
      if (!debouncedHandle || debouncedHandle.length < 2) {
        setHandleAvailable(null);
        return;
      }

      // Validate handle format first
      const handleRegex = /^[a-zA-Z0-9_-]{2,32}$/;
      if (!handleRegex.test(debouncedHandle)) {
        setHandleAvailable(null);
        return;
      }

      setHandleChecking(true);
      try {
        const result = await checkHandle({handle: debouncedHandle}).unwrap();
        setHandleAvailable(result.available);
      } catch {
        setHandleAvailable(null);
      } finally {
        setHandleChecking(false);
      }
    };

    checkHandleAvailability();
  }, [debouncedHandle, checkHandle]);

  // Handle Step 1 submission
  const onPersonalSubmit = async (values: PersonalInfoRequest) => {
    // Ensure email is available before proceeding
    if (emailAvailable === false) {
      personalForm.setError('email', {message: 'This email is already associated with an account'});
      return;
    }

    // Store values in URL and move to step 2
    const params = new URLSearchParams();
    params.set('step', 'business');
    params.set('email', values.email);
    params.set('first_name', values.first_name);
    params.set('last_name', values.last_name);
    setSearchParams(params);
  };

  // Handle Step 2 submission (final registration)
  const onBusinessSubmit = async (values: BusinessInfoRequest) => {
    // Ensure handle is available before proceeding
    if (handleAvailable === false) {
      businessForm.setError('business_handle', {message: 'This handle is already taken'});
      return;
    }

    try {
      const registerData = {
        email: storedEmail,
        first_name: storedFirstName,
        last_name: storedLastName,
        business_name: values.business_name,
        business_handle: values.business_handle,
      };

      const resp = await registerMutation(registerData).unwrap();

      const params = new URLSearchParams([
        ['token_id', resp.token.token_id],
        ['email', storedEmail],
      ]);
      navigate('/register/verify?' + params.toString());
    } catch (err) {
      const errMsg = humanizeError(err);
      notifyError(errMsg);
    }
  };

  // Go back to step 1
  const handleBack = () => {
    const params = new URLSearchParams();
    params.set('step', 'personal');
    params.set('email', storedEmail);
    params.set('first_name', storedFirstName);
    params.set('last_name', storedLastName);
    setSearchParams(params);
  };

  // Render availability indicator
  const renderAvailabilityIndicator = (checking: boolean, available: boolean | null) => {
    if (checking) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />;
    }
    if (available === true) {
      return (
        <IconCheck
          color="green"
          size={16}
        />
      );
    }
    if (available === false) {
      return (
        <IconX
          color="red"
          size={16}
        />
      );
    }
    return null;
  };

  const isPersonalFormLoading = personalForm.formState.isSubmitting;
  const isBusinessFormLoading = isRegistering || businessForm.formState.isSubmitting;

  // Step 1: Personal Information
  if (currentStep === 'personal') {
    return (
      <AuthLayout
        subtitle="Let's get started."
        title="Create Account"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={personalForm.handleSubmit(onPersonalSubmit)}
        >
          <Controller
            control={personalForm.control}
            name="first_name"
            render={({field, fieldState}) => (
              <TextField
                {...field}
                isInvalid={fieldState.invalid}
              >
                <Label className="text-md font-medium">First Name</Label>
                <Input placeholder="James" />
                {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />

          <Controller
            control={personalForm.control}
            name="last_name"
            render={({field, fieldState}) => (
              <TextField
                {...field}
                isInvalid={fieldState.invalid}
              >
                <Label className="text-md font-medium">Last Name</Label>
                <Input placeholder="Smith" />
                {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
              </TextField>
            )}
          />

          <div className="relative">
            <Controller
              control={personalForm.control}
              name="email"
              render={({field, fieldState}) => (
                <TextField
                  {...field}
                  isInvalid={fieldState.invalid || emailAvailable === false}
                >
                  <Label className="text-md font-medium">Email Address</Label>
                  <Input placeholder="james@example.com" />
                  {(fieldState.error?.message ||
                    (emailAvailable === false && 'This email is already associated with an account')) && (
                    <FieldError>
                      {fieldState.error?.message || 'This email is already associated with an account'}
                    </FieldError>
                  )}
                </TextField>
              )}
            />
            {emailChecking || emailAvailable !== null ? (
              <div className="absolute right-3 top-9">{renderAvailabilityIndicator(emailChecking, emailAvailable)}</div>
            ) : null}
          </div>

          {emailAvailable === false && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                An account already exists with this email.{' '}
                <button
                  className="text-primary cursor-pointer bg-transparent border-none p-0"
                  onClick={() => navigate('/login')}
                  type="button"
                >
                  Login instead?
                </button>
              </p>
            </div>
          )}

          <Button
            className="w-full"
            isDisabled={isPersonalFormLoading || emailAvailable !== true || emailChecking}
            type="submit"
          >
            Continue
            <IconArrowRight size={20} />
          </Button>

          <p className="text-center text-md text-muted">
            Already have an account?{' '}
            <button
              className="text-primary cursor-pointer bg-transparent border-none p-0"
              onClick={() => navigate('/login')}
              type="button"
            >
              Login
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  // Step 2: Business Information
  return (
    <AuthLayout
      subtitle="Now let's set up your business"
      title="Business Details"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={businessForm.handleSubmit(onBusinessSubmit)}
      >
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Avatar
                className="shrink-0"
                size="md"
              >
                <Avatar.Fallback>
                  {storedFirstName.charAt(0)}
                  {storedLastName.charAt(0)}
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">
                  {storedFirstName} {storedLastName}
                </p>
                <p className="text-xs text-muted">{storedEmail}</p>
              </div>
            </div>
            <button
              className="text-xs text-primary cursor-pointer bg-transparent border-none p-0"
              onClick={handleBack}
              type="button"
            >
              Edit
            </button>
          </div>
        </div>

        <Controller
          control={businessForm.control}
          name="business_name"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
            >
              <Label className="text-md font-medium">Business Name</Label>
              <Input placeholder="Elite Fitness Coaching" />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        <div className="relative">
          <Controller
            control={businessForm.control}
            name="business_handle"
            render={({field, fieldState}) => (
              <TextField
                {...field}
                isInvalid={fieldState.invalid || handleAvailable === false}
              >
                <Label className="text-md font-medium">Business Handle</Label>
                <Input placeholder="elite_fitness" />
                <p className="text-sm text-muted mt-1">
                  Your unique URL: coacheasy.com/<strong>{watchedHandle || 'your-handle'}</strong>
                </p>
                {(fieldState.error?.message || (handleAvailable === false && 'This handle is already taken')) && (
                  <FieldError>{fieldState.error?.message || 'This handle is already taken'}</FieldError>
                )}
              </TextField>
            )}
          />
          {handleChecking || handleAvailable !== null ? (
            <div className="absolute right-3 top-9">{renderAvailabilityIndicator(handleChecking, handleAvailable)}</div>
          ) : null}
        </div>

        <Button
          className="w-full"
          isDisabled={isBusinessFormLoading || handleAvailable === false}
          type="submit"
        >
          Create Account
          <IconArrowRight size={20} />
        </Button>

        <p className="text-xs italic text-muted text-center">
          By continuing, you agree to our{' '}
          <a
            className="text-primary underline"
            href="/terms"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            className="text-primary underline"
            href="/privacy"
          >
            Privacy Policy
          </a>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
