import {coachApi, type LandingPage, type LandingPageUpsertRequest} from '@/api/generated';

export type {LandingPage} from '@/api/generated';

export type Template = 'proof_first' | 'problem_fit' | 'coach_story';
export type QuestionType = 'short_text' | 'long_text' | 'single_select';

export type ProofDraft = {key: string; label: string; value: string};
export type FitDraft = {key: string; value: string};
export type QuestionDraft = {key: string; id: string; label: string; type: QuestionType; options: string[]};
export type ProgramDraft = {
  key: string;
  name: string;
  audience: string;
  description: string;
  price_display: string;
};

export type LandingDraft = {
  slug: string;
  template: Template;
  eyebrow: string;
  headline: string;
  subheadline: string;
  coach_intro: string;
  hero_image_url: string;
  status: 'draft' | 'published';
  proof_points: ProofDraft[];
  fit_points: FitDraft[];
  application_questions: QuestionDraft[];
  programs: ProgramDraft[];
};

export const TEMPLATES: {value: Template; label: string; blurb: string}[] = [
  {value: 'proof_first', label: 'Proof first', blurb: 'Lead with results and social proof.'},
  {value: 'problem_fit', label: 'Problem fit', blurb: 'Help a specific visitor self-qualify.'},
  {value: 'coach_story', label: 'Coach story', blurb: 'Win trust with your voice and philosophy.'},
];

const key = () => crypto.randomUUID();

const DEFAULT_QUESTIONS: {label: string; type: QuestionType}[] = [
  {label: 'What is your main goal?', type: 'long_text'},
  {label: 'What is your experience level?', type: 'short_text'},
  {label: 'What is your biggest challenge?', type: 'long_text'},
  {label: 'How soon do you want to start?', type: 'short_text'},
  {label: 'Anything else your coach should know?', type: 'long_text'},
];

export function emptyLandingDraft(): LandingDraft {
  return {
    slug: '',
    template: 'proof_first',
    eyebrow: '',
    headline: '',
    subheadline: '',
    coach_intro: '',
    hero_image_url: '',
    status: 'draft',
    proof_points: [],
    fit_points: [],
    application_questions: DEFAULT_QUESTIONS.map((q) => ({
      key: key(),
      id: key(),
      label: q.label,
      type: q.type,
      options: [],
    })),
    programs: [{key: key(), name: '', audience: '', description: '', price_display: ''}],
  };
}

export function landingToDraft(page: LandingPage): LandingDraft {
  return {
    slug: page.slug,
    template: page.template,
    eyebrow: page.eyebrow ?? '',
    headline: page.headline,
    subheadline: page.subheadline ?? '',
    coach_intro: page.coach_intro ?? '',
    hero_image_url: page.hero_image_url ?? '',
    status: page.status,
    proof_points: (page.proof_points ?? []).map((p) => ({key: key(), label: p.label ?? '', value: p.value ?? ''})),
    fit_points: (page.fit_points ?? []).map((value) => ({key: key(), value})),
    application_questions: (page.application_questions ?? []).map((q) => ({
      key: key(),
      id: q.id ?? key(),
      label: q.label ?? '',
      type: (q.type ?? 'short_text') as QuestionType,
      options: q.options ?? [],
    })),
    programs: page.programs.map((p) => ({
      key: key(),
      name: p.name,
      audience: p.audience ?? '',
      description: p.description ?? '',
      price_display: p.price_display ?? '',
    })),
  };
}

const trimmed = (value: string) => value.trim();
const orNull = (value: string) => (trimmed(value) ? trimmed(value) : null);

export function draftToRequest(draft: LandingDraft): LandingPageUpsertRequest {
  return {
    slug: trimmed(draft.slug),
    template: draft.template,
    eyebrow: orNull(draft.eyebrow),
    headline: trimmed(draft.headline),
    subheadline: orNull(draft.subheadline),
    coach_intro: orNull(draft.coach_intro),
    hero_image_url: orNull(draft.hero_image_url),
    status: draft.status,
    proof_points: draft.proof_points
      .filter((p) => trimmed(p.label) || trimmed(p.value))
      .map((p) => ({label: trimmed(p.label), value: trimmed(p.value)})),
    fit_points: draft.fit_points.map((f) => trimmed(f.value)).filter(Boolean),
    application_questions: draft.application_questions
      .filter((q) => trimmed(q.label))
      .map((q) => ({
        id: q.id,
        label: trimmed(q.label),
        type: q.type,
        options: q.type === 'single_select' ? q.options.map(trimmed).filter(Boolean) : [],
      })),
    programs: draft.programs
      .filter((p) => trimmed(p.name))
      .map((p) => ({
        name: trimmed(p.name),
        audience: orNull(p.audience),
        description: orNull(p.description),
        price_display: orNull(p.price_display),
      })),
  };
}

const enhanced = coachApi.enhanceEndpoints({
  endpoints: {
    getLandingPage: {providesTags: [{type: 'LandingPage', id: 'CURRENT'}]},
    saveLandingPage: {invalidatesTags: [{type: 'LandingPage', id: 'CURRENT'}]},
  },
});

export const {useGetLandingPageQuery, useSaveLandingPageMutation} = enhanced;
