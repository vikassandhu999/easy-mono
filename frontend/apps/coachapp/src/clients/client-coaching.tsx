import {formatDateShort} from '@easy/utils';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useBusiness} from '../api/business';
import {errorMessage} from '../api/client';
import {type Client, useRevokeClientInvitation, useStartCoaching, useUpdateCoachingTerm} from '../api/clients';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {useListLocation} from '../ui/list-location';
import {StatusBadge, Surface} from '../ui/page';
import {ClientInvitation} from './client-invitation';
import {clientStateLabels, coachingSummary, endingSoonLabel} from './coaching';

export function ClientCoaching({person}: {person: Client}) {
  const business = useBusiness();
  const start = useStartCoaching(person.id);
  const update = useUpdateCoachingTerm();
  const revoke = useRevokeClientInvitation(person.id);
  const [action, setAction] = useState<'end' | 'revoke' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const list = useListLocation(routes.home);
  const term = person.current_term;
  const pending = start.isPending || update.isPending || revoke.isPending;
  const seats = business.data?.data.seats;
  const full = seats ? seats.used >= seats.limit : false;
  async function saveEnd(ends_on: string | null) {
    if (!term || pending) {
      return;
    }
    setError('');
    setNotice('');
    try {
      await update.mutateAsync({id: term.id, ends_on});
      setAction(null);
      setNotice(
        ends_on === person.local_date
          ? 'Coaching ends tonight in your client’s time zone.'
          : ends_on
            ? 'Coaching end date saved.'
            : 'Coaching is now open-ended.',
      );
    } catch (failure) {
      setError(errorMessage(failure, 'Could not save the end date. Please try again.'));
    }
  }
  return (
    <Surface className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="section-title">Coaching</h2>
        <StatusBadge tone={term ? 'positive' : 'neutral'}>{clientStateLabels[person.state]}</StatusBadge>
      </div>
      {term ? (
        <>
          <p>{coachingSummary(person)}</p>
          {endingSoonLabel(person) && <p className="text-sm">{endingSoonLabel(person)}</p>}
          <EndDate
            key={`${term.id}:${term.ends_on}`}
            value={term.ends_on}
            today={person.local_date}
            pending={pending}
            onSave={saveEnd}
          />
          <div className="flex flex-wrap gap-3">
            {term.ends_on && (
              <Button
                variant="outline"
                isDisabled={pending}
                onPress={() => saveEnd(null)}
              >
                Clear end date
              </Button>
            )}
            <Button
              variant="outline"
              isDisabled={pending || term.ends_on === person.local_date}
              onPress={() => {
                setError('');
                setAction('end');
              }}
            >
              End coaching
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Coaching continues through the end date in your client’s time zone. You can move or clear it while coaching
            is active.
          </p>
        </>
      ) : person.state === 'invited' ? (
        <>
          <ClientInvitation person={person} />
          <Button
            variant="ghost"
            isDisabled={pending}
            onPress={() => {
              setError('');
              setAction('revoke');
            }}
          >
            Revoke invitation
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {person.state === 'joined'
              ? 'Your client has joined. Start coaching when a seat is available.'
              : 'Their coaching history is retained. Start a new term when you are ready to coach again, then assign a new plan.'}
          </p>
          <Button
            isPending={start.isPending}
            isDisabled={pending || !seats || full}
            onPress={async () => {
              setError('');
              setNotice('');
              try {
                await start.mutateAsync();
                setNotice('Coaching started.');
              } catch (failure) {
                setError(errorMessage(failure, 'Could not start coaching. Please try again.'));
              }
            }}
          >
            Start coaching
          </Button>
          {full && <p className="text-sm">No free seat</p>}
          {business.isPending && (
            <p
              role="status"
              className="text-sm"
            >
              Checking available seats…
            </p>
          )}
          {business.isError && (
            <div className="space-y-2">
              <FormError message="Could not check available seats." />
              <Button
                variant="outline"
                onPress={() => {
                  business.refetch();
                }}
              >
                Retry seats
              </Button>
            </div>
          )}
        </>
      )}
      {!action && <FormError message={error || undefined} />}
      {notice && (
        <p
          role="status"
          className="text-sm"
        >
          {notice}
        </p>
      )}
      {person.terms.length > 0 && (
        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="font-medium">Term history</h3>
          <ul className="space-y-2 text-sm">
            {person.terms.map((item) => (
              <li key={item.id}>
                {formatDateShort(item.starts_on)} – {item.ends_on ? formatDateShort(item.ends_on) : 'now'}
              </li>
            ))}
          </ul>
        </div>
      )}
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
          <DialogTitle>{action === 'end' ? 'End coaching today?' : 'Revoke invitation?'}</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p className="font-medium">{person.preferred_name || person.full_name}</p>
          <p>
            {action === 'end'
              ? 'Your client stays active until midnight in their time zone. After that, they can read their history but cannot record activity or send messages. Their plans will stop.'
              : 'This cancels their invitation and removes the invited client. You can invite them again later.'}
          </p>
          <FormError message={error || undefined} />
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
              onPress={async () => {
                if (action === 'end') {
                  await saveEnd(person.local_date);
                  return;
                }
                setError('');
                try {
                  await revoke.mutateAsync();
                  navigate(list.to, {replace: true, state: list.state});
                } catch (failure) {
                  setError(errorMessage(failure, 'Could not revoke this invitation. Please try again.'));
                }
              }}
            >
              {action === 'end' ? 'End coaching' : 'Revoke invitation'}
            </Button>
          </div>
        </div>
      </Dialog>
    </Surface>
  );
}

function EndDate({
  value,
  today,
  pending,
  onSave,
}: {
  value: string | null;
  today: string;
  pending: boolean;
  onSave: (value: string | null) => Promise<void>;
}) {
  const [date, setDate] = useState(value ?? '');
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(date || null);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="coaching-ends">Coaching ends</Label>
        <Input
          id="coaching-ends"
          type="date"
          min={today}
          value={date}
          disabled={pending}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        isDisabled={pending || date === (value ?? '')}
      >
        Save end date
      </Button>
    </form>
  );
}
