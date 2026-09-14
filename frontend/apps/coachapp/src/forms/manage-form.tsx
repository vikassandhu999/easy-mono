import {useCallback, useEffect, useRef, useState} from 'react';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type FormAction, type FormTemplate, useChangeForm, useDefaultIntake, useFormManagement} from '../api/forms';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormPreview} from '../ui/form-preview';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

const actionLabels: Record<FormAction, string> = {
  archive: 'Archive form',
  restore: 'Restore form',
  delete: 'Delete form',
  set_default: 'Use as default intake',
  clear_default: 'Use automatic selection',
};
const descriptions: Record<FormAction, string> = {
  archive:
    'This form will no longer be available for new assignments or schedules. Assigned forms, saved responses and existing check-in schedules will keep working. If it is the chosen intake, future invitations will use automatic selection.',
  restore:
    'This form will be available for new assignments and schedules. Restoring an intake does not make it the chosen default.',
  delete: 'This permanently removes the unused form. It cannot be undone.',
  set_default: 'Future client invitations will use this intake. Forms already assigned to clients will stay the same.',
  clear_default:
    'Invitations will use your oldest active intake, or the built-in intake if none remain. Future invitations will still include an intake form.',
};

export function ManageForm() {
  const {id = ''} = useParams();
  return (
    <FormManagement
      key={id}
      id={id}
    />
  );
}

