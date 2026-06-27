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
  headline: string;
  subheadline?: string | null;
  coach_intro?: string | null;
  proof_points?: ProofPoint[];
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
  const body = (await res.json()) as {data: LandingPage};
  return body.data;
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
    const body = (await res.json()) as {data: ApplicationResult};
    return {ok: true, data: body.data};
  }

  const body = (await res.json().catch(() => null)) as {
    error_message?: string;
    error_detail?: {fields?: Record<string, string[]>};
  } | null;
  return {
    ok: false,
    fieldErrors: body?.error_detail?.fields ?? {},
    message: body?.error_message ?? 'Something went wrong. Please try again.',
  };
}

/** Builds a wa.me deep link prefilled with the application summary. */
export function whatsappLink(
  number: string,
  args: {businessName: string; name: string; programName?: string | null; summary: string},
): string {
  const digits = number.replace(/[^0-9]/g, '');
  const lines = [
    `Hi ${args.businessName}, I'm ${args.name} and I just applied through your page.`,
    args.programName ? `Program: ${args.programName}` : '',
    args.summary,
  ].filter(Boolean);
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}
