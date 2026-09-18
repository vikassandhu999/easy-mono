import {Plus} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {Controller, FormProvider, useFieldArray, useForm, useWatch} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type FormTemplate,
  type FormTemplateCreate,
  useFormTemplate,
  useFormTemplates,
  useSaveFormTemplate,
  useSetDefaultIntake,
} from '../api/forms';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {FormPreview} from '../ui/form-preview';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {FormSection, newQuestion} from './form-section';

export function FormEditor() {
  const {id} = useParams();
  return id ? (
    <ExistingFormEditor
      key={id}
      id={id}
    />
  ) : (
    <Editor template={undefined} />
  );
}

function ExistingFormEditor({id}: {id: string}) {
  const query = useFormTemplate(id);
  const {to: listLocation} = useListLocation(routes.forms);
  const [initialTemplate, setInitialTemplate] = useState<FormTemplate>();
  useEffect(() => {
    if (!initialTemplate && query.isSuccess && query.isFetchedAfterMount) {
      setInitialTemplate(query.data.data);
    }
  }, [initialTemplate, query.isSuccess, query.isFetchedAfterMount, query.data]);
  if (!initialTemplate) {
    return (
      <Page className="editor-page">
        <PageHeader
          title="Edit form"
          back={{to: listLocation, label: 'Back to forms'}}
        />
        <Surface>
          {query.isError ? (
            <div className="space-y-4">
              <FormError message={errorMessage(query.error, "We couldn't load this form. Please try again.")} />
              <Button
                variant="outline"
                onPress={() => {
                  query.refetch();
                }}
                isPending={query.isFetching}
              >
                Try again
              </Button>
            </div>
          ) : (
            <p role="status">Loading form…</p>
          )}
        </Surface>
      </Page>
    );
  }
  return (
    <>
      {query.isError && (
        <div className="mb-4 space-y-3">
          <FormError message="Could not refresh this form. Your draft is still here." />
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
          >
            Retry form
          </Button>
        </div>
      )}
      <Editor template={query.data?.data ?? initialTemplate} />
    </>
  );
}

