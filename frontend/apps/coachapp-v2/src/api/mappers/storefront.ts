import {omitUndefined, toOptionalText} from '@/api/mappers/shared';
import type {Offer, OfferCreateRequest, OfferUpdateRequest, OfferType} from '@/api/offers';
import type {StoreProfile, StoreProfileUpsertRequest} from '@/api/storefront';
import type {Testimonial, TestimonialCreateRequest, TestimonialUpdateRequest} from '@/api/testimonials';
import type {EditorFormValues} from '@/storefront/components/editor-schema';
import {featuresToFormValues, formValuesToFeatures, type OfferFormValues} from '@/storefront/offer-form/offer-form';
import type {TestimonialFormValues} from '@/storefront/testimonial-form/testimonial-form';

function toOptionalOptions(value: string[] | undefined, type: string): string[] | undefined {
  return type === 'select' ? value?.filter(Boolean) : undefined;
}

function toOptionalSocialLinks(values: EditorFormValues): Record<string, string> | undefined {
  const socialLinks = omitUndefined({
    instagram: toOptionalText(values.instagram),
    whatsapp: toOptionalText(values.whatsapp),
    youtube: toOptionalText(values.youtube),
  });
  return Object.keys(socialLinks).length > 0 ? socialLinks : undefined;
}

export function offerFromApi(offer: Offer): Offer {
  return offer;
}

export function offerToFormValues(offer: Offer): OfferFormValues {
  return {
    cta_text: offer.cta_text ?? '',
    description: offer.description ?? '',
    duration_text: offer.duration_text ?? '',
    features: featuresToFormValues(offer.features ?? []),
    is_featured: offer.is_featured,
    name: offer.name,
    price_display: offer.price_display ?? '',
    type: offer.type ?? undefined,
  };
}

export function offerToCreateRequest(values: OfferFormValues): OfferCreateRequest {
  const features = formValuesToFeatures(values.features);
  return omitUndefined({
    cta_text: toOptionalText(values.cta_text),
    description: toOptionalText(values.description),
    duration_text: toOptionalText(values.duration_text),
    features: features.length > 0 ? features : undefined,
    is_featured: values.is_featured,
    name: values.name,
    price_display: toOptionalText(values.price_display),
    type: values.type as OfferType | undefined,
  });
}

export function offerToUpdateRequest(values: OfferFormValues): OfferUpdateRequest {
  return offerToCreateRequest(values);
}

export function testimonialFromApi(testimonial: Testimonial): Testimonial {
  return testimonial;
}

export function testimonialToFormValues(testimonial: Testimonial): TestimonialFormValues {
  return {
    after_image_url: testimonial.after_image_url ?? '',
    after_weight: testimonial.after_weight ? parseFloat(testimonial.after_weight) : undefined,
    before_image_url: testimonial.before_image_url ?? '',
    before_weight: testimonial.before_weight ? parseFloat(testimonial.before_weight) : undefined,
    client_handle: testimonial.client_handle ?? '',
    client_name: testimonial.client_name,
    duration_text: testimonial.duration_text ?? '',
    is_featured: testimonial.is_featured,
    program_name: testimonial.program_name ?? '',
    quote: testimonial.quote ?? '',
    rating: testimonial.rating ?? undefined,
    result_tag: testimonial.result_tag ?? '',
  };
}

export function testimonialToCreateRequest(values: TestimonialFormValues): TestimonialCreateRequest {
  return omitUndefined({
    after_image_url: toOptionalText(values.after_image_url),
    after_weight: values.after_weight,
    before_image_url: toOptionalText(values.before_image_url),
    before_weight: values.before_weight,
    client_handle: toOptionalText(values.client_handle),
    client_name: values.client_name,
    duration_text: toOptionalText(values.duration_text),
    is_featured: values.is_featured,
    program_name: toOptionalText(values.program_name),
    quote: toOptionalText(values.quote),
    rating: values.rating,
    result_tag: toOptionalText(values.result_tag),
  });
}

export function testimonialToUpdateRequest(values: TestimonialFormValues): TestimonialUpdateRequest {
  return testimonialToCreateRequest(values);
}

export function storefrontProfileFromApi(profile: StoreProfile): StoreProfile {
  return profile;
}

export function storefrontProfileToFormValues(profile: StoreProfile): EditorFormValues {
  return {
    bio: profile.bio ?? '',
    cover_image_url: profile.cover_image_url ?? '',
    display_name: profile.display_name,
    faq_items: profile.faq_items,
    headline: profile.headline ?? '',
    instagram: profile.social_links?.instagram ?? '',
    intake_questions: profile.intake_questions.map((question) => ({
      label: question.label,
      options: question.options ?? [],
      required: question.required ?? false,
      type: question.type,
    })),
    is_published: profile.is_published,
    photo_url: profile.photo_url ?? '',
    slug: profile.slug,
    theme_color: profile.theme_color,
    trust_stats: profile.trust_stats,
    whatsapp: profile.social_links?.whatsapp ?? '',
    whatsapp_cta_enabled: profile.whatsapp_cta_enabled,
    whatsapp_cta_message: profile.whatsapp_cta_message ?? '',
    youtube: profile.social_links?.youtube ?? '',
  };
}

export function storefrontProfileToUpsertRequest(values: EditorFormValues): StoreProfileUpsertRequest {
  return omitUndefined({
    bio: toOptionalText(values.bio),
    cover_image_url: toOptionalText(values.cover_image_url),
    display_name: values.display_name,
    faq_items: values.faq_items.filter((item) => item.question && item.answer),
    headline: toOptionalText(values.headline),
    intake_questions: values.intake_questions.map((question) => ({
      label: question.label,
      options: toOptionalOptions(question.options, question.type),
      required: question.required ?? false,
      type: question.type,
    })),
    is_published: values.is_published,
    photo_url: toOptionalText(values.photo_url),
    slug: values.slug,
    social_links: toOptionalSocialLinks(values),
    theme_color: values.theme_color,
    trust_stats: values.trust_stats.filter((stat) => stat.value && stat.label),
    whatsapp_cta_enabled: values.whatsapp_cta_enabled,
    whatsapp_cta_message: toOptionalText(values.whatsapp_cta_message),
  });
}
