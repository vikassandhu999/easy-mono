/**
 * Check-in / intake form answers, rendered. The check-ins feature OWNS the
 * form vocabulary (`question_snapshot` + `answers`); the client-detail screens
 * consume it from here. Feature `lib/` files are the feature's public surface —
 * importable across features, unlike its components/screens.
 */

import type {FormQuestionType} from '../api/checkins.ts';
import type {components} from '../api/schema.ts';

/** The question types a form can hold, from the generated `question_snapshot`. */
export type AnswerType = FormQuestionType;

type GeneratedSubmission = components['schemas']['ClientProfileFormSubmission'];

/** One section of a submitted form's `question_snapshot`, as the API emits it. */
export type FormSnapshotSection = GeneratedSubmission['question_snapshot'][number];
/** One question inside a snapshot section — a union discriminated on `type`. */
export type FormSnapshotQuestion = FormSnapshotSection['questions'][number];

/**
 * A submitted form, reduced to what rendering an answer needs. Derived from the
 * generated submission so a snapshot or answer shape change breaks the build here.
 */
export type AnsweredSubmission = Pick<GeneratedSubmission, 'answers' | 'attachments' | 'question_snapshot'>;

/**
 * One answer, rendered. Shared by CD-IR, CD-CS, the CD-OV summary and the
 * check-ins review queue — they had four copies and two shipped bugs the
 * others had already fixed.
 *
 * `photo` is the reason this needs the question TYPE and not just the value: a
 * photo answer is an attachment id, and rendering it as a string puts a raw UUID
 * on screen (it overflowed the CD-OV card). An id is never display text.
 */
export function formatAnswer(value: unknown, type: AnswerType): string {
  if (type === 'photo') {
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    return count === 0 ? '—' : count === 1 ? 'Photo attached' : `${count} photos attached`;
  }
  if (value == null || value === '') {
    return '—';
  }
  if (type === 'service_type' && typeof value === 'object' && 'services' in value) {
    const {services} = value;
    if (Array.isArray(services)) {
      return services.map((service) => (service === 'training' ? 'Training' : 'Nutrition')).join(' · ') || '—';
    }
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
export function submissionPhotoIds(submission: AnsweredSubmission): string[] {
  const {answers} = submission;
  const ids: string[] = [];

  for (const section of submission.question_snapshot) {
    for (const question of section.questions) {
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
  for (const attachment of submission.attachments) {
    if (attachment.content_type.startsWith('image/') && !ids.includes(attachment.id)) {
      ids.push(attachment.id);
    }
  }
  return ids;
}

/** True when an answer is worth putting in a one-line summary (CD-OV). */
export function isSummarisableAnswer(value: unknown, type: AnswerType): boolean {
  return type !== 'photo' && value != null && value !== '' && !(Array.isArray(value) && value.length === 0);
}
