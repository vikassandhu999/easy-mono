import {Result} from '@/Utils/Error';
import {z} from 'zod';
import {authedClient} from './auth';
import {IconRun, IconChefHat, IconListDetails} from '@tabler/icons-react';
import {OptionItem} from '@/Components/ContentForm';

// Enumerations based on backend domain - Updated to match current backend
export const ContentTypeEnum = z.enum(['exercise', 'food', 'recipe']);

export const InstructionsTypeEnum = z.enum(['text', 'media', 'text_with_media']);

export type ContentType = z.infer<typeof ContentTypeEnum>;
export type InstructionsType = z.infer<typeof InstructionsTypeEnum>;

// Enhanced metadata types matching backend structures
export interface TrackableMetricDefinition {
    key: string;
    display_name: string;
    metric_type: 'number' | 'scale' | 'duration' | 'text' | 'boolean' | 'choice';
    scope: 'per_set' | 'per_session';
    unit?: string;
    required: boolean;
    default_value?: number;
    min_value?: number;
    max_value?: number;
    display_order: number;
    options?: any;
}

export interface DerivedMetricDefinition {
    key: string;
    display_name: string;
    formula: string;
    unit?: string;
    chart_type?: string;
    description?: string;
}

export interface ExerciseMetadata {
    muscle_groups: string[];
    equipment: string[];
    difficulty: string;
    movement_pattern: string;
    mechanics: string;
    default_sets: number;
    common_rep_ranges: string[];
    rest_recommendation: string;
    calories_burned_per_minute: number;
    range_of_motion: string;
    tempo: string;
    form_cues: string[];
    common_mistakes: string[];
    contraindications: string[];
    trackable_metrics: TrackableMetricDefinition[];
    derived_metrics: DerivedMetricDefinition[];
}

export interface MacroProfile {
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    fiber_g: number;
    sugar_g: number;
}

export interface MicroProfile {
    sodium_mg: number;
    calcium_mg: number;
    iron_mg: number;
    vitamin_c_mg: number;
    vitamin_d_iu: number;
}

export interface ServingSize {
    name: string;
    gram_weight: number;
    is_default: boolean;
}

export interface FoodMetadata {
    calories_per_100g: number;
    macros_per_100g: MacroProfile;
    micros_per_100g?: MicroProfile;
    food_groups: string[];
    allergens: string[];
    dietary_flags: string[];
    common_serving_sizes: ServingSize[];
    shelf_life: string;
    preparation_notes: string[];
    trackable_metrics: TrackableMetricDefinition[];
    derived_metrics: DerivedMetricDefinition[];
}

export interface NutritionProfile {
    calories: number;
    macros: MacroProfile;
    micros?: MicroProfile;
    serving_size: string;
}

export interface RecipeIngredient {
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
}

export interface RecipeMetadata {
    servings_yield: number;
    prep_time_minutes: number;
    cook_time_minutes: number;
    total_time_minutes: number;
    nutrition_per_serving: NutritionProfile;
    meal_types: string[];
    cooking_methods: string[];
    dietary_flags: string[];
    difficulty: string;
    storage_instructions: string[];
    meal_prep_friendly: boolean;
    equipment_needed: string[];
    ingredients: RecipeIngredient[];
    trackable_metrics: TrackableMetricDefinition[];
    derived_metrics: DerivedMetricDefinition[];
}

// UI Structure types for dynamic form generation
export interface FixedMetricDisplay {
    key: string;
    display_name: string;
    value: any;
    unit?: string;
    category: string;
}

export interface TrackableMetricDisplay {
    key: string;
    display_name: string;
    metric_type: 'number' | 'scale' | 'duration' | 'text' | 'boolean' | 'choice';
    scope: 'per_set' | 'per_session';
    unit?: string;
    required: boolean;
    default_value?: number;
    min_value?: number;
    max_value?: number;
    display_order: number;
    options?: any;
}

export interface DerivedMetricDisplay {
    key: string;
    display_name: string;
    description: string;
    unit?: string;
    chart_type?: string;
}

export interface ContentUIStructure {
    fixed_metrics: FixedMetricDisplay[];
    trackable_metrics: TrackableMetricDisplay[];
    derived_metrics: DerivedMetricDisplay[];
}

export const MediaType_zod = z.array(z.enum(['video', 'image', 'pdf', 'document', 'audio', 'url']));
export type MediaType = z.infer<typeof MediaType_zod>;

export const ContentMedia_zod = z.object({
    type: MediaType_zod,
    source: z.enum(['url', 'youtube', 'vimeo']),
    url: z.string().url(),
    external_id: z.string().optional(),
    mime_type: z.string().optional(),
});

// Create / Update schemas - Updated to remove tags, focus on domain properties only
export const CreateContent_zod = z.object({
    name: z.string().min(3).max(255),
    type: ContentTypeEnum,
    instructions_type: InstructionsTypeEnum.optional(),
    instructions: z.string().optional(),
    media: ContentMedia_zod.optional(),
    thumbnail_url: z.string().url().optional(),
    duration: z.number().min(0).optional(),
    exercise_metadata: z.any().optional(),
    food_metadata: z.any().optional(),
    recipe_metadata: z.any().optional(),
});

