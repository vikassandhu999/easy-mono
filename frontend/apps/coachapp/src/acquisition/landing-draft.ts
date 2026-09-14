import type {LandingPagePublic, LandingPageUpsert} from '../api/landing-page';

type Question = NonNullable<LandingPageUpsert['application_questions']>[number];
export type QuestionType = NonNullable<Question['type']>;

export function landingDraft(
  page: Omit<LandingPagePublic, 'business_name' | 'whatsapp_number'> | null,
  handle: string,
) {
  return {
    revision: page?.revision ?? 0,
    slug: page?.slug ?? handle,
    template: page?.template ?? 'coach_story',
    headline: page?.headline ?? '',
    eyebrow: page?.eyebrow ?? '',
    subheadline: page?.subheadline ?? '',
    coach_intro: page?.coach_intro ?? '',
    hero_image_url: page?.hero_image_url ?? '',
    programs: (page?.programs ?? []).map((program) => ({
      programRef: program.id,
      name: program.name,
      audience: program.audience ?? '',
      promise: program.promise ?? '',
      description: program.description ?? '',
      price_display: program.price_display ?? '',
    })),
    proof_points: (page?.proof_points ?? []).map((point) => ({label: point.label ?? '', value: point.value ?? ''})),
    fit_points: (page?.fit_points ?? []).map((value) => ({value})),
    application_questions: (page?.application_questions ?? []).map((question) => ({
      questionId: question.id ?? crypto.randomUUID(),
      label: question.label ?? '',
      type: question.type ?? 'long_text',
      optionsText: (question.options ?? []).join('\n'),
    })),
  };
}

export type LandingDraft = ReturnType<typeof landingDraft>;

export function pageInput(draft: LandingDraft, status: LandingPageUpsert['status']): LandingPageUpsert {
  return {
    expected_revision: draft.revision,
    slug: draft.slug.trim(),
    template: draft.template,
    headline: draft.headline.trim(),
    eyebrow: draft.eyebrow.trim() || null,
    subheadline: draft.subheadline.trim() || null,
    coach_intro: draft.coach_intro.trim() || null,
    hero_image_url: draft.hero_image_url.trim() || null,
    status,
    programs: draft.programs.map((program) => ({
      ...(program.programRef ? {id: program.programRef} : {}),
      name: program.name.trim(),
      audience: program.audience.trim(),
      promise: program.promise.trim(),
      description: program.description.trim(),
      price_display: program.price_display.trim(),
    })),
    proof_points: draft.proof_points.map((point) => ({label: point.label.trim(), value: point.value.trim()})),
    fit_points: draft.fit_points.map((point) => point.value.trim()),
    application_questions: draft.application_questions.map((question) => ({
      id: question.questionId,
      label: question.label.trim(),
      type: question.type,
      options:
        question.type === 'single_select'
          ? question.optionsText
              .split('\n')
              .map((option) => option.trim())
              .filter(Boolean)
          : [],
    })),
  };
}
