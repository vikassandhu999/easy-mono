import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {type Profile, type ProfileUpdate, useProfile, useUpdateProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {readDraft, removeDraft} from '../api/drafts';
import {clearSession, getSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {DraftStatus, useDraftWriter} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Page} from '../ui/page';
import {SubmitButton} from '../ui/submit-button';

export function Account() {
  const query = useProfile();
  if (!query.data) {
    return (
      <Page
        title="Your account"
        back={routes.home}
      >
        {query.isError ? (
          <>
            <p role="alert">{errorMessage(query.error, 'Your details could not be loaded.')}</p>
            <Button
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Loading your details…</p>
        )}
      </Page>
    );
  }
  return (
    <ProfileForm
      key={query.data.data.id}
      profile={query.data.data}
    />
  );
}

function ProfileForm({profile}: {profile: Profile}) {
  const mutation = useUpdateProfile();
  const [notice, setNotice] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [owner] = useState(() => getSession()?.id);
  const {saveDraft, state: draftState} = useDraftWriter(owner, 'profile');
  const form = useForm<ProfileUpdate>({
    defaultValues: {
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone: profile.phone ?? '',
    },
  });
  useEffect(() => {
    let active = true;
    if (!owner) {
      return;
    }
    readDraft(owner, 'profile')
      .then((draft) => {
        if (!active) {
          return;
        }
        if (
          draft &&
          typeof draft === 'object' &&
          'first_name' in draft &&
          typeof draft.first_name === 'string' &&
          'last_name' in draft &&
          typeof draft.last_name === 'string' &&
          'phone' in draft &&
          typeof draft.phone === 'string'
        ) {
          form.reset({first_name: draft.first_name, last_name: draft.last_name, phone: draft.phone});
          setNotice('Your unsaved details were restored.');
        }
        setDraftReady(true);
      })
      .catch(() => {
        if (active) {
          setDraftError('Your saved draft could not be opened. Changes will only stay here while this screen is open.');
          setDraftReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [form, owner]);

  useEffect(() => {
    if (!draftReady || !owner) {
      return;
    }
    const subscription = form.watch((values) => {
      saveDraft(values);
    });
    return () => subscription.unsubscribe();
  }, [draftReady, form, owner, saveDraft]);
  const submit = form.handleSubmit(async (values) => {
    setNotice('');
    try {
      const result = await mutation.mutateAsync(values);
      form.reset({
        first_name: result.data.first_name ?? '',
        last_name: result.data.last_name ?? '',
        phone: result.data.phone ?? '',
      });
      if (owner) {
        await removeDraft(owner, 'profile');
      }
      setNotice('Your details are saved.');
    } catch (error) {
      form.setError('root', {
        message: errorMessage(
          error,
          'Your details could not be saved. Your changes are still here. Try again when connected.',
        ),
      });
    }
  });
  if (!draftReady) {
    return (
      <Page
        title="Your account"
        back={routes.home}
      >
        <p role="status">Opening your details…</p>
      </Page>
    );
  }
  return (
    <Page
      title="Your account"
      description={profile.email ?? undefined}
      back={routes.home}
    >
      <form
        noValidate
        onSubmit={submit}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="first_name"
          label="First name"
          autoComplete="given-name"
        />
        <FormField
          control={form.control}
          name="last_name"
          label="Last name"
          autoComplete="family-name"
        />
        <FormField
          control={form.control}
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
        />
        <FormError message={form.formState.errors.root?.message} />
        {draftError && <p role="alert">{draftError}</p>}
        {form.formState.isDirty && <DraftStatus state={draftState} />}
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {notice}
        </p>
        <SubmitButton pending={form.formState.isSubmitting}>Save details</SubmitButton>
      </form>
      <div className="mt-10 border-t border-border pt-6">
        <Button
          variant="ghost"
          onPress={clearSession}
        >
          Sign out
        </Button>
      </div>
    </Page>
  );
}
