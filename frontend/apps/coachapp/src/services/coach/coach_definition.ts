import {z} from 'zod';

/* --------- Coach entity (matches API contract GET /v1/coaches/me) */
export interface Coach {
  bio: null | string;
  id: string;
  inserted_at: string;
  name: null | string;
  title: null | string;
  updated_at: string;
}

/* --------- API response wrapper */
export interface CoachResponse {
  data: Coach;
}

/* --------- PATCH /v1/coaches/me */
export interface CoachUpdateRequest {
  bio?: string;
  name?: string;
  title?: string;
}

/* --------- Helper: split a "First Last" name into parts */
export function parseCoachName(name: null | string): {
  firstName: string;
  lastName: string;
} {
  if (!name) return {firstName: '', lastName: ''};
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

/* --------- Form validation schema (Zod for zodResolver only) */
export const CoachProfileForm_zod = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  title: z.string().max(127).optional().nullable().or(z.literal('')),
  bio: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return val.trim().split(/\s+/).filter(Boolean).length <= 200;
      },
      {message: 'Bio cannot exceed 200 words'},
    ),
});

export interface CoachProfileFormValues {
  bio?: null | string;
  name: string;
  title?: null | string;
}
