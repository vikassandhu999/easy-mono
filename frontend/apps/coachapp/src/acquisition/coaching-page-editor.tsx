import {Eye} from 'lucide-react';
import {useCallback, useState} from 'react';
import {FormProvider, useForm, useWatch} from 'react-hook-form';
import {useBeforeUnload, useBlocker} from 'react-router-dom';
import {type Business, useBusiness} from '../api/business';
import {ApiError} from '../api/client';
import {type LandingPage, useLandingPage, useSaveLandingPage} from '../api/landing-page';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {FormActions, Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {CoachingContent} from './coaching-content';
import {landingDraft, pageInput} from './landing-draft';
import {ProgramFields, QuestionFields, SupportingFields} from './landing-fields';

export function CoachingPageEditor() {
  const page = useLandingPage();
  const business = useBusiness();
  return (
    <div className="has-mobile-actions mx-auto max-w-3xl [overflow-wrap:anywhere]">
      {page.data && business.data && (page.isError || business.isError) && (
        <div className="mb-5 space-y-3">
          <FormError message="Could not refresh your page. Your draft is still here." />
          <Button
            variant="outline"
            isPending={page.isFetching || business.isFetching}
            onPress={() => {
              page.refetch();
              business.refetch();
            }}
          >
            Retry refresh
          </Button>
        </div>
      )}
      {page.data && business.data ? (
        <Editor
          page={page.data.data}
          business={business.data.data}
        />
      ) : (
        <Page>
          <PageHeader
            title="Your coaching page"
            back={{to: routes.coachingPage, label: 'Coaching page'}}
          />
          {page.isPending || business.isPending ? (
            <p role="status">Loading your page…</p>
          ) : (
            <div className="space-y-3">
              <FormError message="Could not load your page." />
              <Button
                onPress={() => {
                  page.refetch();
                  business.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </Page>
      )}
    </div>
  );
}

function Editor({page, business}: {page: LandingPage | null; business: Business}) {
  const [saved, setSaved] = useState(page);
  const form = useForm({defaultValues: landingDraft(page, business.handle)});
  const draft = useWatch({control: form.control});
  const save = useSaveLandingPage();
  const query = useLandingPage();
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const [reload, setReload] = useState(false);
  const pending = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(dirty || pending);
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
  const submit = (status: LandingPage['status']) =>
    form.handleSubmit(async (values) => {
      form.clearErrors();
      setNotice('');
      setStale(false);
      try {
        const result = await save.mutateAsync(pageInput(values, status));
        setSaved(result.data);
        form.reset(landingDraft(result.data, business.handle));
        setNotice(
          status === 'published' ? 'Your page is live. Changes are published.' : 'Draft saved. Your page is private.',
        );
      } catch (error) {
        setStale(error instanceof ApiError && error.code === 'stale_revision');
        setFormError(error, 'Could not save your page. Your changes are still here.', form.setError, [
          'headline',
          'slug',
          'hero_image_url',
          'application_questions',
          'proof_points',
          'fit_points',
        ]);
      }
    });
  return (
    <FormProvider {...form}>
      <Page>
        <PageHeader
          title={saved ? 'Edit coaching page' : 'Create your coaching page'}
          description="Start with your introduction. Add what helps someone decide if your coaching is right for them."
          back={{to: routes.coachingPage, label: 'Coaching page'}}
          actions={
            <Button
              variant="outline"
              onPress={() => setPreview(true)}
            >
              <Eye
                className="size-4"
                aria-hidden="true"
              />{' '}
              Preview
            </Button>
          }
        />
        <StatusBadge tone={saved?.status === 'published' ? 'positive' : 'neutral'}>
          {saved?.status === 'published' ? 'Live · changes publish when you save' : 'Draft · private until you publish'}
        </StatusBadge>
        <form
          noValidate
          onSubmit={submit(saved?.status === 'published' ? 'published' : 'draft')}
          className="space-y-6"
          onChange={() => setNotice('')}
        >
          <fieldset
            disabled={pending}
            className="min-w-0 space-y-6"
          >
            <Surface className="space-y-5">
              <h2 className="section-title">Your introduction</h2>
              <FormField
                control={form.control}
                name="headline"
                label="What can you help people achieve?"
                isRequired
                maxLength={255}
                description="Make your headline specific and easy to understand."
              />
              <FormField
                control={form.control}
                name="subheadline"
                label="Tell them a little more"
                multiline
                maxLength={255}
              />
              <FormField
                control={form.control}
                name="slug"
                label="Page address"
                isRequired
                maxLength={60}
                description={`${window.location.origin}/coaching/${draft.slug || 'your-page'}`}
                rules={{
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: 'Use lowercase letters, numbers and hyphens.',
                  },
                  minLength: {value: 3, message: 'Use at least 3 characters.'},
                }}
              />
              {saved?.status === 'published' && (
                <p className="text-sm text-muted-foreground">
                  Changing the address will stop your old link from working.
                </p>
              )}
              <SupportingFields />
            </Surface>
            <Surface className="space-y-5">
              <div className="space-y-2">
                <h2 className="section-title">Ways to work together</h2>
                <p className="text-sm text-muted-foreground">
                  Offer a few clear options, or keep it open with a general application.
                </p>
              </div>
              <ProgramFields />
            </Surface>
            <Surface className="space-y-5">
              <h2 className="section-title">Application</h2>
              <QuestionFields />
            </Surface>
          </fieldset>
          <FormError message={form.formState.errors.root?.message} />
          <FormError message={form.formState.errors.proof_points?.message} />
          <FormError message={form.formState.errors.fit_points?.message} />
          {stale && (
            <div className="space-y-3">
              <p className="text-sm">
                A newer version was saved. Your draft is still here. Load the saved version before editing again.
              </p>
              <Button
                variant="outline"
                onPress={() => setReload(true)}
              >
                Load saved version
              </Button>
            </div>
          )}
          {notice && (
            <p
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
              onPress={() => setReload(true)}
            >
              Discard changes
            </Button>
            {saved?.status !== 'published' && (
              <Button
                type="submit"
                variant="outline"
                isPending={pending}
                isDisabled={Boolean(saved) && !dirty}
              >
                Save draft
              </Button>
            )}
            <Button
              isPending={pending}
              isDisabled={saved?.status === 'published' && !dirty}
              onPress={() => {
                submit('published')();
              }}
            >
              {saved?.status === 'published' ? 'Publish changes' : 'Publish page'}
            </Button>
          </FormActions>
        </form>
      </Page>
      <Dialog
        isOpen={preview}
        onOpenChange={setPreview}
        className="sm:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle>Visitor preview</DialogTitle>
        </DialogHeader>
        <div className="dialog-body">
          <p className="text-sm text-muted-foreground">Unsaved preview · application buttons are disabled</p>
          <CoachingContent
            content={form.getValues()}
            businessName={business.name}
          />
        </div>
      </Dialog>
      <Dialog
        isOpen={reload}
        isDismissable={!query.isFetching}
        isKeyboardDismissDisabled={query.isFetching}
        showCloseButton={!query.isFetching}
        onOpenChange={(open) => {
          if (!query.isFetching) {
            setReload(open);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Replace your unsaved changes?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>This will load the latest saved page and discard this draft.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              isDisabled={query.isFetching}
              onPress={() => setReload(false)}
            >
              Keep editing
            </Button>
            <Button
              isPending={query.isFetching}
              onPress={async () => {
                const result = await query.refetch();
                if (result.data && !result.isError) {
                  setSaved(result.data.data);
                  form.reset(landingDraft(result.data.data, business.handle));
                  setStale(false);
                  setReload(false);
                  setNotice('Latest saved version loaded.');
                }
              }}
            >
              Load saved page
            </Button>
          </div>
          {query.isError && <FormError message="Could not load the saved page. Your draft is still here." />}
        </div>
      </Dialog>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Leave this draft?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your changes have not been saved.</p>
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
    </FormProvider>
  );
}
