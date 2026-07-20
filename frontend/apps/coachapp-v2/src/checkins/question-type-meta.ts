/**
 * Per-answer-type iconography for the form builder (FB). The labels live in
 * `FORM_QUESTION_TYPE_LABELS` (`@/api/checkins`); only the lucide icon that
 * fronts a question row / palette tile is app-side presentation, so it lives
 * here rather than in the API module.
 */
import {Calendar, Camera, CircleDot, Hash, ListChecks, Scale, Star, ToggleLeft, Type} from 'lucide-react';
import type {ComponentType, SVGProps} from 'react';

import {FORM_QUESTION_TYPE_LABELS, type FormQuestionType} from '@/api/checkins';

type QuestionTypeIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const QUESTION_TYPE_ICONS: Record<FormQuestionType, QuestionTypeIcon> = {
  boolean: ToggleLeft,
  date: Calendar,
  multi_select: ListChecks,
  number: Hash,
  photo: Camera,
  rating: Star,
  select: CircleDot,
  text: Type,
  weight: Scale,
};

/** Palette / answer-type order — matches COPY.md § FB "Answer types". */
export const QUESTION_TYPE_ORDER: FormQuestionType[] = [
  'text',
  'number',
  'rating',
  'boolean',
  'select',
  'multi_select',
  'photo',
  'date',
  'weight',
];

export const QUESTION_TYPES_WITH_OPTIONS: FormQuestionType[] = ['select', 'multi_select'];

export function questionTypeLabel(type: FormQuestionType): string {
  return FORM_QUESTION_TYPE_LABELS[type];
}
