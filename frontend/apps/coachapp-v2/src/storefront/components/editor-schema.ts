import {z} from 'zod';
import {omitUndefined, toOptionalText} from '@/api/shared';
import type {StoreProfile, StoreProfileUpsertRequest} from '@/api/storefront';

const intakeQuestionSchema = z.object({
  label: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  type: z.enum(['text', 'number', 'select']),
});

const trustStatSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
});

const faqItemSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
  question: z.string().min(1, 'Question is required'),
});

export const editorSchema = z.object({
  bio: z.string().optional(),
  cover_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  display_name: z.string().min(1, 'Display name is required'),
  faq_items: z.array(faqItemSchema),
  headline: z.string().optional(),
  intake_questions: z.array(intakeQuestionSchema),
  instagram: z.string().optional(),
  is_published: z.boolean(),
  photo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  slug: z
    .string()
    .min(3, 'At least 3 characters')
    .max(60, 'Maximum 60 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Lowercase letters, numbers, and hyphens only. Must start and end with a letter or number.',
    ),
  theme_color: z.enum(['orange', 'blue', 'green', 'purple']),
  trust_stats: z.array(trustStatSchema),
  whatsapp: z.string().optional(),
  whatsapp_cta_enabled: z.boolean(),
  whatsapp_cta_message: z.string().optional(),
  youtube: z.string().optional(),
});

export type EditorFormValues = z.infer<typeof editorSchema>;

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
