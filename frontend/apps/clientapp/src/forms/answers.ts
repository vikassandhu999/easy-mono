import type {FormAssignmentAnswer, FormTemplateQuestion, FormWeightUnit} from '../api/forms';

export type FormValues = {answers: FormAssignmentAnswer[]};
export type DraftAnswer = {id: string; label: string; shape: string; value: FormAssignmentAnswer; photo?: boolean};
export type FormDraft = {
  revision: number;
  answers: DraftAnswer[];
  previous: DraftAnswer[];
  weightUnit?: FormWeightUnit;
};

export function questionShape(question: FormTemplateQuestion) {
  return JSON.stringify([
    question.id,
    question.type,
    question.label,
    question.required,
    'options' in question ? question.options : [],
  ]);
}

function isAnswer(value: unknown): value is FormAssignmentAnswer {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string');
  }
  return Boolean(
    value &&
      typeof value === 'object' &&
      'services' in value &&
      Array.isArray(value.services) &&
      value.services.every((item: unknown) => typeof item === 'string'),
  );
}

function isDraftAnswer(value: unknown): value is DraftAnswer {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      'label' in value &&
      typeof value.label === 'string' &&
      'shape' in value &&
      typeof value.shape === 'string' &&
      'value' in value &&
      isAnswer(value.value) &&
      (!('photo' in value) || typeof value.photo === 'boolean'),
  );
}

export function parseFormDraft(value: unknown): FormDraft | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !('answers' in value) ||
    !Array.isArray(value.answers) ||
    !value.answers.every(isDraftAnswer) ||
    !('previous' in value) ||
    !Array.isArray(value.previous) ||
    !value.previous.every(isDraftAnswer)
  ) {
    return null;
  }
  return {
    revision: value.revision,
    answers: value.answers,
    previous: value.previous,
    ...('weightUnit' in value && (value.weightUnit === 'kg' || value.weightUnit === 'lbs')
      ? {weightUnit: value.weightUnit}
      : {}),
  };
}

export function hasAnswer(value: FormAssignmentAnswer | undefined) {
  if (value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return value.services.length > 0;
  }
  return true;
}

export function answerText(value: FormAssignmentAnswer | undefined) {
  if (!hasAnswer(value)) {
    return 'No answer';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value && typeof value === 'object') {
    return value.services.join(', ');
  }
  return String(value);
}

export function submissionAnswers(questions: FormTemplateQuestion[], values: FormValues) {
  return Object.fromEntries(
    questions.flatMap((question, index) => {
      const value = values.answers[index];
      if (value === undefined || !hasAnswer(value)) {
        return [];
      }
      const answer =
        ['number', 'rating', 'weight'].includes(question.type) && typeof value === 'string' ? Number(value) : value;
      return [[question.id, answer]];
    }),
  );
}
