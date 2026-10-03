import {type ReactNode, useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {type Profile, type ProfileUpdate, useProfile, useUpdateProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {readDraft, removeDraft} from '../api/drafts';
import {getSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {CachedRead} from '../ui/cached-read';
import {useCoaching} from '../ui/coaching';
import {useOnline} from '../ui/connection-status';
import {DraftStatus, useDraftWriter} from '../ui/draft-status';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Page} from '../ui/page';
import {SubmitButton} from '../ui/submit-button';

export function AccountDetails() {
  const {canWrite} = useCoaching();
  const query = useProfile();
  const online = useOnline();
  if (!query.data) {
    return (
      <Page
        title="Personal details"
        back={routes.account}
        compact
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
          <p role="status">
            {online ? 'Loading your details…' : 'Your details are not available offline. Reconnect to open them.'}
          </p>
        )}
      </Page>
    );
  }
  if (!canWrite) {
    const profile = query.data.data;
    return (
      <Page
        title="Personal details"
        description={profile.email ?? undefined}
        back={routes.account}
        compact
      >
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
        <dl className="space-y-5">
          <div>
            <dt className="text-sm text-muted-foreground">Full name</dt>
            <dd>{profile.full_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">What should we call you?</dt>
            <dd>{profile.preferred_name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Phone</dt>
            <dd>{profile.phone || 'Not set'}</dd>
          </div>
        </dl>
      </Page>
    );
  }
  return (
    <ProfileForm
      key={query.data.data.id}
      profile={query.data.data}
    >
      <CachedRead
        updatedAt={query.dataUpdatedAt}
        failed={query.isError}
        refreshing={query.isFetching}
        refresh={() => query.refetch()}
      />
    </ProfileForm>
  );
}

function ProfileForm({profile, children}: {profile: Profile; children: ReactNode}) {
  const online = useOnline();
  const mutation = useUpdateProfile();
  const [notice, setNotice] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [owner] = useState(() => getSession()?.id);
  const {saveDraft, state: draftState} = useDraftWriter(owner, 'profile');
  const form = useForm<ProfileUpdate>({
    defaultValues: {
      full_name: profile.full_name ?? '',
      preferred_name: profile.preferred_name ?? '',
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
          'full_name' in draft &&
          typeof draft.full_name === 'string' &&
          'preferred_name' in draft &&
          typeof draft.preferred_name === 'string' &&
          'phone' in draft &&
          typeof draft.phone === 'string'
        ) {
          form.reset({full_name: draft.full_name, preferred_name: draft.preferred_name, phone: draft.phone});
          setHasDraft(true);
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

  const {isDirty, isSubmitting} = form.formState;
  useEffect(() => {
    if (!draftReady || hasDraft || isDirty || isSubmitting) {
      return;
    }
    const values = {
      full_name: profile.full_name ?? '',
      preferred_name: profile.preferred_name ?? '',
      phone: profile.phone ?? '',
    };
    if (JSON.stringify(form.getValues()) !== JSON.stringify(values)) {
      form.reset(values);
    }
  }, [draftReady, hasDraft, isDirty, isSubmitting, profile.full_name, profile.preferred_name, profile.phone, form]);

  useEffect(() => {
    if (!draftReady || !owner) {
      return;
    }
    const subscription = form.watch((values, {name}) => {
      if (name) {
        saveDraft(values);
      }
    });
    return () => subscription.unsubscribe();
  }, [draftReady, form, owner, saveDraft]);
  const submit = form.handleSubmit(async (values) => {
    if (!online) {
      return;
    }
    setNotice('');
    try {
      const result = await mutation.mutateAsync(values);
      form.reset({
        full_name: result.data.full_name ?? '',
        preferred_name: result.data.preferred_name ?? '',
        phone: result.data.phone ?? '',
      });
      if (owner) {
        await removeDraft(owner, 'profile');
      }
      setHasDraft(false);
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
        title="Personal details"
        back={routes.account}
        compact
      >
        <p role="status">Opening your details…</p>
      </Page>
    );
  }
  return (
    <Page
      title="Personal details"
      description={profile.email ?? undefined}
      back={routes.account}
      compact
    >
      {children}
      <form
        noValidate
        onSubmit={submit}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="full_name"
          label="Full name"
          autoComplete="name"
          isRequired
        />
        <FormField
          control={form.control}
          name="preferred_name"
          label="What should we call you?"
          autoComplete="nickname"
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
        <div className="mobile-save-bar">
          <SubmitButton
            preventFocusOnPress
            pending={form.formState.isSubmitting}
            isDisabled={!online}
          >
            Save details
          </SubmitButton>
        </div>
        {!online && (
          <p className="text-sm text-muted-foreground">
            Your edits stay on this device. Reconnect to save them to your account.
          </p>
        )}
      </form>
    </Page>
  );
}
