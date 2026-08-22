// Tiny typed client for the two public landing-funnel endpoints. The website is
// mostly-static Next, so a plain fetch beats pulling in RTK Query here.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
export const COACHAPP_URL = process.env.NEXT_PUBLIC_COACHAPP_URL || 'http://localhost:2021';

export type Template = 'proof_first' | 'problem_fit' | 'coach_story';
export type QuestionType = 'short_text' | 'long_text' | 'single_select';

export type Program = {
  id: string;
  name: string;
  audience?: string | null;
  promise?: string | null;
  description?: string | null;
  price_display?: string | null;
  position: number;
};

export type Question = {
  id?: string;
  label?: string;
  type?: QuestionType;
  options?: string[];
};

export type ProofPoint = {label?: string; value?: string};

export type LandingPage = {
  slug: string;
  template: Template;
  eyebrow?: string | null;
  headline: string;
  subheadline?: string | null;
  coach_intro?: string | null;
  hero_image_url?: string | null;
  proof_points?: ProofPoint[];
  fit_points?: string[];
  application_questions: Question[];
  programs: Program[];
  business_name: string;
  whatsapp_number?: string | null;
};

export type ApplicationResult = {
  id: string;
  name: string;
  program_name?: string | null;
  business_name: string;
  whatsapp_number?: string | null;
};

export type ApplicationInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  landing_program_id?: string | null;
  answers: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseLandingPage(value: unknown): LandingPage {
  if (!isRecord(value)) {
    throw new Error('Invalid landing page payload');
  }
  if (
    typeof value.slug !== 'string' ||
    typeof value.headline !== 'string' ||
    typeof value.business_name !== 'string' ||
    typeof value.template !== 'string' ||
    !Array.isArray(value.application_questions) ||
    !Array.isArray(value.programs)
  ) {
    throw new Error('Invalid landing page payload');
  }
  return value as LandingPage;
}

function parseApplicationResult(value: unknown): ApplicationResult {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.business_name !== 'string'
  ) {
    throw new Error('Invalid application payload');
  }
  return value as ApplicationResult;
}

/** Server-side fetch of a published landing page. Returns null on 404. */
export async function fetchLandingPage(slug: string): Promise<LandingPage | null> {
  const res = await fetch(`${API_BASE_URL}/v1/public/landing-pages/${encodeURIComponent(slug)}`, {
    next: {revalidate: 60},
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to load landing page (${res.status})`);
  }
  const body: unknown = await res.json();
  if (!isRecord(body) || !('data' in body)) {
    throw new Error('Invalid landing page payload');
  }
  return parseLandingPage(body.data);
}

export type SubmitResult =
  | {ok: true; data: ApplicationResult}
  | {ok: false; fieldErrors: Record<string, string[]>; message: string};

/** Client-side application submit. Surfaces field errors for inline display. */
export async function submitApplication(slug: string, input: ApplicationInput): Promise<SubmitResult> {
  const res = await fetch(`${API_BASE_URL}/v1/public/landing-pages/${encodeURIComponent(slug)}/applications`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(input),
  });

  if (res.ok) {
    const body: unknown = await res.json();
    if (!isRecord(body) || !('data' in body)) {
      throw new Error('Invalid application payload');
    }
    return {ok: true, data: parseApplicationResult(body.data)};
  }

  const body: unknown = await res.json().catch(() => null);
  const record = isRecord(body) ? body : null;
  const detail = isRecord(record?.error_detail) ? record.error_detail : null;
  const fields = isRecord(detail?.fields) ? detail.fields : null;
  const fieldErrors = fields
    ? Object.fromEntries(
        Object.entries(fields).flatMap(([key, value]) =>
          Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? [[key, value]] : [],
        ),
      )
    : {};
  return {
    fieldErrors,
    message:
      typeof record?.error_message === 'string' ? record.error_message : 'Something went wrong. Please try again.',
    ok: false,
  };
}

/** Builds a wa.me deep link prefilled with the application summary + a stable prospect ref. */
export function whatsappLink(
  number: string,
  args: {
    businessName: string;
    name: string;
    programName?: string | null;
    summary: string;
    ref: string;
    coachLink?: string;
  },
): string {
  const digits = number.replace(/[^0-9]/g, '');
  const lines = [
    `Hi ${args.businessName}, I'm ${args.name} and I just applied through your page.`,
    args.programName ? `Program: ${args.programName}` : '',
    args.summary,
    // Stable reference so the coach can tie this chat back to the saved Prospect.
    `Ref: ${args.ref}`,
    args.coachLink ?? '',
  ].filter(Boolean);
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}
