import {Plus} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Controller, FormProvider, useFieldArray, useForm, useWatch} from 'react-hook-form';
import {useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {
  type FormTemplate,
  type FormTemplateCreate,
  useFormTemplate,
  useSaveFormTemplate,
  useSetDefaultIntake,
} from '../api/forms';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {FormPreview} from './form-preview';
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
      <Page>
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
  return <Editor template={query.data?.data ?? initialTemplate} />;
}

function Editor({template}: {template: FormTemplate | undefined}) {
  const navigate = useNavigate();
  const {to: listLocation} = useListLocation(routes.forms);
  const save = useSaveFormTemplate();
  const setDefault = useSetDefaultIntake();
  const saved = useRef(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const form = useForm<FormTemplateCreate>({
    defaultValues: template
      ? {
          name: template.name,
          purpose: template.purpose,
          sections: template.sections.map((section) => ({
            ...section,
            title: section.title ?? '',
            questions: section.questions.map((question) => ({...question, required: question.required ?? false})),
          })),
        }
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
    if (form.formState.errors.root) {
      errorSummary.current?.scrollIntoView({block: 'center'});
    }
  }, [form.formState.errors.root]);
  const pending = form.formState.isSubmitting || setDefault.isPending;
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(useCallback(() => dirty && !saved.current, [dirty]));
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty && !saved.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty],
    ),
  );
  const hasService = values.sections?.some((section) =>
    section?.questions?.some((question) => question?.type === 'service_type'),
  );
  const submit = form.handleSubmit(async (body) => {
    form.clearErrors('root');
    if (!body.sections.some((section) => section.questions.length > 0)) {
      form.setError('root', {message: 'Add at least one question before saving.'});
      return;
    }
    try {
      await save.mutateAsync({...(template ? {id: template.id} : {}), body: {...body, name: body.name.trim()}});
      saved.current = true;
      navigate(listLocation, {state: {saved: body.name.trim()}});
    } catch (error) {
      setFormError(error, "We couldn't save your form. Your changes are still here. Please try again.", form.setError, [
        'name',
      ]);
    }
  });
  return (
    <Page>
      <PageHeader
        title={template ? 'Edit form' : 'Create form'}
        description="Build a form that helps you understand your client."
        back={{to: listLocation, label: 'Back to forms'}}
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
          <p className="text-sm text-muted-foreground">Your unsaved changes will be lost.</p>
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
              isRequired
              isDisabled={pending}
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
                    isDisabled={Boolean(template) || pending}
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
                    isDisabled={dirty || pending}
                    onPress={async () => {
                      try {
                        await setDefault.mutateAsync(template.id);
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
                pending={pending}
                onMove={(target) => sections.move(index, target)}
                onRemove={() => sections.remove(index)}
              />
            ))}
            <Button
              variant="outline"
              isDisabled={pending}
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
            <div
              className="mb-4"
              ref={errorSummary}
            >
              <FormError message={form.formState.errors.root?.message} />
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
                isDisabled={setDefault.isPending}
              >
                Save form
              </Button>
            </FormActions>
          </div>
        </form>
      </FormProvider>
    </Page>
  );
}
