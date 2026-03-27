// ── Shared storefront types ──────────────────────────────────
// Used by both coachapp-v2 (editor) and website (public page).
// Single source of truth — no duplicated type definitions.

export type StoreProfileThemeColor = 'blue' | 'green' | 'orange' | 'purple';

export type IntakeQuestion = {
  label: string;
  type: 'number' | 'select' | 'text';
  required?: boolean;
  options?: string[];
};

export type TrustStat = {
  label: string;
  value: string;
};

export type FaqItem = {
  answer: string;
  question: string;
};

// ── Public types (returned by /v1/public/coaches/:slug/profile) ──

export type PublicStoreProfile = {
  slug: string;
  display_name: string;
  headline: null | string;
  bio: null | string;
  photo_url: null | string;
  cover_image_url: null | string;
  social_links: Record<string, string>;
  theme_color: StoreProfileThemeColor;
  intake_questions: IntakeQuestion[];
  trust_stats: TrustStat[];
  faq_items: FaqItem[];
  whatsapp_cta_enabled: boolean;
  whatsapp_cta_message: null | string;
};

export type PublicOffer = {
  id: string;
  name: string;
  slug: string;
  description: null | string;
  type: null | string;
  duration_text: null | string;
  price: null | number;
  currency: null | string;
  price_display: null | string;
  features: string[];
  is_featured: boolean;
  cta_text: null | string;
};

export type PublicTestimonial = {
  id: string;
  client_name: string;
  client_handle: null | string;
  quote: null | string;
  rating: null | number;
  result_tag: null | string;
  program_name: null | string;
  duration_text: null | string;
  before_image_url: null | string;
  after_image_url: null | string;
  before_weight: null | string;
  after_weight: null | string;
  is_featured: boolean;
};

export type PublicStorefront = {
  profile: PublicStoreProfile;
  offers: PublicOffer[];
  testimonials: PublicTestimonial[];
};

export type PublicLeadCreateRequest = {
  name: string;
  email: string;
  phone: string;
  instagram_handle?: null | string;
  offer_id?: null | string;
  offer_slug?: null | string;
  intake_answers?: Record<string, unknown>;
  source?: null | string;
};
