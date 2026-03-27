import {z} from 'zod';

// ── Editor form schema + type ────────────────────────────────
// Shared by storefront-editor.tsx and all section editor components.

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
