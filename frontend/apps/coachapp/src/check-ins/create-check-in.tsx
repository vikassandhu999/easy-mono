import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {useCheckInSchedules, useSaveCheckInSchedule} from '../api/check-in-schedules';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {type FormTemplate, useFormTemplates} from '../api/forms';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormPreview} from '../ui/form-preview';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {frequencyLabels, ScheduleFields} from './schedule-fields';

export function CreateCheckIn() {
  const {id = ''} = useParams();
  return (
    <Create
      key={id}
      clientId={id}
    />
  );
}
function Create({clientId}: {clientId: string}) {
  const client = useClient(clientId);
  const save = useSaveCheckInSchedule(clientId);
  const [template, setTemplate] = useState<FormTemplate>();
  const [picking, setPicking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const form = useForm<ScheduleFields>({defaultValues: {form_template_id: '', next_due_on: '', frequency: 'weekly'}});
  const navigate = useNavigate();
  const mounted = useRef(true);
  const leaving = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const {to, state} = useListLocation(generatePath(routes.clientCheckIns, {id: clientId}));
  const pending = form.formState.isSubmitting;
  const dirty = Boolean(template) || form.formState.isDirty;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (pending) {
      return;
    }
    if (templateError || form.formState.errors.form_template_id) {
      chooseRef.current?.focus();
    } else if (form.formState.errors.next_due_on) {
      form.setFocus('next_due_on');
    } else if (form.formState.errors.frequency) {
      form.setFocus('frequency');
    } else if (form.formState.errors.root) {
      errorRef.current?.focus();
    }
  }, [pending, templateError, form.formState.errors, form.setFocus]);
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leaving.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
      [dirty, pending],
    ),
  );
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
  const person = client.data?.data;
  const name = person
    ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client'
    : 'Client';
  function finish(message: string) {
    leaving.current = true;
    navigate(to, {replace: true, state: {...state, checkInNotice: message}});
  }
  return (
    <Page>
      <PageHeader
        title={`Schedule a check-in for ${name}`}
        description="Choose the questions and when your client should answer them."
        back={{to, label: 'Back to check-ins', state}}
      />
      {client.isError ? (
        <Surface>
          <FormError message={errorMessage(client.error, 'Could not load this client.')} />
          <Button
            onPress={() => {
              client.refetch();
            }}
          >
            Try again
          </Button>
        </Surface>
      ) : !person ? (
        <p role="status">Loading client…</p>
      ) : person.status !== 'active' ? (
        <Surface>
          <p>Check-ins can be scheduled once this client is active.</p>
          <Link
            to={generatePath(routes.client, {id: clientId})}
            className="text-link"
          >
            Back to client
          </Link>
        </Surface>
      ) : (
        <form
          noValidate
          className="has-mobile-actions space-y-6"
          onSubmit={form.handleSubmit(async (values) => {
            if (pending || uncertain) {
              return;
            }
            form.clearErrors();
            if (!template) {
              setTemplateError('Choose a check-in form.');
              return;
            }
            setTemplateError('');
            try {
              const result = await save.mutateAsync({kind: 'create', body: {...values, form_template_id: template.id}});
              if (mounted.current) {
                finish(
                  result.data.active
                    ? 'Check-in schedule saved.'
                    : 'Schedule saved. No further check-ins are scheduled.',
                );
              }
            } catch (error) {
              if (!mounted.current) {
                return;
              }
              const unknown = !(error instanceof ApiError) || error.status >= 500;
              setUncertain(unknown);
              if (unknown) {
                form.setError('root', {
                  message:
                    'The save could not be confirmed. Check saved schedules before trying again; your choices are still here.',
                });
              } else {
                setFormError(error, 'Could not save this schedule. Your choices are still here.', form.setError, [
                  'form_template_id',
                  'next_due_on',
                  'frequency',
                ]);
              }
            }
          })}
        >
          <section
            className="space-y-3"
            aria-label="Check-in form"
          >
            <h2 className="section-title">Check-in form</h2>
            {template ? (
              <div>
                <p className="wrap-anywhere text-lg font-semibold">{template.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.question_count} {template.question_count === 1 ? 'question' : 'questions'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose the progress questions you want this client to answer.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                ref={chooseRef}
                variant="outline"
                isDisabled={pending || uncertain}
                onPress={() => setPicking(true)}
              >
                {template ? 'Change form' : 'Choose form'}
              </Button>
              {template && <FormPreview values={template} />}
            </div>
            <FormError message={templateError || form.formState.errors.form_template_id?.message} />
          </section>
          <ScheduleFields
            form={form}
            disabled={pending || uncertain}
            first
          />
          <p className="text-sm text-muted-foreground">
            The first due date also controls when the form becomes available. A past date can create a check-in
            immediately.
          </p>
          <div
            ref={errorRef}
            tabIndex={-1}
            className="space-y-3"
          >
            <FormError message={form.formState.errors.root?.message} />
            {form.formState.errors.root && (
              <Button
                variant="outline"
                isDisabled={pending}
                onPress={() => setChecking(true)}
              >
                Check saved schedules
              </Button>
            )}
          </div>
          <FormActions>
            <Button
              variant="ghost"
              isDisabled={pending}
              onPress={() => navigate(to, {state})}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isPending={pending}
              isDisabled={uncertain}
            >
              Save schedule
            </Button>
          </FormActions>
        </form>
      )}
      {picking && (
        <ChooseForm
          onClose={() => setPicking(false)}
          onChoose={(value) => {
            setTemplate(value);
            form.setValue('form_template_id', value.id, {shouldDirty: true});
            form.clearErrors('form_template_id');
            setTemplateError('');
            setPicking(false);
          }}
        />
      )}
      {checking && (
        <SavedSchedules
          clientId={clientId}
          search={template?.name ?? ''}
          onClose={() => setChecking(false)}
          onUse={() => finish('Review your saved check-in schedules.')}
          onRetry={() => {
            flushSync(() => {
              setChecking(false);
              setUncertain(false);
              form.clearErrors('root');
            });
            form.setFocus('next_due_on');
          }}
        />
      )}
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{uncertain ? 'Leave this schedule?' : 'Leave without saving?'}</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>
            {uncertain
              ? 'The save could not be confirmed. Leaving will discard these choices, but it will not remove a schedule that was already saved.'
              : 'Your unsaved schedule will be lost.'}
          </p>
          <div className="flex gap-3">
            <Button
              autoFocus
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
              {uncertain ? 'Leave schedule' : 'Discard changes'}
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

function ChooseForm({onClose, onChoose}: {onClose: () => void; onChoose: (value: FormTemplate) => void}) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const query = useFormTemplates({purpose: 'check_in', status: 'active', search});
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft]);
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Choose a check-in form</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label
          htmlFor="check-in-form-search"
          className="grid gap-2 text-sm"
        >
          Search check-in forms
          <Input
            id="check-in-form-search"
            autoFocus
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <InfiniteList
          query={query}
          label="check-in forms"
          singular="check-in form"
          empty={<p>No matching check-in forms. Create one in Forms, then return here to schedule it.</p>}
        >
          {(item) => (
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.question_count} {item.question_count === 1 ? 'question' : 'questions'}
                  {item.status === 'archived' ? ' · Archived' : ''}
                </p>
              </div>
              <Button
                variant="outline"
                isDisabled={item.status === 'archived'}
                aria-label={`Choose ${item.name}`}
                onPress={() => onChoose(item)}
              >
                Choose
              </Button>
            </div>
          )}
        </InfiniteList>
      </div>
      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

function SavedSchedules({
  clientId,
  search,
  onClose,
  onUse,
  onRetry,
}: {
  clientId: string;
  search: string;
  onClose: () => void;
  onUse: () => void;
  onRetry: () => void;
}) {
  const query = useCheckInSchedules(clientId, {search});
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Check saved schedules</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>Check whether the interrupted save created this schedule before trying again.</p>
        <InfiniteList
          query={query}
          label="matching schedules"
          singular="matching schedule"
          empty={<p>No matching schedules found.</p>}
        >
          {(schedule) => (
            <div className="space-y-2 p-4">
              <p className="wrap-anywhere font-semibold">{schedule.form_template.name}</p>
              <p className="text-sm">
                {frequencyLabels[schedule.frequency]} · {schedule.next_due_on} ·{' '}
                {schedule.active ? 'Active' : 'Stopped'}
              </p>
              <Button
                variant="outline"
                onPress={onUse}
              >
                View saved schedules
              </Button>
            </div>
          )}
        </InfiniteList>
        {query.isSuccess && !query.isFetching && !query.hasNextPage && (
          <>
            <p className="text-sm text-muted-foreground">
              If none matches this attempt, return to your choices and try saving again.
            </p>
            <Button
              variant="outline"
              onPress={onRetry}
            >
              Return and retry
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Keep my choices
        </Button>
      </div>
    </Dialog>
  );
}
