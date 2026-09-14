import type {LandingPageApplication} from '../api/landing-page';

const storageKey = (slug: string) => `easy:coaching-application:${slug}`;
type SavedApplication = LandingPageApplication & {request_id: string};

export function readApplication(slug: string): SavedApplication | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) {
      return null;
    }
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      !('request_id' in value) ||
      typeof value.request_id !== 'string' ||
      !('name' in value) ||
      typeof value.name !== 'string' ||
      !('email' in value) ||
      typeof value.email !== 'string' ||
      !('phone' in value) ||
      typeof value.phone !== 'string' ||
      !('instagram' in value) ||
      typeof value.instagram !== 'string' ||
      !('expected_revision' in value) ||
      typeof value.expected_revision !== 'number' ||
      !('landing_program_id' in value) ||
      (value.landing_program_id !== null && typeof value.landing_program_id !== 'string') ||
      !('answers' in value) ||
      !value.answers ||
      typeof value.answers !== 'object' ||
      Array.isArray(value.answers)
    ) {
      return null;
    }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !uuid.test(value.request_id) ||
      ('landing_page_id' in value &&
        (typeof value.landing_page_id !== 'string' || !uuid.test(value.landing_page_id))) ||
      !Number.isSafeInteger(value.expected_revision) ||
      value.expected_revision < 1 ||
      (value.landing_program_id !== null && !uuid.test(value.landing_program_id))
    ) {
      return null;
    }
    const answers: Record<string, string> = {};
    for (const [key, answer] of Object.entries(value.answers)) {
      if (typeof answer !== 'string') {
        return null;
      }
      Object.defineProperty(answers, key, {value: answer, enumerable: true});
    }
    return {
      ...('landing_page_id' in value && typeof value.landing_page_id === 'string'
        ? {landing_page_id: value.landing_page_id}
        : {}),
      request_id: value.request_id,
      name: value.name,
      email: value.email,
      phone: value.phone,
      instagram: value.instagram,
      expected_revision: value.expected_revision,
      landing_program_id: value.landing_program_id,
      answers,
    };
  } catch {
    return null;
  }
}

export function saveApplication(slug: string, body: SavedApplication) {
  sessionStorage.setItem(storageKey(slug), JSON.stringify(body));
}

export function clearApplication(slug: string) {
  try {
    sessionStorage.removeItem(storageKey(slug));
  } catch {
    /* A confirmed application is also cleared from memory. */
  }
}
