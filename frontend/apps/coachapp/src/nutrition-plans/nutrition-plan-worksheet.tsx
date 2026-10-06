import {useCallback, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {
  type NutritionPlan,
  useNutritionPlan,
  useNutritionTemplates,
  useSaveNutritionPlan,
  useWithdrawNutritionRevision,
} from '../api/nutrition-plans';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {useListLocation} from '../ui/list-location';
import {NutritionContentPreview} from '../ui/nutrition-plan-preview';
import {FormActions, Page, PageHeader} from '../ui/page';
import {emptyContent, validateContent} from './menu';
import {MenuEditor} from './menu-editor';
import {TargetsEditor} from './targets-editor';

export type NutritionEditorContext = {kind: 'template'} | {kind: 'client'; clientId: string};
export function NutritionPlanWorksheet({
  initial,
  context,
}: {
  initial: NutritionPlan | undefined;
  context: NutritionEditorContext;
}) {
  const [plan, setPlan] = useState(initial);
  const form = useForm({defaultValues: {name: initial?.name ?? '', description: initial?.description ?? ''}});
  const [content, setContent] = useState(() => initial?.content ?? emptyContent());
  const [contentDirty, setContentDirty] = useState(false);
  const [effectiveOn, setEffectiveOn] = useState('');
  const [preview, setPreview] = useState(false);
  const [reload, setReload] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const leaving = useRef(false);
  const navigate = useNavigate();
  const clientId = context.kind === 'client' ? context.clientId : undefined;
  const person = useClient(clientId ?? '');
  const save = useSaveNutritionPlan(clientId);
  const withdraw = useWithdrawNutritionRevision(plan?.id ?? '', clientId);
  const query = useNutritionPlan(plan?.id ?? '');
  const {to: library, state} = useListLocation(routes.nutritionPlans);
  const to = clientId ? generatePath(routes.client, {id: clientId}) : library;
  const dirty = form.formState.isDirty || contentDirty || Boolean(effectiveOn);
  const pending = save.isPending || withdraw.isPending;
  const unavailable = plan?.status === 'archived';
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
  function reset(saved: NutritionPlan) {
    setPlan(saved);
    form.reset({name: saved.name, description: saved.description ?? ''});
    setContent(saved.content);
    setContentDirty(false);
    setConflict(false);
    setUncertain(false);
    setEffectiveOn('');
  }
  return (
    <Page className="editor-page">
      <PageHeader
        title={
          clientId
            ? `Nutrition for ${plan?.client?.preferred_name || plan?.client?.full_name || 'client'}`
            : initial
              ? 'Edit nutrition plan'
              : 'Create nutrition plan'
        }
        description="Set targets, build meals, and choose a pattern for each day."
        back={{to, label: clientId ? 'Back to client' : 'Back to nutrition plans', state}}
        actions={
          plan && (
            <Button
              variant="ghost"
              isDisabled={pending}
              onPress={() =>
                navigate(
                  clientId
                    ? generatePath(routes.manageClientNutritionPlan, {id: plan.id, clientId})
                    : generatePath(routes.manageNutritionPlan, {id: plan.id}),
                  {state},
                )
              }
            >
              {clientId ? 'Manage dates and access' : 'Manage template'}
            </Button>
          )
        }
      />
      {clientId && (
        <p className="text-sm text-muted-foreground">
          Changes apply to this client only. Published prescriptions keep their copied food values until you publish
          again.
        </p>
      )}
      <form
        className="has-mobile-actions min-w-0 space-y-8"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          const invalid = validateContent(content);
          form.clearErrors('root');
          setNotice('');
          if (invalid) {
            form.setError('root', {message: invalid});
            return;
          }
          try {
            const body = {name: values.name.trim(), description: values.description.trim() || null, content};
            const result = await save.mutateAsync(
              plan
                ? {
                    kind: 'details',
                    id: plan.id,
                    body: {
                      ...body,
                      expected_revision: plan.revision,
                      ...(clientId && effectiveOn ? {effective_on: effectiveOn} : {}),
                    },
                  }
                : {kind: 'create', body},
            );
            reset(result.data);
            setNotice(
              clientId
                ? effectiveOn
                  ? `Revision scheduled for ${effectiveOn}.`
                  : 'Revision published from today.'
                : 'Nutrition plan saved.',
            );
            if (!initial && !clientId) {
              leaving.current = true;
              navigate(generatePath(routes.editNutritionPlan, {id: result.data.id}), {replace: true, state});
            }
          } catch (error) {
            const stale = error instanceof ApiError && error.status === 409;
            setConflict(stale);
            if (!plan && (!(error instanceof ApiError) || error.status >= 500)) {
              setUncertain(true);
            }
            form.setError('root', {
              message: stale
                ? 'This plan changed elsewhere. Your draft is still here. Review the saved version.'
                : errorMessage(
                    error,
                    'The save could not be confirmed. Your draft is still here. Check the saved version before retrying.',
                  ),
            });
          }
        })}
      >
        <fieldset
          disabled={pending || unavailable || uncertain}
          className="min-w-0 space-y-8"
        >
          <legend className="sr-only">Nutrition prescription</legend>
          <FormField
            control={form.control}
            name="name"
            label="Plan name"
            emphasis="title"
            isRequired
            rules={{validate: (value) => Boolean(value.trim()) || 'Enter a plan name.'}}
          />
          <details>
            <summary className="cursor-pointer py-2 text-sm text-muted-foreground">Plan guidance</summary>
            <FormField
              control={form.control}
              name="description"
              label="Description"
              multiline
            />
          </details>
          {clientId && (
            <section className="space-y-3">
              <h2 className="editor-section-title">Publish this change</h2>
              <label
                htmlFor="nutrition-effective-date"
                className="grid max-w-sm gap-2 text-sm font-medium"
              >
                Effective date
                <Input
                  id="nutrition-effective-date"
                  type="date"
                  min={person.data?.data.local_date}
                  value={effectiveOn}
                  onChange={(event) => setEffectiveOn(event.target.value)}
                />
              </label>
              <p className="text-sm text-muted-foreground">Leave the date empty to publish from today.</p>
              {plan?.scheduled_revisions.map((revision) => (
                <div
                  key={revision.id}
                  className="space-y-3 rounded-xl bg-muted p-4"
                >
                  <p>
                    A revision is scheduled for {revision.effective_on}. An edit from today applies until{' '}
                    {revision.effective_on}.
                  </p>
                  <Button
                    variant="outline"
                    isDisabled={dirty || pending}
                    onPress={async () => {
                      try {
                        const result = await withdraw.mutateAsync({
                          revisionId: revision.id,
                          expectedRevision: plan.revision,
                        });
                        reset(result.data);
                        setNotice('Scheduled revision withdrawn.');
                      } catch (error) {
                        form.setError('root', {
                          message: errorMessage(error, 'Could not withdraw the scheduled revision.'),
                        });
                      }
                    }}
                  >
                    Withdraw scheduled revision
                  </Button>
                  <details>
                    <summary className="cursor-pointer py-2 text-sm">View scheduled meals</summary>
                    <NutritionContentPreview content={revision.content} />
                  </details>
                </div>
              ))}
            </section>
          )}
          <section className="editor-section space-y-4">
            <h2 className="editor-section-title">Plan targets</h2>
            <TargetsEditor
              label="Plan"
              value={content.targets}
              onChange={(targets) => {
                setContent({...content, targets});
                setContentDirty(true);
              }}
            />
          </section>
          <MenuEditor
            content={content}
            pending={pending}
            onChange={(next) => {
              setContent(next);
              setContentDirty(true);
              form.clearErrors('root');
            }}
          />
        </fieldset>
        {unavailable && <FormError message="This plan is archived. Restore it before editing." />}
        <FormError message={form.formState.errors.root?.message} />
        {form.formState.errors.root && (
          <Button
            variant="outline"
            onPress={() => (plan ? setReload(true) : setRecovery(true))}
          >
            {plan ? 'Review saved version' : 'Check saved plans'}
          </Button>
        )}
        {notice && !dirty && <p role="status">{notice}</p>}
        <p
          role="status"
          className="text-xs text-muted-foreground"
        >
          {dirty ? 'Unsaved changes' : plan ? 'All changes saved' : 'New plan'}
        </p>
        <FormActions>
          <Button
            variant="outline"
            onPress={() => setPreview(true)}
          >
            Preview meals
          </Button>
          <Button
            type="submit"
            isPending={pending}
            isDisabled={unavailable || uncertain || conflict || (!dirty && Boolean(plan))}
          >
            {clientId ? (effectiveOn ? 'Schedule revision' : 'Publish from today') : 'Save nutrition plan'}
          </Button>
        </FormActions>
      </form>
      <Dialog
        isOpen={preview}
        onOpenChange={setPreview}
      >
        <DialogHeader>
          <DialogTitle>Meal preview</DialogTitle>
        </DialogHeader>
        <div className="dialog-body">
          <NutritionContentPreview content={content} />
        </div>
      </Dialog>
      <Dialog
        isOpen={reload}
        onOpenChange={setReload}
      >
        <DialogHeader>
          <DialogTitle>Load saved version?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>This replaces your unsaved changes.</p>
          <Button
            variant="outline"
            onPress={() => setReload(false)}
          >
            Keep editing
          </Button>
          <Button
            isPending={query.isFetching}
            onPress={async () => {
              const result = await query.refetch();
              if (result.data) {
                reset(result.data.data);
                setReload(false);
                setNotice('Saved version loaded.');
              } else {
                form.setError('root', {message: 'Could not load the saved plan. Your draft is still here.'});
              }
            }}
          >
            Load saved plan
          </Button>
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
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsaved changes will be lost.</p>
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
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.proceed();
              }
            }}
          >
            Discard changes
          </Button>
        </div>
      </Dialog>
      {recovery && (
        <CreationRecovery
          name={form.getValues('name')}
          onClose={() => setRecovery(false)}
          onUse={(saved) => {
            reset(saved);
            setRecovery(false);
          }}
          onRetry={() => {
            setUncertain(false);
            setRecovery(false);
            form.clearErrors('root');
          }}
        />
      )}
    </Page>
  );
}
function CreationRecovery({
  name,
  onClose,
  onUse,
  onRetry,
}: {
  name: string;
  onClose: () => void;
  onUse: (plan: NutritionPlan) => void;
  onRetry: () => void;
}) {
  const query = useNutritionTemplates({search: name.trim()});
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
        <DialogTitle>Check saved plans</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>Check whether your interrupted save created a plan. Opening a result replaces this draft.</p>
        <InfiniteList
          query={query}
          label="plans"
          singular="plan"
          empty={<p>No matching plans.</p>}
        >
          {(plan) => (
            <div className="space-y-2 p-4">
              <p className="font-semibold">{plan.name}</p>
              <Button
                variant="outline"
                onPress={() => onUse(plan)}
              >
                Open saved plan
              </Button>
            </div>
          )}
        </InfiniteList>
        {query.isSuccess && !query.hasNextPage && (
          <Button
            variant="outline"
            onPress={onRetry}
          >
            Create a separate plan
          </Button>
        )}
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Return to draft
        </Button>
      </div>
    </Dialog>
  );
}
