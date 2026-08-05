import {z} from 'zod';

export const exerciseFormSchema = z.object({
  description: z.string().max(5000, 'Use 5000 characters or fewer').optional(),
  equipment_ids: z.array(z.string()).optional(),
  force: z.enum(['pull', 'push', 'static']).optional().or(z.literal('')),
  image_url: z.string().optional(),
  images: z.array(z.string()).optional(),
  instructions: z.string().max(10_000, 'Use 10000 characters or fewer').optional(),
  mechanics: z.enum(['compound', 'isolation', 'isometric']).optional().or(z.literal('')),
  media_id: z.string().nullable().optional(),
  muscle_ids: z.array(z.string()).optional(),
  name: z.string().trim().min(1, 'Enter exercise name').max(255, 'Use 255 characters or fewer'),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

export const EXERCISE_FORM_DEFAULTS: ExerciseFormValues = {
  description: '',
  equipment_ids: [],
  force: '',
  image_url: '',
  images: [],
  instructions: '',
  mechanics: '',
  media_id: null,
  muscle_ids: [],
  name: '',
};
