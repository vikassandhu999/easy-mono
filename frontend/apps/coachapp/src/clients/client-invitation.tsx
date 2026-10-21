import {Copy, Mail} from 'lucide-react';
import {useState} from 'react';
import {Label, TextField} from 'react-aria-components';
import {errorMessage} from '../api/client';
import {type Client, useResendClientInvitation} from '../api/clients';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';

export function ClientInvitation({person}: {person: Client}) {
  const {id} = person;
  const resend = useResendClientInvitation();
  const [notice, setNotice] = useState<{kind: 'success' | 'error'; message: string} | null>(null);
  const pending = person.state === 'invited';
  const expired =
    person.invitation_expires_at !== null && new Date(person.invitation_expires_at).getTime() <= Date.now();
  const resendInvitation = async () => {
    setNotice(null);
    try {
      await resend.mutateAsync(id);
      setNotice({kind: 'success', message: 'A fresh invitation is on its way. You can share the link below.'});
    } catch (error) {
      setNotice({kind: 'error', message: errorMessage(error, "We couldn't resend the invitation. Please try again.")});
    }
  };
  const copyLink = async () => {
    if (!person.invite_url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(person.invite_url);
      setNotice({kind: 'success', message: 'Invitation link copied.'});
    } catch {
      setNotice({kind: 'error', message: "Couldn't copy the link. You can select and copy it from the field below."});
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium">{expired ? 'Invitation expired' : 'Waiting for acceptance'}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {expired
            ? 'Send a fresh invitation so your client can join.'
            : 'Your client can accept through their email invitation or the link below. Invitations do not use a seat.'}
        </p>
        {person.invited_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            Last invited{' '}
            {new Date(person.invited_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
          </p>
        )}
      </div>
      {notice?.kind === 'error' && <FormError message={notice.message} />}
      {notice?.kind === 'success' && (
        <p
          role="status"
          className="text-sm"
        >
          {notice.message}
        </p>
      )}
      {pending && person.invite_url && (
        <div className="space-y-3">
          <TextField
            isReadOnly
            value={person.invite_url}
            className="grid gap-2"
          >
            <Label className="text-sm font-medium">Invitation link</Label>
            <Input onFocus={(event) => event.currentTarget.select()} />
          </TextField>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onPress={copyLink}
              isDisabled={expired || resend.isPending}
            >
              <Copy aria-hidden="true" />
              Copy link
            </Button>
            {person.email && (
              <Button
                variant="outline"
                onPress={resendInvitation}
                isPending={resend.isPending}
              >
                <Mail aria-hidden="true" />
                Resend invitation
              </Button>
            )}
          </div>
          {!person.email && (
            <p className="text-sm text-muted-foreground">
              This client has no email address. Share their invitation link directly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
