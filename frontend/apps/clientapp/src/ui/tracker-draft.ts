import type {Tracker, TrackerEntry, TrackerEvent, TrackerInput} from '../api/trackers';

export type TrackerDraft = {
  version: 1;
  resource: string;
  requestId: string;
  expectedRevision: number;
  date: string;
  value: string;
  unit: string;
  files: string[];
  fileGroup: string;
  capturedOn: string;
  attempt: TrackerInput | null;
};
export function defaultTrackerUnit(tracker: Tracker, system: string) {
  const preferred =
    system === 'imperial'
      ? ({kg: 'lb', cm: 'in', ml: 'fl_oz'} as Record<string, string>)[tracker.base_unit ?? '']
      : undefined;
  return tracker.built_in && preferred && tracker.units.some((item) => item.unit === preferred)
    ? preferred
    : (tracker.base_unit ?? '');
}
export function trackerDraft(
  resource: string,
  tracker: Tracker,
  date: string,
  system: string,
  entry?: TrackerEntry,
): TrackerDraft {
  const unit = entry?.entered_unit ?? defaultTrackerUnit(tracker, system);
  const factor = tracker.units.find((item) => item.unit === unit)?.to_base_factor ?? 1;
  return {
    version: 1,
    resource,
    requestId: crypto.randomUUID(),
    expectedRevision: entry?.revision ?? 0,
    date: entry?.local_date ?? date,
    value: entry
      ? entry.number_value !== null
        ? String(factor === 1 ? entry.number_value : Number((entry.number_value / factor).toPrecision(15)))
        : entry.rating_value !== null
          ? String(entry.rating_value)
          : entry.yes_no_value !== null
            ? String(entry.yes_no_value)
            : (entry.text_value ?? '')
      : '',
    unit,
    files: [],
    fileGroup: crypto.randomUUID(),
    capturedOn: date,
    attempt: null,
  };
}
export function parseTrackerDraft(raw: unknown, resource: string): TrackerDraft | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const d = raw as Partial<TrackerDraft>;
  if (
    d.version !== 1 ||
    d.resource !== resource ||
    typeof d.requestId !== 'string' ||
    typeof d.expectedRevision !== 'number' ||
    typeof d.date !== 'string' ||
    typeof d.value !== 'string' ||
    typeof d.unit !== 'string' ||
    typeof d.capturedOn !== 'string' ||
    typeof d.fileGroup !== 'string' ||
    !Array.isArray(d.files) ||
    !d.files.every((id) => typeof id === 'string')
  ) {
    return null;
  }
  if (
    d.attempt !== null &&
    (!d.attempt ||
      d.attempt.request_id !== d.requestId ||
      d.attempt.local_date !== d.date ||
      typeof d.attempt.tracker_id !== 'string')
  ) {
    return null;
  }
  if (d.attempt) {
    const a = d.attempt;
    if (
      a.number_value !== undefined &&
      a.number_value !== null &&
      (Number(d.value) !== a.number_value || (d.unit || null) !== a.entered_unit)
    ) {
      return null;
    }
    if (a.rating_value !== undefined && a.rating_value !== null && Number(d.value) !== a.rating_value) {
      return null;
    }
    if (a.yes_no_value !== undefined && a.yes_no_value !== null && d.value !== String(a.yes_no_value)) {
      return null;
    }
    if (a.text_value !== undefined && a.text_value !== null && d.value !== a.text_value) {
      return null;
    }
  }
  return d as TrackerDraft;
}
export function trackerInput(
  draft: TrackerDraft,
  tracker: Tracker,
  attachmentIds: string[],
  event?: TrackerEvent,
): TrackerInput {
  if (draft.attempt) {
    return draft.attempt;
  }
  const input: TrackerInput = {tracker_id: tracker.id, request_id: draft.requestId, local_date: draft.date, ...event};
  if (tracker.kind === 'number' || tracker.kind === 'rating') {
    const value = Number(draft.value);
    if (!draft.value.trim() || !Number.isFinite(value)) {
      throw new Error('Enter a number.');
    }
    if (tracker.kind === 'rating') {
      if (!Number.isInteger(value) || value < 1 || value > (tracker.scale_max ?? 5)) {
        throw new Error(`Choose a rating from 1 to ${tracker.scale_max ?? 5}.`);
      }
      input.rating_value = value;
    } else {
      input.number_value = value;
      input.entered_unit = draft.unit || null;
    }
  } else if (tracker.kind === 'yes_no') {
    if (!['true', 'false'].includes(draft.value)) {
      throw new Error('Choose Yes or No.');
    }
    input.yes_no_value = draft.value === 'true';
  } else if (tracker.kind === 'text') {
    if (!draft.value.trim()) {
      throw new Error('Enter your text.');
    }
    input.text_value = draft.value;
  } else {
    if (!attachmentIds.length) {
      throw new Error(tracker.kind === 'photo' ? 'Choose a photo.' : 'Choose at least one report file.');
    }
    input.attachment_ids = attachmentIds;
  }
  return input;
}

export function restoreTrackerFiles(draft: TrackerDraft, storedIds: string[]): TrackerDraft {
  return draft.attempt ? draft : {...draft, files: [...new Set([...draft.files, ...storedIds])]};
}
export function reviewTrackerDraft(draft: TrackerDraft, revision: number): TrackerDraft {
  return {...draft, attempt: null, requestId: crypto.randomUUID(), expectedRevision: revision};
}

export function settledTrackerDraft(
  draft: TrackerDraft,
  accepted: TrackerEntry,
  today: string,
  system: string,
): TrackerDraft {
  return trackerDraft(
    draft.resource,
    accepted.tracker,
    today,
    system,
    draft.expectedRevision > 0 ? accepted : undefined,
  );
}
