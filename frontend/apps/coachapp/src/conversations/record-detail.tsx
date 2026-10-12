import {generatePath, Link} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useTrainingSession} from '../api/training-sessions';
import {routes} from '../routes';
import {setValues} from '../training-sessions/session';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import type {RecordReference} from './draft';

export function RecordDetail({
  clientId,
  record,
  onDiscuss,
}: {
  clientId: string;
  record: RecordReference;
  onDiscuss: (record: RecordReference) => void;
}) {
  switch (record.type) {
    case 'training_session':
      return (
        <WorkoutRecord
          clientId={clientId}
          record={record}
          onDiscuss={onDiscuss}
        />
      );
  }
}
type Props = {clientId: string; record: RecordReference; onDiscuss: (record: RecordReference) => void};
function Changed({current, referenced}: {current: number; referenced: number}) {
  return current !== referenced ? (
    <p
      role="status"
      className="rounded-xl bg-muted p-3 text-sm"
    >
      This record changed after it was referenced. You are viewing the latest version, revision {current}. The message
      preview preserves its original summary, not the full earlier record.
    </p>
  ) : null;
}
function WorkoutRecord({clientId, record, onDiscuss}: Props) {
  const query = useTrainingSession(clientId, record.id);
  const session = query.data?.data;
  if (!session) {
    return <RecordLoading query={query} />;
  }
  return (
    <div className="space-y-4">
      <Changed
        current={session.revision}
        referenced={record.revision}
      />
      <p className="text-sm">Workout on {session.local_date}</p>
      <p className="text-xs text-muted-foreground">
        Recorded {new Date(session.ended_at ?? session.inserted_at).toLocaleString()}
      </p>
      <Button
        variant="outline"
        onPress={() => onDiscuss({...record, revision: session.revision})}
      >
        Discuss
      </Button>
      {session.notes && <p className="whitespace-pre-wrap text-sm">{session.notes}</p>}
      <ul className="space-y-3">
        {session.performed_sets.map((set) => (
          <li
            key={set.id}
            className="border-b border-border pb-3 text-sm"
          >
            <p className="font-medium">{set.exercise_name}</p>
            <p className="text-muted-foreground">
              {set.outcome} · {setValues(set)}
            </p>
            {set.notes && <p className="mt-1 whitespace-pre-wrap">{set.notes}</p>}
          </li>
        ))}
      </ul>
      <Link
        className="text-link text-sm"
        state={{returnTo: generatePath(routes.clientConversation, {clientId}), returnLabel: 'Back to conversation'}}
        to={generatePath(routes.trainingSession, {clientId, id: record.id})}
      >
        Full workout and prescription
      </Link>
    </div>
  );
}
function RecordLoading({query}: {query: {isPending: boolean; error: Error | null; refetch: () => unknown}}) {
  return query.isPending ? (
    <p role="status">Loading record…</p>
  ) : (
    <div className="space-y-3">
      <FormError
        message={errorMessage(
          query.error,
          'This record is unavailable. Earlier message previews remain in the conversation.',
        )}
      />
      <Button
        variant="outline"
        onPress={() => {
          query.refetch();
        }}
      >
        Retry record
      </Button>
    </div>
  );
}
