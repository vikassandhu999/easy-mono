import {useState} from 'react';
import {type Tracker, type TrackerEvent, useTrackerPrompts} from '../api/trackers';
import {Button} from './button';
import {useCoaching} from './coaching';
import {ReadState} from './read-state';
import {TrackerRecording} from './tracker-recording';

export function TrackerPrompts({event, date}: {event: TrackerEvent; date: string}) {
  const {canWrite} = useCoaching();
  const query = useTrackerPrompts(event, canWrite);
  const [selected, setSelected] = useState<Tracker | null>(null);
  if (!canWrite) {
    return null;
  }
  if (!query.data) {
    return (
      <ReadState
        label="Trackers for this record"
        failed={query.isError}
        retry={() => {
          query.refetch();
        }}
      />
    );
  }
  if (!query.data.data.length && !selected) {
    return null;
  }
  return (
    <section
      className="space-y-3"
      aria-label="Trackers for this record"
    >
      <h2 className="text-lg font-semibold">{event.about_session_id ? 'After your workout' : 'After your meal'}</h2>
      <p className="text-sm text-muted-foreground">
        Your {event.about_session_id ? 'workout' : 'meal'} is saved. Record these when you are ready.
      </p>
      {query.data.data.map((item) => (
        <Button
          key={item.id}
          variant="outline"
          onPress={() => setSelected(item.tracker)}
        >
          Record {item.tracker.name}
        </Button>
      ))}
      {selected && (
        <TrackerRecording
          key={selected.id}
          tracker={selected}
          date={date}
          event={event}
          onSaved={() => setSelected(null)}
        />
      )}
    </section>
  );
}
