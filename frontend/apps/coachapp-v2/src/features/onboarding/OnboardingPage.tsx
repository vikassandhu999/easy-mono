import {Button, FieldError, Input, Label, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';
import {z} from 'zod';

import {getRefreshToken, setTokens, useExchangeTokenMutation} from '@/entities/auth/api/auth';
import {BusinessCreateRequest, useCreateBusinessMutation} from '@/entities/business/api/business';
import {useUpdateMyCoachMutation} from '@/entities/coach/api/coach';
import {handleFormError} from '@/shared/api/shared';

type OnboardingFormValues = BusinessCreateRequest & {
  coach_name: string;
  coach_title: string;
};

const schema = z.object({
  name: z.string().min(2),
  handle: z.string().min(2),
  coach_name: z.string().min(2),
  coach_title: z.string().min(2),
});

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [createBusiness, {isLoading: isCreatingBusiness}] = useCreateBusinessMutation();
  const [exchangeToken, {isLoading: isRefreshingToken}] = useExchangeTokenMutation();
  const [updateCoach, {isLoading: isUpdatingCoach}] = useUpdateMyCoachMutation();
  const {
    handleSubmit,
    register,
    formState: {errors},
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
  });
  const [formError, setFormError] = useState<null | string>(null);
  const [fieldErrors, setFieldErrors] = useState<null | Record<string, string[]>>(null);
  const [needsTokenRefresh, setNeedsTokenRefresh] = useState(false);
  const [pendingCoachProfile, setPendingCoachProfile] = useState<null | {
    coachName: string;
    coachTitle: string;
  }>(null);
  const isLoading = isCreatingBusiness || isRefreshingToken || isUpdatingCoach;
  const businessNameError = errors.name?.message || fieldErrors?.name?.[0];
  const businessHandleError = errors.handle?.message || fieldErrors?.handle?.[0];
  const coachNameError = errors.coach_name?.message || fieldErrors?.coach_name?.[0];
  const coachTitleError = errors.coach_title?.message || fieldErrors?.coach_title?.[0];

  const refreshCoachToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Missing refresh token.');
    }
    const refreshedTokens = await exchangeToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      role: 'coach',
    }).unwrap();
    setTokens(refreshedTokens);
  };

  const finalizeCoachProfile = async (profile?: null | {coachName: string; coachTitle: string}) => {
    const resolvedProfile = profile ?? pendingCoachProfile;
    if (!resolvedProfile) {
      return;
    }
    await updateCoach({
      name: resolvedProfile.coachName,
      title: resolvedProfile.coachTitle,
    }).unwrap();
    setPendingCoachProfile(null);
    setNeedsTokenRefresh(false);
    navigate('/clients', {replace: true});
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setFieldErrors(null);
    let businessCreated = false;
    try {
      setNeedsTokenRefresh(false);
      await createBusiness({
        name: values.name,
        handle: values.handle,
      }).unwrap();
      businessCreated = true;
      const profile = {
        coachName: values.coach_name,
        coachTitle: values.coach_title,
      };
      setPendingCoachProfile(profile);
      await refreshCoachToken();
      await finalizeCoachProfile(profile);
    } catch (err) {
      const result = handleFormError(err, 'Unable to finish onboarding. Please try again.');
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      if (!result.fieldErrors) {
        setNeedsTokenRefresh(businessCreated);
        toast.danger(result.formError);
      }
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Welcome</p>
            <h1 className="text-3xl font-semibold">Set up your coaching workspace</h1>
            <p className="text-sm text-foreground/70">Tell us about your business and how clients should see you.</p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField isInvalid={Boolean(businessNameError)}>
                <Label className="text-sm font-medium text-foreground">Business name</Label>
                <Input
                  placeholder="Acme Coaching"
                  {...register('name')}
                />
                {businessNameError ? <FieldError>{businessNameError}</FieldError> : null}
              </TextField>
              <TextField isInvalid={Boolean(businessHandleError)}>
                <Label className="text-sm font-medium text-foreground">Business handle</Label>
                <Input
                  placeholder="acme-coaching"
                  {...register('handle')}
                />
                {businessHandleError ? <FieldError>{businessHandleError}</FieldError> : null}
              </TextField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField isInvalid={Boolean(coachNameError)}>
                <Label className="text-sm font-medium text-foreground">Coach name</Label>
                <Input
                  placeholder="Jordan Lee"
                  {...register('coach_name')}
                />
                {coachNameError ? <FieldError>{coachNameError}</FieldError> : null}
              </TextField>
              <TextField isInvalid={Boolean(coachTitleError)}>
                <Label className="text-sm font-medium text-foreground">Coach title</Label>
                <Input
                  placeholder="Performance Coach"
                  {...register('coach_title')}
                />
                {coachTitleError ? <FieldError>{coachTitleError}</FieldError> : null}
              </TextField>
            </div>
            {formError ? <p className="text-sm text-danger">{formError}</p> : null}
            {needsTokenRefresh ? (
              <div className="rounded-medium border border-danger/30 bg-danger/10 p-4 text-sm text-foreground/80">
                We saved your business details, but couldn&apos;t finish setting up your coach profile. Please refresh
                your session and try again.
              </div>
            ) : null}
            <Button
              className="bg-primary text-primary-foreground"
              isDisabled={isLoading}
              type="submit"
            >
              Finish setup
            </Button>
            {needsTokenRefresh ? (
              <Button
                className="border border-divider bg-transparent"
                isDisabled={isLoading || !pendingCoachProfile}
                onClick={async () => {
                  setFormError(null);
                  try {
                    await refreshCoachToken();
                    await finalizeCoachProfile();
                  } catch {
                    toast.danger('Still unable to refresh your session. Please try again.');
                  }
                }}
                type="button"
              >
                Retry session refresh
              </Button>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
