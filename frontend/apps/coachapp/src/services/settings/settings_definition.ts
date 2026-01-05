import {z} from 'zod';

// ============================================
// Business Settings Types
// ============================================

export interface BusinessSettings {
  accent_color: null | string;
  business_id: string;

  cover_image_url: null | string;
  id: string;
  // Timestamps
  inserted_at: string;
  public_join_approval_required: boolean;
  public_join_client_limit: null | number;

  public_join_code: null | string;
  // Public Join Settings
  public_join_enabled: boolean;
  public_join_url: null | string;

  // Branding
  tagline: null | string;
  updated_at: string;
}

export interface BusinessSettingsResponse {
  data: BusinessSettings;
}

// ============================================
// Update Settings Schemas
// ============================================

export const UpdatePublicJoinSettings_zod = z.object({
  public_join_enabled: z.boolean().optional(),
  public_join_approval_required: z.boolean().optional(),
  public_join_client_limit: z.number().min(1).nullable().optional(),
});

export type UpdatePublicJoinSettingsProps = z.infer<typeof UpdatePublicJoinSettings_zod>;

export const UpdateBrandingSettings_zod = z.object({
  tagline: z.string().max(255, 'Tagline must not exceed 255 characters').nullable().optional(),
  cover_image_url: z.string().url('Must be a valid URL').nullable().optional().or(z.literal('')),
  accent_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5722)')
    .nullable()
    .optional()
    .or(z.literal('')),
});

export type UpdateBrandingSettingsProps = z.infer<typeof UpdateBrandingSettings_zod>;

export const UpdateAllSettings_zod = UpdatePublicJoinSettings_zod.merge(UpdateBrandingSettings_zod);

export type UpdateAllSettingsProps = z.infer<typeof UpdateAllSettings_zod>;

// ============================================
// Public Join Page Types (for clients)
// ============================================

export interface PublicJoinBusiness {
  description: null | string;
  email: null | string;
  handle: string;
  id: string;
  logo_url: null | string;
  name: string;
  phone: null | string;
  website: null | string;
}

export interface PublicJoinInfo {
  accent_color: null | string;
  approval_required: boolean;
  business: PublicJoinBusiness;
  cover_image_url: null | string;
  tagline: null | string;
}

export interface PublicJoinResponse {
  data: PublicJoinInfo;
}
