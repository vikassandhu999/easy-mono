import {api} from '@/api/base';

// ── Public store profile (subset of StoreProfile) ────────────

export type PublicStoreProfile = {
  slug: string;
  display_name: string;
  headline: null | string;
  bio: null | string;
  photo_url: null | string;
  cover_image_url: null | string;
  social_links: Record<string, string>;
  theme_color: string;
  intake_questions: Record<string, unknown>[];
  trust_stats: {label: string; value: string}[];
  faq_items: {answer: string; question: string}[];
  whatsapp_cta_enabled: boolean;
  whatsapp_cta_message: null | string;
};

// ── Public offer (subset of Offer) ───────────────────────────

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

// ── Public testimonial (subset of Testimonial) ───────────────

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

// ── Public storefront response ───────────────────────────────

export type PublicStorefront = {
  profile: PublicStoreProfile;
  offers: PublicOffer[];
  testimonials: PublicTestimonial[];
};

export type PublicStorefrontResponse = {
  data: PublicStorefront;
};

// ── Public lead (intake form submission) ─────────────────────

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

export type PublicLead = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export type PublicLeadResponse = {
  data: PublicLead;
};

// ── Endpoints ────────────────────────────────────────────────

export const publicStorefrontApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPublicStorefront: build.query<PublicStorefrontResponse, string>({
      query: (slug) => `/v1/public/coaches/${slug}/profile`,
    }),
    createPublicLead: build.mutation<PublicLeadResponse, {body: PublicLeadCreateRequest; slug: string}>({
      query: ({body, slug}) => ({
        url: `/v1/public/coaches/${slug}/leads`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {useCreatePublicLeadMutation, useGetPublicStorefrontQuery} = publicStorefrontApi;
