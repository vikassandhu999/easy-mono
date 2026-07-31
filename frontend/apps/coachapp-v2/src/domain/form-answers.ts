/**
 * Check-in / intake form answers, rendered. Owned here (not a feature lib)
 * because both the client-detail screens and the check-ins review queue read
 * the same `question_snapshot` + `answers` shape.
 */

/** The question types a form can hold, from the generated `question_snapshot`. */
export type AnswerType =
  | 'boolean'
  | 'date'
  | 'multi_select'
  | 'number'
  | 'photo'
  | 'rating'
  | 'select'
  | 'text'
  | 'weight';

/**
 * One answer, rendered. Shared by CD-IR, CD-CS, the CD-OV summary and the
 * check-ins review queue — they had four copies and two shipped bugs the
 * others had already fixed.
 *
 * `photo` is the reason this needs the question TYPE and not just the value: a
 * photo answer is an attachment id, and rendering it as a string puts a raw UUID
 * on screen (it overflowed the CD-OV card). An id is never display text.
 */
export function formatAnswer(value: unknown, type?: AnswerType): string {
  if (type === 'photo') {
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    return count === 0 ? '—' : count === 1 ? 'Photo attached' : `${count} photos attached`;
  }
  if (value == null || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(' · ') : '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/**
 * Every photo a submission carries, in the order the form asks for them.
 *
 * The ids live in the ANSWERS of `photo`-type questions, NOT in `attachments`,
 * which comes back empty on this endpoint — reading `attachments` is why CD-CS,
 * CD-CI, CD-OV and the whole of CD-PH showed no photos for a client who had
 * submitted three. `attachments` is still merged in, for a response that populates
 * it.
 */
export function submissionPhotoIds(submission: {
  answers?: null | Record<string, unknown>;
  attachments?: null | {content_type: string; id: string}[];
  question_snapshot?: null | {questions?: {id: string; type?: AnswerType}[]}[];
}): string[] {
  const answers = (submission.answers ?? {}) as Record<string, unknown>;
  const ids: string[] = [];

  for (const section of submission.question_snapshot ?? []) {
    for (const question of section.questions ?? []) {
      if (question.type !== 'photo') {
        continue;
      }
      const value = answers[question.id];
      for (const id of Array.isArray(value) ? value : value ? [value] : []) {
        if (typeof id === 'string' && !ids.includes(id)) {
          ids.push(id);
        }
      }
    }
  }
  for (const attachment of submission.attachments ?? []) {
    if (attachment.content_type.startsWith('image/') && !ids.includes(attachment.id)) {
      ids.push(attachment.id);
    }
  }
  return ids;
}

/** True when an answer is worth putting in a one-line summary (CD-OV). */
export function isSummarisableAnswer(value: unknown, type?: AnswerType): boolean {
  return type !== 'photo' && value != null && value !== '' && !(Array.isArray(value) && value.length === 0);
}
