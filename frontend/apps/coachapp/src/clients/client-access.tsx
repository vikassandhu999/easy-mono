import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {type Client, useRevokeClientInvitation, useUpdateClient} from '../api/clients';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {useListLocation} from '../ui/list-location';
import {Surface} from '../ui/page';

export function ClientAccess({
  person,
  isDisabled,
  onSaved,
  onRevoked,
}: {
  person: Client;
  isDisabled: boolean;
  onSaved: (client: Client) => void;
  onRevoked: () => void;
}) {
  const [action, setAction] = useState<'active' | 'inactive' | 'revoke' | null>(null);
  const [endDate, setEndDate] = useState('');
  const {
    setError,
    clearErrors,
    formState: {errors},
  } = useForm<{subscription_ends_on: string; status: string}>();
  const [notice, setNotice] = useState('');
  const update = useUpdateClient(person.id);
  const revoke = useRevokeClientInvitation(person.id);
  const list = useListLocation(routes.home);
  const navigate = useNavigate();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pending = update.isPending || revoke.isPending;
  const title =
    action === 'revoke' ? 'Revoke invitation?' : action === 'inactive' ? 'Deactivate client?' : 'Reactivate client?';
  async function confirm() {
    if (!action || pending) {
      return;
    }
    clearErrors();
    try {
      if (action === 'revoke') {
        await revoke.mutateAsync();
        if (mounted.current) {
          onRevoked();
          navigate(list.to, {replace: true, state: list.state});
        }
      } else {
        const result = await update.mutateAsync({
          status: action,
          ...(action === 'active' ? {subscription_ends_on: endDate || null} : {}),
        });
        if (mounted.current) {
          onSaved(result.data);
          setNotice(action === 'active' ? 'Client reactivated.' : 'Client deactivated. Their history is retained.');
          setAction(null);
        }
      }
    } catch (error) {
      if (mounted.current) {
        setFormError(error, 'The change could not be confirmed. Please try again.', setError, [
          'subscription_ends_on',
          'status',
        ]);
      }
    }
  }
  return (
    <>
      <Surface className="space-y-4">
        <h2 className="section-title">Client access</h2>
        <p className="text-sm text-muted-foreground">
          {person.status === 'pending'
            ? 'Revoke an invitation if this person should no longer join. Their invitation link will stop working.'
            : person.status === 'active'
              ? 'Deactivating stops their access to the client app. Their plans, responses and history stay available to your team.'
              : 'Restore access when coaching resumes. Reactivation requires an available client seat and a valid engagement end date.'}
        </p>
        {person.inactive_reason === 'subscription_expired' && (
          <p className="text-sm">Their coaching engagement ended.</p>
        )}
        {person.inactive_reason === 'awaiting_seat' && (
          <p className="text-sm">They are waiting for an available client seat.</p>
        )}
        {isDisabled && <p className="text-sm">Save or discard your edits before changing client access.</p>}
        {notice && <p role="status">{notice}</p>}
        <Button
          variant="outline"
          isDisabled={isDisabled || pending}
          onPress={() => {
            setAction(person.status === 'pending' ? 'revoke' : person.status === 'active' ? 'inactive' : 'active');
            setEndDate(person.subscription_ends_on ?? '');
            clearErrors();
            setNotice('');
          }}
        >
          {person.status === 'pending'
            ? 'Revoke invitation'
            : person.status === 'active'
              ? 'Deactivate client'
              : 'Reactivate client'}
        </Button>
      </Surface>
      <Dialog
        isOpen={action !== null}
        isDismissable={!pending}
        showCloseButton={!pending}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setAction(null);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p className="font-medium">
            {`${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'This client'}
          </p>
          <p>
            {action === 'revoke'
              ? 'This removes the pending client and cancels the invitation. You can send another invitation later.'
              : action === 'inactive'
                ? 'They will lose access to their client app. You can reactivate them later.'
                : 'They will regain access to their client app. Update or clear the end date if their coaching engagement has changed.'}
          </p>
          {action === 'active' && (
            <div className="grid gap-2">
              <Label htmlFor="reactivation-end">Engagement ends</Label>
              <Input
                id="reactivation-end"
                type="date"
                value={endDate}
                disabled={pending}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  clearErrors();
                }}
              />
              <p className="text-sm text-muted-foreground">Leave empty for an open-ended engagement.</p>
            </div>
          )}
          <FormError message={errors.subscription_ends_on?.message ?? errors.status?.message ?? errors.root?.message} />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => setAction(null)}
            >
              Cancel
            </Button>
            <Button
              isPending={pending}
              onPress={() => {
                confirm();
              }}
            >
              {action === 'revoke'
                ? 'Revoke invitation'
                : action === 'inactive'
                  ? 'Deactivate client'
                  : 'Reactivate client'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