export const UpdateContent_zod = z.object({
    name: z.string().min(3).max(255).optional(),
    type: ContentTypeEnum.optional(),
    instructions_type: InstructionsTypeEnum.optional(),
    instructions: z.string().optional(),
    media: ContentMedia_zod.optional(),
    thumbnail_url: z.string().url().optional(),
    duration: z.number().min(0).optional(),
    exercise_metadata: z.any().optional(),
    food_metadata: z.any().optional(),
    recipe_metadata: z.any().optional(),
});

export const ListContents_zod = z.object({
    search: z.string().max(60).optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(20).optional().default(20),
    include_archived: z.boolean().optional(),
    archived_only: z.boolean().optional(),
    include_metadata: z.boolean().optional(),
    include_ui_structure: z.boolean().optional(),
    content_type: z.enum(['exercise', 'food', 'recipe']).optional(),
});

export type CreateContentProps = z.infer<typeof CreateContent_zod>;
export type UpdateContentProps = z.infer<typeof UpdateContent_zod>;
export type ListContentsProps = z.infer<typeof ListContents_zod>;
export type ContentMedia = z.infer<typeof ContentMedia_zod>;

export const isMediaEmpty = (media: ContentMedia | undefined | null) => {
    if (!media) return true;
    if (!media.url) return true;
    try {
        // eslint-disable-next-line no-new
        new URL(media.url);
        return false;
    } catch {
        return true;
    }
};

// Updated interface to match backend response format - removed tags field
export interface Content {
    id: string;
    business_id: string;
    type: ContentType;
    name: string;
    instructions_type: InstructionsType;
    instructions?: string;
    media?: ContentMedia | null;
    thumbnail_url?: string;
    duration?: number | null;
    metric_keys?: string[]; // Available when include_metrics=true
    is_published: boolean;
    is_archived: boolean;
    archived_at?: string;
    created_by_id: string;
    last_edited_by_id?: string;
    created_at: string;
    updated_at: string;
    created_by?: {id: string; name: string};
    last_edited_by?: {id: string; name: string};
    // Metadata fields
    exercise_metadata?: ExerciseMetadata;
    food_metadata?: FoodMetadata;
    recipe_metadata?: RecipeMetadata;
}

export interface ListContentsResult {
    records: Content[];
    total: number;
    page: number;
    page_size: number;
}

// Updated content types to match current backend (removed outdated types)
export const CONTENT_TYPES: OptionItem[] = [
    {
        value: 'exercise',
        label: 'Exercise',
        icon: IconRun,
        description: 'Physical movements, drills, and workout routines',
        color: 'var(--mantine-color-red-1)',
        iconColor: 'var(--mantine-color-red-6)',
    },
    {
        value: 'food',
        label: 'Food',
        icon: IconChefHat,
        description: 'Individual foods and nutritional items',
        color: 'var(--mantine-color-orange-1)',
        iconColor: 'var(--mantine-color-orange-6)',
    },
    {
        value: 'recipe',
        label: 'Recipe',
        icon: IconListDetails,
        description: 'Complete recipes and meal preparations',
        color: 'var(--mantine-color-teal-1)',
        iconColor: 'var(--mantine-color-teal-6)',
    },
];

export const ContentsAPI = {
    /**
     * List content with domain property filtering and metadata
     */
    async list(props: ListContentsProps): Promise<Result<ListContentsResult>> {
        return authedClient
            .get('/v1/coach/contents', {params: props})
            .then((res) => {
                return Result.success(res.data);
            })
            .catch((error) => {
                return Result.failure(error);
            });
    },

    /**
     * Create new content with domain-focused metadata support
     */
    async create(props: CreateContentProps): Promise<Result<any>> {
        return authedClient
            .post('/v1/coach/contents', props)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    /**
     * Get content details by ID
     */
    async get(id: string, includeMetadata = true, includeUIStructure = true): Promise<Result<any>> {
        return authedClient
            .get(`/v1/coach/contents/${id}`, {
                params: {
                    include_metadata: includeMetadata,
                    include_ui_structure: includeUIStructure,
                },
            })
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    /**
     * Update content basic details
     */
    async update(id: string, props: UpdateContentProps): Promise<Result<any>> {
        return authedClient
            .patch(`/v1/coach/contents/${id}`, props)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    /**
     * Get UI structure for content type - drives dynamic form generation
     */
    async getUIStructure(contentType: ContentType): Promise<Result<ContentUIStructure>> {
        return authedClient
            .get(`/v1/coach/contents/ui-structure/${contentType}`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    /**
     * Delete content
     */
    async delete(id: string): Promise<Result<any>> {
        return authedClient
            .delete(`/v1/coach/contents/${id}`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    /**
     * Archive/unarchive content
     */
    async archive(id: string): Promise<Result<any>> {
        return authedClient
            .post(`/v1/coach/contents/${id}/archive`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    async unarchive(id: string): Promise<Result<any>> {
        return authedClient
            .post(`/v1/coach/contents/${id}/unarchive`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

    /**
     * Duplicate content
     */
    async duplicate(id: string): Promise<Result<any>> {
        return authedClient
            .post(`/v1/coach/contents/${id}/duplicate`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },
};