function FormManagement({id}: {id: string}) {
  const query = useFormManagement(id);
  const list = useListLocation(routes.forms);
  const navigate = useNavigate();
  const change = useChangeForm();
  const [confirmation, setConfirmation] = useState<{action: FormAction; template: FormTemplate} | null>(null);
  const [notice, setNotice] = useState('');
  const finished = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const blocker = useBlocker(useCallback(() => change.isPending && !finished.current, [change.isPending]));
  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);
  useBeforeUnload(
    useCallback(
      (event) => {
        if (change.isPending && !finished.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [change.isPending],
    ),
  );
  const management = query.data?.data;
  const template = management?.template;
  const stale = change.error instanceof ApiError && change.error.code === 'stale_revision';
  const usageChanged = change.error instanceof ApiError && change.error.status === 422;
  const choose = (action: FormAction) => {
    if (template) {
      finished.current = false;
      change.reset();
      setNotice('');
      setConfirmation({action, template});
    }
  };
  return (
    <Page>
      <PageHeader
        title={template?.name ?? 'Manage form'}
        description="Review usage and manage this reusable form."
        back={{to: list.to, label: 'Back to forms'}}
        actions={
          template && (
            <Link
              className={buttonVariants({variant: 'outline'})}
              to={generatePath(routes.editForm, {id})}
              state={list.state}
            >
              Edit questions
            </Link>
          )
        }
      />
      {query.isError && (
        <div className="space-y-3">
          <FormError message={errorMessage(query.error, 'Could not load this form.')} />
          <Button
            variant="outline"
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Retry form
          </Button>
        </div>
      )}
      {!management && query.isPending && <p role="status">Loading form usage…</p>}
      {notice && (
        <p
          role="status"
          className="text-sm"
        >
          {notice}
        </p>
      )}
      {management && template && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Surface className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge tone={template.status === 'active' ? 'positive' : 'neutral'}>
                {template.status === 'active' ? 'Active' : 'Archived'}
              </StatusBadge>
              <FormPreview values={template} />
            </div>
            <h2 className="section-title">Where this form is used</h2>
            <dl className="grid grid-cols-2 gap-5 text-sm">
              <div>
                <dt className="text-muted-foreground">Assignments</dt>
                <dd className="mt-1 text-xl font-semibold">{management.assignment_count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Responses</dt>
                <dd className="mt-1 text-xl font-semibold">{template.response_count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Check-in schedules</dt>
                <dd className="mt-1 text-xl font-semibold">{management.schedule_count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Active schedules</dt>
                <dd className="mt-1 text-xl font-semibold">{management.active_schedule_count}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              Archiving keeps assigned forms, responses and ongoing schedules available.
            </p>
            <Button
              variant="outline"
              isDisabled={change.isPending || query.isError}
              onPress={() => choose(template.status === 'active' ? 'archive' : 'restore')}
            >
              {template.status === 'active' ? 'Archive form' : 'Restore form'}
            </Button>
          </Surface>
          <div className="space-y-6">
            {template.purpose === 'intake' && (
              <IntakeChoice
                template={template}
                disabled={change.isPending || query.isError}
                choose={choose}
              />
            )}
            <Surface className="space-y-4">
              <h2 className="section-title">Delete this form</h2>
              <p className="text-sm text-muted-foreground">
                {management.delete_blocked_reason === 'built_in'
                  ? 'Built-in forms can be archived, but cannot be deleted.'
                  : management.delete_blocked_reason === 'assignments'
                    ? 'This form has client assignments. Keeping it preserves their forms and responses.'
                    : management.delete_blocked_reason === 'schedules'
                      ? 'Existing check-in schedules need this form, including while it is archived.'
                      : 'No assignments or schedules use this form. You can permanently remove it.'}
              </p>
              <Button
                variant="destructive"
                isDisabled={management.delete_blocked_reason !== null || change.isPending || query.isError}
                onPress={() => choose('delete')}
              >
                Delete form
              </Button>
            </Surface>
          </div>
        </div>
      )}
      <Dialog
        isOpen={Boolean(confirmation)}
        isDismissable={!change.isPending}
        isKeyboardDismissDisabled={change.isPending}
        showCloseButton={!change.isPending}
        onOpenChange={(open) => {
          if (!open && !change.isPending) {
            setConfirmation(null);
            change.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{confirmation ? `${actionLabels[confirmation.action]}?` : 'Manage form'}</DialogTitle>
        </DialogHeader>
        {confirmation && (
          <div className="dialog-body space-y-5">
            <p className="font-semibold break-words">{confirmation.template.name}</p>
            <p>{descriptions[confirmation.action]}</p>
            {change.isError && (
              <FormError
                message={
                  usageChanged
                    ? 'This form can no longer be changed this way. Refresh to review its current usage and available actions.'
                    : stale
                      ? 'This form changed after you opened it. Refresh before choosing an action again.'
                      : errorMessage(change.error, 'Could not confirm this change. Retry to check the saved result.')
                }
              />
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                isDisabled={change.isPending}
                onPress={() => {
                  setConfirmation(null);
                  change.reset();
                }}
              >
                Cancel
              </Button>
              {stale || usageChanged ? (
                <Button
                  isPending={query.isFetching}
                  onPress={async () => {
                    const result = await query.refetch();
                    if (result.data && !result.isError) {
                      setConfirmation(null);
                      change.reset();
                    }
                  }}
                >
                  Refresh form
                </Button>
              ) : (
                <Button
                  variant={confirmation.action === 'delete' ? 'destructive' : 'default'}
                  isPending={change.isPending}
                  onPress={async () => {
                    try {
                      await change.mutateAsync(confirmation);
                      if (!mounted.current) {
                        return;
                      }
                      finished.current = true;
                      setConfirmation(null);
                      if (confirmation.action === 'delete') {
                        navigate(list.to, {replace: true, state: {deleted: confirmation.template.name}});
                      } else {
                        setNotice('Form updated.');
                      }
                    } catch {
                      /* The confirmation stays open for retry. */
                    }
                  }}
                >
                  {actionLabels[confirmation.action]}
                </Button>
              )}
            </div>
            {query.isError && (stale || usageChanged) && (
              <FormError message="Could not refresh. Try again when connected." />
            )}
          </div>
        )}
      </Dialog>
    </Page>
  );
}

function IntakeChoice({
  template,
  disabled,
  choose,
}: {
  template: FormTemplate;
  disabled: boolean;
  choose: (action: FormAction) => void;
}) {
  const intake = useDefaultIntake();
  return (
    <Surface className="space-y-4">
      <h2 className="section-title">Intake for future invitations</h2>
      {intake.data && (
        <p className="text-sm">
          Invitations use <strong>{intake.data.data.name}</strong>
          {intake.data.data.is_default_intake ? ' — chosen by your team.' : ' — selected automatically.'}
        </p>
      )}
      {intake.isPending && <p role="status">Loading intake choice…</p>}
      {intake.isError && (
        <>
          <FormError message="Could not refresh the intake choice." />
          <Button
            variant="outline"
            onPress={() => {
              intake.refetch();
            }}
          >
            Retry intake
          </Button>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Changing this affects future invitations. Assigned client forms stay the same.
      </p>
      {template.is_default_intake ? (
        <Button
          variant="outline"
          isDisabled={disabled || !intake.isSuccess}
          onPress={() => choose('clear_default')}
        >
          Use automatic selection
        </Button>
      ) : template.status === 'active' ? (
        <Button
          variant="outline"
          isDisabled={disabled || !intake.isSuccess}
          onPress={() => choose('set_default')}
        >
          Use as default intake
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Restore this form before choosing it as the default.</p>
      )}
    </Surface>
  );
}
