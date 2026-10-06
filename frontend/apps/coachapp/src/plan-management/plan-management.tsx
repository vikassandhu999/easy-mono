import {useCallback, useEffect, useRef, useState} from 'react';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type PlanAction,
  type PlanResource,
  type PlanVersion,
  uncertainPlanWrite,
  useManagedPlan,
  useManagePlan,
} from '../api/plan-management';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

type Confirmation = {action: PlanAction; plan: PlanVersion};
const actionLabel = {
  duplicate: 'Create copy',
  archive: 'Archive template',
  restore: 'Restore template',
  delete: 'Delete template',
};
const description = {
  duplicate:
    'Create an independent template from the saved version. You can rename and edit it next. The original and assigned client plans stay unchanged.',
  archive:
    'Hide this template from new assignments. You can restore it later. Plans already assigned to clients continue unchanged.',
  restore: 'Make this template available to edit, copy and assign again. Existing client plans stay unchanged.',
  delete:
    'Permanently delete this reusable template and its contents. Plans already assigned to clients remain independent and stay available. This cannot be undone.',
};

export function PlanManagement({resource}: {resource: PlanResource}) {
  const {id = ''} = useParams();
  return (
    <ManageTemplate
      key={`${resource}:${id}`}
      resource={resource}
      id={id}
    />
  );
}
function ManageTemplate({resource, id}: {resource: PlanResource; id: string}) {
  const query = useManagedPlan(resource, id);
  const mutation = useManagePlan(resource);
  const navigate = useNavigate();
  const library = resource === 'training' ? routes.trainingPlans : routes.nutritionPlans;
  const editor = resource === 'training' ? routes.editTrainingPlan : routes.editNutritionPlan;
  const {to, state} = useListLocation(library);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copyUncertain, setCopyUncertain] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const mounted = useRef(true);
  const errorElement = useRef<HTMLParagraphElement>(null);
  const leaving = useRef(false);
  const pending = mutation.isPending;
  useEffect(() => {
    if (error && confirmation && !pending) {
      errorElement.current?.focus();
    }
  }, [error, confirmation, pending]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const blocker = useBlocker(
    ({currentLocation, nextLocation}) =>
      !leaving.current && pending && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [pending],
    ),
  );
  const plan = query.data?.data;
  const archived = plan && plan.status === 'archived';
  const ready =
    plan?.kind === 'template' && query.isFetchedAfterMount && !query.isFetching && !query.isError && !pending;
  function confirm(action: PlanAction) {
    if (!plan || !ready) {
      return;
    }
    setError('');
    setNeedsReview(false);
    setConfirmation({action, plan: {id: plan.id, name: plan.name, revision: plan.revision}});
  }
  async function perform() {
    if (!confirmation || pending || needsReview || (confirmation.action === 'duplicate' && copyUncertain)) {
      return;
    }
    setError('');
    try {
      const resultId = await mutation.mutateAsync(confirmation);
      if (!mounted.current) {
        return;
      }
      if (confirmation.action === 'delete') {
        leaving.current = true;
        navigate(to, {replace: true, state: {...state, deleted: confirmation.plan.name}});
      } else if (confirmation.action === 'duplicate' && resultId) {
        leaving.current = true;
        navigate(generatePath(editor, {id: resultId}), {state});
      } else {
        setNotice(
          confirmation.action === 'archive'
            ? 'Template archived. Existing client plans are unchanged.'
            : 'Template restored. It is available for new assignments.',
        );
        setConfirmation(null);
      }
    } catch (failure) {
      if (!mounted.current) {
        return;
      }
      if (confirmation.action === 'duplicate' && uncertainPlanWrite(failure)) {
        setCopyUncertain(true);
        setError('A copy may have been saved. Check your saved templates before creating another copy.');
      } else {
        setNeedsReview(true);
        setError(
          failure instanceof ApiError && failure.code === 'stale_revision'
            ? 'This template changed after you opened the confirmation. Close this dialog and review the latest version before trying again.'
            : errorMessage(
                failure,
                'We could not confirm this change. Close this dialog and refresh the template to check its current status.',
              ),
        );
      }
    }
  }
  return (
    <Page>
      <PageHeader
        title="Manage template"
        description={`${resource === 'training' ? 'Training' : 'Nutrition'} library`}
        back={{to, label: `Back to ${resource} plans`, state}}
      />
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-muted p-4 text-sm"
        >
          {notice}
        </p>
      )}
      {query.isError && <FormError message={errorMessage(query.error, 'We could not load this template.')} />}
      {query.isError && (
        <Button
          isPending={query.isFetching}
          onPress={() => {
            query.refetch();
          }}
        >
          Try again
        </Button>
      )}
      {!plan && !query.isError && <p role="status">Loading template…</p>}
      {plan && plan.kind !== 'template' && (
        <FormError message="This is a client plan. Manage it from the client's overview." />
      )}
      {plan?.kind === 'template' && (
        <>
          <Surface className="space-y-3">
            <StatusBadge>{archived ? 'Archived' : 'Active template'}</StatusBadge>
            <h2 className="section-title break-words">{plan.name}</h2>
            {plan.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{plan.description}</p>
            )}
            <Link
              to={generatePath(editor, {id})}
              state={state}
              className={buttonVariants({variant: 'outline'})}
            >
              {archived ? 'View template' : 'Edit template'}
            </Link>
          </Surface>
          <section
            className="space-y-3"
            aria-labelledby="copy-template-heading"
          >
            <h2
              id="copy-template-heading"
              className="section-title"
            >
              Start from this template
            </h2>
            <p className="text-sm text-muted-foreground">
              Keep the original and adapt an independent copy for another coaching approach.
            </p>
            {archived ? (
              <p className="text-sm text-muted-foreground">Restore this template before copying it.</p>
            ) : (
              <Button
                isDisabled={!ready || copyUncertain}
                onPress={() => confirm('duplicate')}
              >
                Create copy
              </Button>
            )}
            {copyUncertain && (
              <div
                className="space-y-2"
                role="status"
              >
                <p className="text-sm">A copy may already be saved. Review the library before creating another.</p>
                <Link
                  to={`${library}?status=all`}
                  state={state}
                  className="text-link"
                >
                  Check saved templates
                </Link>
              </div>
            )}
          </section>
          <section
            className="space-y-3"
            aria-labelledby="availability-heading"
          >
            <h2
              id="availability-heading"
              className="section-title"
            >
              {archived ? 'Use this template again' : 'Retire this template'}
            </h2>
            <p className="text-sm text-muted-foreground">{archived ? description.restore : description.archive}</p>
            <Button
              variant="outline"
              isDisabled={!ready}
              onPress={() => confirm(archived ? 'restore' : 'archive')}
            >
              {archived ? 'Restore template' : 'Archive template'}
            </Button>
          </section>
          <section
            className="space-y-3 pt-4"
            aria-labelledby="delete-template-heading"
          >
            <h2
              id="delete-template-heading"
              className="font-medium"
            >
              Delete permanently
            </h2>
            <p className="text-sm text-muted-foreground">{description.delete}</p>
            <Button
              variant="ghost"
              className="text-destructive"
              isDisabled={!ready}
              onPress={() => confirm('delete')}
            >
              Delete template
            </Button>
          </section>
        </>
      )}
      <Dialog
        isOpen={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setConfirmation(null);
          }
        }}
        isDismissable={!pending}
        isKeyboardDismissDisabled={pending}
        showCloseButton={!pending}
      >
        {confirmation && (
          <>
            <DialogHeader>
              <DialogTitle>{actionLabel[confirmation.action]}?</DialogTitle>
              <DialogDescription>
                <p className="mb-2 font-medium text-foreground break-words">{confirmation.plan.name}</p>
                {description[confirmation.action]}
              </DialogDescription>
            </DialogHeader>
            <FormError
              ref={errorElement}
              tabIndex={-1}
              message={error}
            />
            {copyUncertain && confirmation.action === 'duplicate' && (
              <Link
                to={`${library}?status=all`}
                className="text-link"
              >
                Check saved templates
              </Link>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                isDisabled={pending}
                onPress={() => setConfirmation(null)}
              >
                {needsReview || copyUncertain ? 'Close and review' : 'Cancel'}
              </Button>
              <Button
                variant={confirmation.action === 'delete' ? 'destructive' : 'default'}
                isDisabled={needsReview || (confirmation.action === 'duplicate' && copyUncertain)}
                isPending={pending}
                onPress={perform}
              >
                {actionLabel[confirmation.action]}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </Page>
  );
}