function Editor({template}: {template: FormTemplate | undefined}) {
  const navigate = useNavigate();
  const {to: listLocation, state: listState} = useListLocation(routes.forms);
  const save = useSaveFormTemplate();
  const setDefault = useSetDefaultIntake();
  const saved = useRef(false);
  const [revision, setRevision] = useState(template?.revision);
  const [stale, setStale] = useState(false);
  const [reload, setReload] = useState(false);
  const [uncertain, setUncertain] = useState<Pick<FormTemplateCreate, 'name' | 'purpose'>>();
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const query = useFormTemplate(template?.id);
  const errorSummary = useRef<HTMLDivElement>(null);
  const form = useForm<FormTemplateCreate>({
    defaultValues: template
      ? editableForm(template)
      : {name: '', purpose: 'check_in', sections: [{title: '', questions: [newQuestion()]}]},
  });
  const sections = useFieldArray({control: form.control, name: 'sections', keyName: '_key'});
  const values = useWatch({control: form.control});
  const clearErrors = form.clearErrors;
  // A changed draft makes the prior save error stale, including adding a question.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Watch the draft, not validation-state updates.
  useEffect(() => {
    clearErrors('root');
  }, [values, clearErrors]);
  useEffect(() => {
    if (form.formState.errors.root && !form.formState.isSubmitting) {
      errorSummary.current?.focus({preventScroll: true});
      errorSummary.current?.scrollIntoView({block: 'center'});
    }
  }, [form.formState.errors.root, form.formState.isSubmitting]);
  const pending = form.formState.isSubmitting || setDefault.isPending;
  const locked = pending || Boolean(uncertain);
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(useCallback(() => (dirty || pending) && !saved.current, [dirty, pending]));
  useBeforeUnload(
    useCallback(
      (event) => {
        if ((dirty || pending) && !saved.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  const hasService = values.sections?.some((section) =>
    section?.questions?.some((question) => question?.type === 'service_type'),
  );
  const submit = form.handleSubmit(async (body) => {
    if (pending || uncertain) {
      return;
    }
    form.clearErrors('root');
    if (!body.sections.some((section) => section.questions.length > 0)) {
      form.setError('root', {message: 'Add at least one question before saving.'});
      return;
    }
    try {
      await save.mutateAsync({
        ...(template ? {id: template.id} : {}),
        ...(revision ? {expectedRevision: revision} : {}),
        body: {...body, name: body.name.trim()},
      });
      if (!mounted.current) {
        return;
      }
      saved.current = true;
      navigate(listLocation, {state: {saved: body.name.trim()}});
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      if (!template && (!(error instanceof ApiError) || error.status >= 500)) {
        setUncertain({name: body.name.trim(), purpose: body.purpose});
        form.setError('root', {
          message:
            'The save could not be confirmed. Check saved forms before trying again. Your questions are still here.',
        });
        return;
      }
      setStale(error instanceof ApiError && error.code === 'stale_revision');
      setFormError(error, "We couldn't save your form. Your changes are still here. Please try again.", form.setError, [
        'name',
      ]);
    }
  });
  return (
    <Page className="editor-page">
      <PageHeader
        title={template ? 'Edit form' : 'Create form'}
        description="Build a form that helps you understand your client."
        back={{to: listLocation, label: 'Back to forms'}}
        actions={
          template && (
            <Link
              to={generatePath(routes.manageForm, {id: template.id})}
              state={listState}
              className={buttonVariants({variant: 'ghost'})}
            >
              Manage form
            </Link>
          )
        }
      />
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p className="text-sm text-muted-foreground">
            {uncertain
              ? 'This form may already have been saved. Leaving discards your draft, but does not delete a saved form.'
              : 'Your unsaved changes will be lost.'}
          </p>
          <div className="flex flex-wrap gap-3">
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
              Discard changes
            </Button>
          </div>
        </div>
      </Dialog>
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={submit}
          className="has-mobile-actions grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
        >
          <Surface className="space-y-5">
            <h2 className="section-title">Form details</h2>
            <FormField
              control={form.control}
              name="name"
              label="Form name"
              emphasis="item"
              isRequired
              isDisabled={locked}
              maxLength={255}
              rules={{
                validate: (value) => (typeof value === 'string' && Boolean(value.trim())) || 'Enter a form name.',
              }}
            />
            <div className="grid gap-2">
              <label
                id="form-purpose-label"
                htmlFor="form-purpose"
                className="text-sm font-medium"
              >
                Purpose
              </label>
              <Controller
                control={form.control}
                name="purpose"
                render={({field}) => (
                  <SelectField
                    id="form-purpose"
                    name={field.name}
                    triggerRef={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    isDisabled={Boolean(template) || locked}
                  >
                    <SelectItem id="intake">Intake</SelectItem>
                    <SelectItem
                      id="check_in"
                      isDisabled={Boolean(hasService)}
                    >
                      Check-in
                    </SelectItem>
                  </SelectField>
                )}
              />
              <p className="text-sm text-muted-foreground">
                {template
                  ? 'Purpose is fixed after the form is created.'
                  : hasService
                    ? 'Remove the Service type question to change this to a Check-in.'
                    : 'Intake is completed once. Check-ins are used throughout coaching.'}
              </p>
            </div>
            {template?.status === 'archived' && <StatusBadge>Archived</StatusBadge>}
            {template?.purpose === 'intake' && template.status === 'active' && (
              <div className="space-y-3 border-t border-border pt-5">
                {template.is_default_intake ? (
                  <StatusBadge tone="positive">Default intake</StatusBadge>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    isPending={setDefault.isPending}
                    isDisabled={dirty || pending || stale || template.revision !== revision}
                    onPress={async () => {
                      try {
                        const result = await setDefault.mutateAsync(template);
                        setRevision(result.data.revision);
                      } catch {
                        /* Mutation error is shown below. */
                      }
                    }}
                  >
                    Use as default intake
                  </Button>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Used for future invitations. Existing client assignments stay the same.
                  {dirty ? ' Save your changes first.' : ''}
                </p>
                <FormError
                  message={
                    setDefault.isError
                      ? errorMessage(setDefault.error, "We couldn't change the default. Please try again.")
                      : undefined
                  }
                />
              </div>
            )}
          </Surface>
          <div className="min-w-0 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Questions</h2>
              <FormPreview values={form.getValues()} />
            </div>
            {sections.fields.map((section, index) => (
              <FormSection
                key={section._key}
                index={index}
                count={sections.fields.length}
                pending={locked}
                onMove={(target) => sections.move(index, target)}
                onRemove={() => sections.remove(index)}
              />
            ))}
            <Button
              variant="outline"
              isDisabled={locked}
              onPress={() =>
                sections.append(
                  {title: '', questions: [newQuestion()]},
                  {focusName: `sections.${sections.fields.length}.title`},
                )
              }
            >
              <Plus aria-hidden="true" />
              Add section
            </Button>
          </div>
          <div className="lg:col-span-2">
            {template && (stale || template.revision !== revision) && (
              <div className="mb-5 space-y-3">
                <FormError message="This form changed elsewhere. Load the saved version before saving your draft." />
                <Button
                  variant="outline"
                  isDisabled={pending}
                  onPress={() => setReload(true)}
                >
                  Load saved form
                </Button>
              </div>
            )}
            <div
              className="mb-4 space-y-3"
              ref={errorSummary}
              tabIndex={-1}
            >
              <FormError message={form.formState.errors.root?.message} />
              {uncertain && (
                <Button
                  variant="outline"
                  onPress={() => setChecking(true)}
                >
                  Check saved forms
                </Button>
              )}
            </div>
            <FormActions>
              <Button
                variant="ghost"
                isDisabled={pending}
                onPress={() => navigate(listLocation)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isPending={form.formState.isSubmitting}
                isDisabled={
                  setDefault.isPending ||
                  Boolean(uncertain) ||
                  stale ||
                  Boolean(template && template.revision !== revision)
                }
              >
                Save form
              </Button>
            </FormActions>
          </div>
        </form>
      </FormProvider>
      {checking && uncertain && (
        <SavedForms
          search={uncertain}
          onClose={() => setChecking(false)}
          onOpen={(id) => {
            saved.current = true;
            navigate(generatePath(routes.editForm, {id}), {replace: true, state: listState});
          }}
          onRetry={() => {
            flushSync(() => {
              setChecking(false);
              setUncertain(undefined);
              form.clearErrors('root');
            });
            form.setFocus('name');
          }}
        />
      )}
      <Dialog
        isOpen={reload}
        onOpenChange={setReload}
        isDismissable={!query.isFetching}
        isKeyboardDismissDisabled={query.isFetching}
        showCloseButton={!query.isFetching}
      >
        <DialogHeader>
          <DialogTitle>Replace your unsaved form?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p>Your draft will be replaced with the latest saved questions and details.</p>
          {query.isError && <FormError message="Could not load the saved form. Your draft is still here." />}
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
                  const current = result.data.data;
                  form.reset(editableForm(current));
                  setRevision(current.revision);
                  setStale(false);
                  setReload(false);
                }
              }}
            >
              Load latest form
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

function SavedForms({
  search,
  onClose,
  onOpen,
  onRetry,
}: {
  search: Pick<FormTemplateCreate, 'name' | 'purpose'>;
  onClose: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}) {
  const query = useFormTemplates({search: search.name, purpose: search.purpose});
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
        <DialogTitle>Check saved forms</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>
          Preview the matching forms to find the questions you just saved. Opening a saved form replaces this draft.
        </p>
        <InfiniteList
          query={query}
          label="matching forms"
          singular="matching form"
          empty={<p>No matching forms found.</p>}
        >
          {(item) => (
            <div className="space-y-3 p-4">
              <div>
                <p className="break-words font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.question_count} {item.question_count === 1 ? 'question' : 'questions'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <FormPreview values={item} />
                <Button
                  variant="outline"
                  onPress={() => onOpen(item.id)}
                >
                  Open saved form
                </Button>
              </div>
            </div>
          )}
        </InfiniteList>
        {query.isSuccess && !query.isPaused && !query.isFetching && !query.hasNextPage && (
          <>
            <p className="text-sm text-muted-foreground">
              If none matches this attempt, return to your draft and try saving again.
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
          Keep my draft
        </Button>
      </div>
    </Dialog>
  );
}

function editableForm(template: FormTemplate): FormTemplateCreate {
  return {
    name: template.name,
    purpose: template.purpose,
    sections: template.sections.map((section) => ({
      ...section,
      title: section.title ?? '',
      questions: section.questions.map((question) => ({...question, required: question.required ?? false})),
    })),
  };
}
