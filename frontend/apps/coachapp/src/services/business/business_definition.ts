import { z } from "zod";

/* --------- Business entity (matches API contract GET /v1/businesses/me) */
export interface Business {
  about: null | string;
  handle: string;
  id: string;
  inserted_at: string;
  name: string;
  updated_at: string;
}

/* --------- API response wrapper */
export interface BusinessResponse {
  data: Business;
}

/* --------- POST /v1/businesses */
export interface BusinessCreateRequest {
  about?: string;
  handle: string;
  name: string;
}

/* --------- PATCH /v1/businesses/me */
export interface BusinessUpdateRequest {
  about?: string;
  name?: string;
}

/* --------- Form validation: create business (Zod for zodResolver only) */
export const BusinessCreateForm_zod = z.object({
  name: z.string().min(1, "Business name is required").max(255),
  handle: z
    .string()
    .regex(
      /^[a-z0-9_]*$/,
      "Handle must only contain lowercase letters, numbers, and underscores",
    )
    .min(2, "Handle must be at least 2 characters")
    .max(30, "Handle must not exceed 30 characters"),
  about: z
    .string()
    .max(1000, "About must not exceed 1000 characters")
    .optional()
    .or(z.literal("")),
});

export interface BusinessCreateFormValues {
  about?: string;
  handle: string;
  name: string;
}

/* --------- Form validation: update business (Zod for zodResolver only) */
export const BusinessUpdateForm_zod = z.object({
  name: z.string().min(1, "Business name is required").max(255),
  about: z
    .string()
    .max(1000, "About must not exceed 1000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export interface BusinessUpdateFormValues {
  about?: null | string;
  name: string;
}
