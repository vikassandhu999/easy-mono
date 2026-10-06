import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {errorMessage} from '../api/client';
import {type Client, useUpdateClient} from '../api/clients';
import {type Tracker, useChangeTrackerRequest, useTrackerRequests} from '../api/trackers';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {Surface} from '../ui/page';
import {TrackerPicker} from '../ui/tracker-picker';
export function ReviewActions({person}: {person: Client}) {
  const form = useForm({defaultValues: {focus: person.focus ?? ''}});
  const update = useUpdateClient(person.id);
  const requests = useTrackerRequests(person.id);
  const change = useChangeTrackerRequest(person.id);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Tracker | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await update.mutateAsync({focus: values.focus.trim() || null});
      form.reset(values);
      setNotice('Focus saved.');
    } catch (cause) {
      form.setError('root', {message: errorMessage(cause, 'Could not save Focus. Your text is still here.')});
    }
  });
  async function request(input: {tracker_id: string} | {id: string}) {
    setError('');
    try {
      await change.mutateAsync(input);
      setPicking(false);
      setSelected(null);
      setNotice('tracker_id' in input ? 'Tracker requested.' : 'Request cancelled.');
    } catch (cause) {
      setError(errorMessage(cause, 'Could not update the request. Try again.'));
    }
  }
  return (
    <Surface className="space-y-6">
      <h2 className="section-title">Focus and requests</h2>
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="focus"
          label="Focus"
          maxLength={255}
          description="One line pinned on the client's Today screen."
        />
        <FormError message={form.formState.errors.root?.message} />
        <Button
          type="submit"
          variant="outline"
          isPending={update.isPending}
        >
          Save Focus
        </Button>
      </form>
      <div className="space-y-4">
        <h3 className="editor-item-title">Open Tracker requests</h3>
        {requests.isPending && <p role="status">Loading requests…</p>}
        {requests.isError && (
          <>
            <FormError message="Could not refresh requests." />
            <Button
              variant="outline"
              onPress={() => {
                requests.refetch();
              }}
            >
              Retry requests
            </Button>
          </>
        )}
        {requests.data?.data.length === 0 && <p>No open requests.</p>}
        {requests.data?.data.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <p>
              {item.tracker.name} · Waiting on client since {new Date(item.requested_at).toLocaleDateString()}
            </p>
            <Button
              variant="ghost"
              isDisabled={change.isPending}
              onPress={() => {
                request({id: item.id});
              }}
            >
              Cancel request
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onPress={() => setPicking(!picking)}
        >
          Request Tracker
        </Button>
        {picking &&
          (selected ? (
            <div className="space-y-3">
              <p>{selected.name}</p>
              <Button
                isPending={change.isPending}
                onPress={() => {
                  request({tracker_id: selected.id});
                }}
              >
                Request this Tracker
              </Button>
              <Button
                variant="ghost"
                onPress={() => setSelected(null)}
              >
                Choose another Tracker
              </Button>
            </div>
          ) : (
            <TrackerPicker onSelect={setSelected} />
          ))}
        <FormError message={error} />
        {notice && <p role="status">{notice}</p>}
      </div>
    </Surface>
  );
}
