/**
 * The check-in builder's draft summary, as values.
 *
 * Typed structurally rather than against `SectionDraft` from `@/api/checkins`,
 * so the sibling `.check.ts` can run under bare node without pulling the
 * React Query module (and `client.ts`, and `import.meta.env`) in behind it.
 */
export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** "12 questions · 4 required · 3 sections" — the builder's sub-line. */
export function summarize(sections: {questions: {required: boolean}[]}[]): string {
  const questions = sections.flatMap((section) => section.questions);
  const required = questions.filter((question) => question.required).length;
  return `${pluralize(questions.length, 'question')} · ${required} required · ${pluralize(sections.length, 'section')}`;
}
