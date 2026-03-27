import type {
  FaqItem,
  IntakeQuestion,
  PublicStoreProfile,
  StoreProfileThemeColor,
  TrustStat,
} from '@easy/storefront-types';

import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

// ── Store Profile (extends public profile with coach-private fields) ──

export type StoreProfile = PublicStoreProfile & {
  id: string;
  is_published: boolean;
  inserted_at: string;
  updated_at: string;
};

export type StoreProfileUpsertRequest = {
  slug: string;
  display_name: string;
  headline?: null | string;
  bio?: null | string;
  photo_url?: null | string;
  cover_image_url?: null | string;
  social_links?: Record<string, string>;
  theme_color?: StoreProfileThemeColor;
  is_published?: boolean;
  intake_questions?: IntakeQuestion[];
  trust_stats?: TrustStat[];
  faq_items?: FaqItem[];
  whatsapp_cta_enabled?: boolean;
  whatsapp_cta_message?: null | string;
};

/** Response wraps `data` as either a StoreProfile or null (when no profile exists yet). */
export type StoreProfileResponse = {
  data: null | StoreProfile;
};

// ── Slug check ───────────────────────────────────────────────

export type SlugCheckRequest = {
  slug: string;
};

export type SlugCheckResponse = {
  available: boolean;
};

// ── Endpoints ────────────────────────────────────────────────

export const storefrontApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStoreProfile: build.query<StoreProfileResponse, void>({
      query: () => '/v1/coach/storefront/profile',
      providesTags: [{type: 'StoreProfile', id: 'PROFILE'}],
    }),
    upsertStoreProfile: build.mutation<ApiResponse<StoreProfile>, StoreProfileUpsertRequest>({
      query: (body) => ({
        url: '/v1/coach/storefront/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{type: 'StoreProfile', id: 'PROFILE'}],
    }),
    checkSlugAvailability: build.mutation<SlugCheckResponse, SlugCheckRequest>({
      query: (body) => ({
        url: '/v1/coach/storefront/check-slug',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {useCheckSlugAvailabilityMutation, useGetStoreProfileQuery, useUpsertStoreProfileMutation} = storefrontApi;
