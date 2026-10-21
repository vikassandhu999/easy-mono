import type {EntryCreate, Tracker, TrackerEntry} from '../api/trackers';
import {trackerDisplayValue} from '../ui/tracker-values.ts';

export {defaultTrackerUnit, trackerDisplayValue} from '../ui/tracker-values.ts';

export function entryValue(entry: TrackerEntry, unit: string) {
  switch (entry.tracker.kind) {
    case 'number':
      return `${trackerDisplayValue(entry.number_value, entry.tracker, unit)} ${unit}`;
    case 'rating':
      return `${entry.rating_value} of ${entry.tracker.scale_max}`;
    case 'yes_no':
      return entry.yes_no_value ? 'Yes' : 'No';
    case 'text':
      return entry.text_value ?? '';
    case 'photo':
      return 'Photo';
    case 'document':
      return 'Report';
  }
}

export type EntryFields = {
  local_date: string;
  value: string;
  unit: string;
  text: string;
  answer: string;
  captured_on: string;
};

export function entryBody(
  tracker: Tracker,
  fields: EntryFields,
  attachmentIds: string[],
  requestId: string,
): EntryCreate {
  const shared = {tracker_id: tracker.id, local_date: fields.local_date, request_id: requestId};
  switch (tracker.kind) {
    case 'number':
      return {...shared, number_value: Number(fields.value), entered_unit: fields.unit || null};
    case 'rating':
      return {...shared, rating_value: Number(fields.value)};
    case 'yes_no':
      return {...shared, yes_no_value: fields.answer === 'yes'};
    case 'text':
      return {...shared, text_value: fields.text};
    case 'photo':
    case 'document':
      return {...shared, attachment_ids: attachmentIds};
  }
}
