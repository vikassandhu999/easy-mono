import {type ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {Controller, type FieldPath, type FieldValues, type UseFormReturn, useForm} from 'react-hook-form';
import {NavLink, useBeforeUnload, useBlocker} from 'react-router-dom';
import {type Profile, type ProfileUpdate, useProfile, useUpdateProfile} from '../api/auth';
import {type Business, type BusinessUpdate, useBusiness, useTimezones, useUpdateBusiness} from '../api/business';
import {errorMessage} from '../api/client';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {Label} from '../ui/label';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

function SettingsFrame({title, description, children}: {title: string; description: string; children: ReactNode}) {
  return (
    <div className="has-mobile-actions mx-auto max-w-3xl">
      <Page>
        <PageHeader
          title={title}
          description={description}
        />
        <nav
          aria-label="Settings"
          className="flex gap-6 border-b border-border"
        >
          {[
            {to: routes.profileSettings, label: 'Your profile'},
            {to: routes.businessSettings, label: 'Business'},
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({isActive}) =>
                `pb-3 text-sm font-medium ${isActive ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground hover:text-foreground'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {children}
      </Page>
    </div>
  );
}

function SettingsActions<T extends FieldValues>({
  form,
  fields,
  notice,
  discard,
}: {
  form: UseFormReturn<T>;
  fields: FieldPath<T>[];
  notice: string;
  discard: () => void;
}) {
  const {isDirty: dirty, isSubmitting: pending, errors} = form.formState;
  const errorRef = useRef<HTMLParagraphElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const blocker = useBlocker(dirty || pending);
  useEffect(() => {
    if (pending || blocker.state === 'blocked') {
      return;
    }
    if (errors.root) {
      errorRef.current?.focus();
      return;
    }
    const invalid = fields.find((field) => form.getFieldState(field).invalid);
    if (invalid) {
      form.setFocus(invalid);
    } else if (notice && !dirty) {
      noticeRef.current?.focus();
    }
  }, [pending, blocker.state, errors, fields, form.getFieldState, form.setFocus, notice, dirty]);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  return (
    <>
      <FormError
        ref={errorRef}
        tabIndex={-1}
        message={errors.root?.message}
      />
      {notice && !dirty && (
        <p
          ref={noticeRef}
          tabIndex={-1}
          role="status"
          className="text-sm"
        >
          {notice}
        </p>
      )}
      <FormActions>
        <Button
          variant="ghost"
          isDisabled={pending || !dirty}
          onPress={discard}
        >
          Discard changes
        </Button>
        <Button
          type="submit"
          isPending={pending}
          isDisabled={!dirty}
        >
          Save changes
        </Button>
      </FormActions>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Discard your changes?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your settings have not been saved.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              Keep editing
            </Button>
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.proceed();
                }
              }}
            >
              Discard and leave
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function LoadError({error, retry, pending}: {error: unknown; retry: () => void; pending: boolean}) {
  return (
    <div className="space-y-3">
      <FormError message={errorMessage(error, 'Could not load settings. Please try again.')} />
      <Button
        variant="outline"
        isPending={pending}
        onPress={retry}
      >
        Try again
      </Button>
    </div>
  );
}

export function ProfileSettings() {
  const query = useProfile();
  return (
    <SettingsFrame
      title="Your profile"
      description="Your name and contact details as a coach."
    >
      {query.data ? (
        <ProfileForm
          key={query.data.data.id}
          profile={query.data.data}
        />
      ) : query.isPending ? (
        <p role="status">Loading your profile…</p>
      ) : (
        <LoadError
          error={query.error}
          retry={() => {
            query.refetch();
          }}
          pending={query.isFetching}
        />
      )}
    </SettingsFrame>
  );
}

const profileFields: Array<keyof ProfileUpdate> = ['first_name', 'last_name', 'phone'];
function profileValues(profile: Profile) {
  return {first_name: profile.first_name ?? '', last_name: profile.last_name ?? '', phone: profile.phone ?? ''};
}

function ProfileForm({profile}: {profile: Profile}) {
  const form = useForm({defaultValues: profileValues(profile)});
  const update = useUpdateProfile();
  const [notice, setNotice] = useState('');
  const pending = form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    const body: ProfileUpdate = {};
    for (const field of profileFields) {
      if (form.formState.dirtyFields[field]) {
        body[field] = values[field].trim() || null;
      }
    }
    form.clearErrors();
    setNotice('');
    try {
      const result = await update.mutateAsync(body);
      form.reset(profileValues(result.data));
      setNotice('Your profile is saved.');
    } catch (error) {
      setFormError(error, 'Could not save your profile. Your changes are still here.', form.setError, profileFields);
    }
  });
  return (
    <form
      noValidate
      onSubmit={submit}
      onChange={() => setNotice('')}
      className="space-y-6"
    >
      <Surface className="space-y-6">
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            label="First name"
            autoComplete="given-name"
            maxLength={255}
            isDisabled={pending}
          />
          <FormField
            control={form.control}
            name="last_name"
            label="Last name"
            autoComplete="family-name"
            maxLength={255}
            isDisabled={pending}
          />
        </div>
        <FormField
          control={form.control}
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          maxLength={255}
          isDisabled={pending}
        />
        <div className="space-y-2 border-t border-border pt-5">
          <p className="text-sm font-medium">Sign-in email</p>
          <p className="break-all">{profile.email}</p>
          <p className="text-sm text-muted-foreground">Your account uses this email for sign-in codes.</p>
        </div>
      </Surface>
      <SettingsActions
        form={form}
        fields={profileFields}
        notice={notice}
        discard={() => {
          form.reset(profileValues(profile));
          setNotice('Changes discarded.');
        }}
      />
    </form>
  );
}

export function BusinessSettings() {
  const query = useBusiness();
  const profile = useProfile();
  return (
    <SettingsFrame
      title="Business settings"
      description="Details and defaults for your coaching business."
    >
      {query.data ? (
        <>
          {query.isError && (
            <LoadError
              error={query.error}
              retry={() => {
                query.refetch();
              }}
              pending={query.isFetching}
            />
          )}
          {profile.data?.data.is_owner ? (
            <BusinessForm
              key={query.data.data.id}
              business={query.data.data}
            />
          ) : (
            <BusinessDetails business={query.data.data} />
          )}
        </>
      ) : query.isPending ? (
        <p role="status">Loading business settings…</p>
      ) : (
        <LoadError
          error={query.error}
          retry={() => {
            query.refetch();
          }}
          pending={query.isFetching}
        />
      )}
    </SettingsFrame>
  );
}

function BusinessDetails({business}: {business: Business}) {
  return (
    <Surface className="space-y-6">
      <p className="text-sm text-muted-foreground">Only the business owner can change these settings.</p>
      <dl className="grid gap-5 sm:grid-cols-2">
        {[
          ['Business name', business.name],
          ['Business handle', business.handle],
          ['About', business.about || 'Not added'],
          ['WhatsApp number', business.whatsapp_number || 'Not added'],
          ['Default workout load unit', business.default_weight_unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'],
          ['Default time zone', business.timezone],
        ].map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 space-y-1"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}

const businessFields: Array<keyof BusinessUpdate> = [
  'name',
  'about',
  'whatsapp_number',
  'default_weight_unit',
  'timezone',
];
function businessValues(business: Business) {
  return {
    name: business.name,
    about: business.about ?? '',
    whatsapp_number: business.whatsapp_number ?? '',
    default_weight_unit: business.default_weight_unit,
    timezone: business.timezone,
  };
}

function BusinessForm({business}: {business: Business}) {
  const form = useForm({defaultValues: businessValues(business)});
  const update = useUpdateBusiness();
  const timezones = useTimezones();
  const [notice, setNotice] = useState('');
  const pending = form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    const body: BusinessUpdate = {};
    const dirty = form.formState.dirtyFields;
    if (dirty.name) {
      body.name = values.name.trim();
    }
    if (dirty.about) {
      body.about = values.about.trim() || null;
    }
    if (dirty.whatsapp_number) {
      body.whatsapp_number = values.whatsapp_number.trim() || null;
    }
    if (dirty.default_weight_unit) {
      body.default_weight_unit = values.default_weight_unit;
    }
    if (dirty.timezone) {
      body.timezone = values.timezone;
    }
    form.clearErrors();
    setNotice('');
    try {
      const result = await update.mutateAsync(body);
      form.reset(businessValues(result.data));
      setNotice('Business settings are saved.');
    } catch (error) {
      setFormError(
        error,
        'Could not save business settings. Your changes are still here.',
        form.setError,
        businessFields,
      );
    }
  });
  return (
    <form
      noValidate
      onSubmit={submit}
      onChange={() => setNotice('')}
      className="space-y-6"
    >
      <Surface className="space-y-5">
        <h2 className="section-title">Business details</h2>
        <FormField
          control={form.control}
          name="name"
          label="Business name"
          isRequired
          maxLength={255}
          isDisabled={pending}
          rules={{validate: (value) => Boolean(value.trim()) || 'Enter your business name.'}}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">Business handle</p>
          <p className="break-all text-sm text-muted-foreground">{business.handle}</p>
        </div>
        <FormField
          control={form.control}
          name="about"
          label="About your business"
          multiline
          maxLength={255}
          isDisabled={pending}
          description="A short introduction, up to 255 characters."
        />
        <FormField
          control={form.control}
          name="whatsapp_number"
          label="WhatsApp number"
          type="tel"
          maxLength={255}
          isDisabled={pending}
          description="Your business contact number, including country code."
        />
      </Surface>
      <Surface className="space-y-5">
        <h2 className="section-title">Coaching defaults</h2>
        <Controller
          control={form.control}
          name="default_weight_unit"
          render={({field, fieldState}) => (
            <div className="grid gap-2">
              <Label
                id="weight-unit-label"
                htmlFor="weight-unit"
              >
                Default workout load unit
              </Label>
              <SelectField
                id="weight-unit"
                value={field.value}
                triggerRef={field.ref}
                onBlur={field.onBlur}
                isDisabled={pending}
                isInvalid={Boolean(fieldState.error)}
                aria-describedby="weight-unit-description"
                onChange={(value) => {
                  if (value === 'kg' || value === 'lbs') {
                    field.onChange(value);
                    setNotice('');
                  }
                }}
              >
                <SelectItem id="kg">Kilograms (kg)</SelectItem>
                <SelectItem id="lbs">Pounds (lb)</SelectItem>
              </SelectField>
              <p
                id="weight-unit-description"
                className="text-sm text-muted-foreground"
              >
                Used when your client records workout loads. Existing sets keep their units.
              </p>
              <FormError message={fieldState.error?.message} />
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="timezone"
          render={({field, fieldState}) => (
            <div className="grid gap-2">
              <Label
                id="business-timezone-label"
                htmlFor="business-timezone"
              >
                Default time zone
              </Label>
              <SelectField
                id="business-timezone"
                value={field.value}
                triggerRef={field.ref}
                onBlur={field.onBlur}
                isDisabled={pending || !timezones.data}
                isInvalid={Boolean(fieldState.error)}
                aria-describedby="timezone-description"
                onChange={(value) => {
                  field.onChange(value);
                  setNotice('');
                }}
              >
                {(timezones.data?.data.timezones ?? [business.timezone]).map((timezone) => (
                  <SelectItem
                    key={timezone}
                    id={timezone}
                  >
                    {timezone.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectField>
              <p
                id="timezone-description"
                className="text-sm text-muted-foreground"
              >
                Applies to clients you invite after saving. Existing clients keep their own time zones.
              </p>
              {timezones.isPending && (
                <p
                  role="status"
                  className="text-sm"
                >
                  Loading time zones…
                </p>
              )}
              {timezones.isError && (
                <LoadError
                  error={timezones.error}
                  retry={() => {
                    timezones.refetch();
                  }}
                  pending={timezones.isFetching}
                />
              )}
              <FormError message={fieldState.error?.message} />
            </div>
          )}
        />
      </Surface>
      <SettingsActions
        form={form}
        fields={businessFields}
        notice={notice}
        discard={() => {
          form.reset(businessValues(business));
          setNotice('Changes discarded.');
        }}
      />
    </form>
  );
}
