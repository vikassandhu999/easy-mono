/**
 * Per-answer-type iconography for the form builder (FB). The labels live in
 * `FORM_QUESTION_TYPE_LABELS` (`@/api/checkins`); only the lucide icon that
 * fronts a question row / palette tile is app-side presentation, so it lives
 * here rather than in the API module.
 */
import {Calendar, Camera, CircleDot, HandHeart, Hash, ListChecks, Scale, Star, ToggleLeft, Type} from 'lucide-react';
import type {ComponentType, SVGProps} from 'react';

import {FORM_QUESTION_TYPE_LABELS, type FormPurpose, type FormQuestionType} from '@/api/checkins';

type QuestionTypeIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const QUESTION_TYPE_ICONS: Record<FormQuestionType, QuestionTypeIcon> = {
  boolean: ToggleLeft,
  date: Calendar,
  multi_select: ListChecks,
  number: Hash,
  photo: Camera,
  rating: Star,
  select: CircleDot,
  service_type: HandHeart,
  text: Type,
  weight: Scale,
};

/** Palette / answer-type order — matches COPY.md § FB "Answer types". */
export const QUESTION_TYPE_ORDER = [
  'text',
  'number',
  'rating',
  'boolean',
  'select',
  'multi_select',
  'photo',
  'date',
  'weight',
] as const satisfies readonly FormQuestionType[];

export const QUESTION_TYPES_WITH_OPTIONS: FormQuestionType[] = ['select', 'multi_select'];

export function questionTypeOrder(purpose: FormPurpose, serviceTypeAvailable = true): FormQuestionType[] {
  return purpose === 'intake' && serviceTypeAvailable
    ? [...QUESTION_TYPE_ORDER, 'service_type']
    : [...QUESTION_TYPE_ORDER];
}

/** Service type's label, answer type, required flag, and uniqueness are the
 *  capture contract — the builder must not let a coach edit them. */
export function questionIdentityLocked(type: FormQuestionType): boolean {
  return type === 'service_type';
}

export function questionTypeLabel(type: FormQuestionType): string {
  return FORM_QUESTION_TYPE_LABELS[type];
}
