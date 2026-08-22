import type {ClientProfileFormTemplate} from '@/api/checkins';

/** Questions across every section — the list row's meta and the intake picker both name it. */
export function questionCount(template: ClientProfileFormTemplate): number {
  return (template.sections ?? []).reduce(
    (sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0),
    0,
  );
}
