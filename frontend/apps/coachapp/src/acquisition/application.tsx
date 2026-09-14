import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, Link, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Prospect, useProspect, useUpdateProspect} from '../api/prospects';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {Label} from '../ui/label';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {ApplicationDraftGuard} from './application-draft-guard';
import {applicationStatus} from './application-labels';

export function ApplicationPage() {
  const {id = ''} = useParams();
  const query = useProspect(id);
  const list = useListLocation(routes.applications);
  if (query.data) {
    return (
      <>
        {query.isError && (
          <div className="mb-5 space-y-3">
            <FormError message="Could not refresh this application. The last loaded version is shown." />
            <Button
              variant="outline"
              onPress={() => {
                query.refetch();
              }}
            >
              Retry application
            </Button>
          </div>
        )}
        <ApplicationReader
          key={id}
          application={query.data.data}
        />
      </>
    );
  }
  return (
    <Page>
      <PageHeader
        title="Application"
        back={{to: list.to, label: 'Applications'}}
      />
      {query.isPending ? (
        <p role="status">Loading application…</p>
      ) : (
        <div className="space-y-3">
          <FormError message={errorMessage(query.error, 'Could not load this application.')} />
          <Button
            variant="outline"
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </Page>
  );
}

function ApplicationReader({application}: {application: Prospect}) {
  const list = useListLocation(routes.applications);
  const query = useProspect(application.id);
  const update = useUpdateProspect();
  const [revision, setRevision] = useState(application.revision);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(false);
  const [stale, setStale] = useState(false);
  const form = useForm({defaultValues: {status: application.status, notes: application.notes ?? ''}});
  const pending = form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setNotice('');
    setStale(false);
    try {
      const result = await update.mutateAsync({
        id: application.id,
        body: {status: values.status, notes: values.notes.trim() || null, expected_revision: revision},
      });
      form.reset({status: result.data.status, notes: result.data.notes ?? ''});
      setRevision(result.data.revision);
      setNotice('Review saved.');
    } catch (error) {
      setStale(error instanceof ApiError && error.code === 'stale_revision');
      setFormError(error, 'Could not save your review. Your changes are still here.', form.setError, [
        'status',
        'notes',
      ]);
    }
  });
  return (
    <Page>
      <PageHeader
        title={application.name}
        description={`${application.program?.name || 'General coaching application'} · Applied ${new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(new Date(application.inserted_at))}`}
        back={{to: list.to, label: 'Applications'}}
        actions={
          application.client ? (
            <Link
              className={buttonVariants({variant: 'outline'})}
              to={generatePath(routes.client, {id: application.client.id})}
              state={{returnTo: list.to, returnLabel: 'Back to applications'}}
            >
              View client
            </Link>
          ) : (
            <Link
              className={buttonVariants()}
              to={generatePath(routes.enrollApplication, {id: application.id})}
              state={list.state}
            >
              Enroll as client
            </Link>
          )
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <Surface className="space-y-4">
            <h2 className="section-title">Contact</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="break-all">
                  {application.email ? (
                    <a
                      className="text-link"
                      href={`mailto:${application.email}`}
                    >
                      {application.email}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </dd>
              </div>
              <div className="min-w-0 space-y-1">
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="break-words">
                  {application.phone ? (
                    <a
                      className="text-link"
                      href={`tel:${application.phone}`}
                    >
                      {application.phone}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </dd>
              </div>
              {application.instagram && (
                <div className="min-w-0 space-y-1">
                  <dt className="text-sm text-muted-foreground">Instagram</dt>
                  <dd className="break-words">{application.instagram}</dd>
                </div>
              )}
            </dl>
          </Surface>
          <Surface className="space-y-6">
            <div className="space-y-2">
              <h2 className="section-title">Their application</h2>
              <p className="text-sm text-muted-foreground">The questions and answers as they were submitted.</p>
            </div>
            {application.answer_rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional questions were included.</p>
            ) : (
              <dl className="space-y-6">
                {application.answer_rows.map((answer, index) => (
                  <div
                    key={`${answer.question_id}-${index}`}
                    className="space-y-2 [overflow-wrap:anywhere]"
                  >
                    <dt className="font-medium">{answer.label}</dt>
                    <dd
                      className={`whitespace-pre-wrap leading-relaxed ${answer.value === null ? 'text-muted-foreground' : ''}`}
                    >
                      {answer.value ?? 'Not answered'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Surface>
        </div>
        <form
          noValidate
          onSubmit={submit}
          className="space-y-4"
          onChange={() => setNotice('')}
        >
          <Surface className="space-y-5">
            <h2 className="section-title">Your review</h2>
            {application.client ? (
              <div className="space-y-2">
                <p className="font-medium">Accepted · enrolled as a client</p>
                <p className="text-sm text-muted-foreground">
                  Manage their access and coaching from their client profile.
                </p>
              </div>
            ) : (
              <Controller
                control={form.control}
                name="status"
                render={({field, fieldState}) => (
                  <div className="space-y-2">
                    <Label
                      id="review-status-label"
                      htmlFor="review-status"
                    >
                      Status
                    </Label>
                    <SelectField
                      id="review-status"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setNotice('');
                      }}
                      triggerRef={field.ref}
                      onBlur={field.onBlur}
                      isDisabled={pending}
                      isInvalid={Boolean(fieldState.error)}
                    >
                      <SelectItem id="new">{applicationStatus.new}</SelectItem>
                      <SelectItem id="reviewing">{applicationStatus.reviewing}</SelectItem>
                      <SelectItem id="won">{applicationStatus.won}</SelectItem>
                      <SelectItem id="lost">{applicationStatus.lost}</SelectItem>
                    </SelectField>
                    <FormError message={fieldState.error?.message} />
                  </div>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="notes"
              label="Private notes"
              description="Visible to your coaching team. Up to 255 characters."
              multiline
              maxLength={255}
              isDisabled={pending}
            />
            <FormError message={form.formState.errors.root?.message} />
            {notice && (
              <p
                role="status"
                className="text-sm"
              >
                {notice}
              </p>
            )}
            {(stale || application.revision !== revision) && (
              <div className="space-y-2">
                <p className="text-sm">
                  This application was updated elsewhere. Load the saved review before making more changes.
                </p>
                <Button
                  variant="outline"
                  isDisabled={pending}
                  onPress={() => setReload(true)}
                >
                  Load saved review
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                isPending={pending}
                isDisabled={!form.formState.isDirty}
              >
                Save review
              </Button>
              <Button
                variant="ghost"
                isDisabled={pending || !form.formState.isDirty}
                onPress={() => setReload(true)}
              >
                Discard changes
              </Button>
            </div>
          </Surface>
        </form>
      </div>
      <ApplicationDraftGuard
        dirty={form.formState.isDirty}
        pending={pending}
      />
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
          <DialogTitle>Load the saved review?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p>This will replace your unsaved status and notes with the latest saved version.</p>
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
                  form.reset({status: result.data.data.status, notes: result.data.data.notes ?? ''});
                  setRevision(result.data.data.revision);
                  setReload(false);
                  setStale(false);
                  setNotice('Saved review loaded.');
                }
              }}
            >
              Load review
            </Button>
          </div>
          {query.isError && <FormError message="Could not load the saved review. Your changes are still here." />}
        </div>
      </Dialog>
    </Page>
  );
}
