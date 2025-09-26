import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {authedClient} from './auth';

export const ContentTypeEnum = z.enum(['exercise', 'ingredient', 'recipe']);

export const InstructionsTypeEnum = z.enum(['text', 'media', 'text_with_media']);

export type ContentType = z.infer<typeof ContentTypeEnum>;
export interface ContentUIStructure {
    derived_metrics: DerivedMetricDisplay[];
    fixed_metrics: FixedMetricDisplay[];
    trackable_metrics: TrackableMetricDisplay[];
}

export interface DerivedMetricDefinition {
    chart_type?: string;
    description?: string;
    display_name: string;
    formula: string;
    key: string;
    unit?: string;
}

export interface DerivedMetricDisplay {
    chart_type?: string;
    description: string;
    display_name: string;
    key: string;
    unit?: string;
}

export interface ExerciseMetadata {
    calories_burned_per_minute: number;
    common_mistakes: string[];
    common_rep_ranges: string[];
    contraindications: string[];
    default_sets: number;
    derived_metrics: DerivedMetricDefinition[];
    difficulty: string;
    equipment: string[];
    form_cues: string[];
    mechanics: string;
    movement_pattern: string;
    muscle_groups: string[];
    range_of_motion: string;
    rest_recommendation: string;
    tempo: string;
    trackable_metrics: TrackableMetricDefinition[];
}

// UI Structure types for dynamic form generation
export interface FixedMetricDisplay {
    category: string;
    display_name: string;
    key: string;
    unit?: string;
    value: any;
}

export interface IngredientMetadata {
    allergens: string[];
    calories_per_100g: number;
    common_serving_sizes: ServingSize[];
    derived_metrics: DerivedMetricDefinition[];
    dietary_flags: string[];
    food_groups: string[];
    macros_per_100g: MacroProfile;
    micros_per_100g?: MicroProfile;
    preparation_notes: string[];
    shelf_life: string;
    trackable_metrics: TrackableMetricDefinition[];
}

export type InstructionsType = z.infer<typeof InstructionsTypeEnum>;

export interface MacroProfile {
    carbs_g: number;
    fats_g: number;
    fiber_g: number;
    protein_g: number;
    sugar_g: number;
}

export interface MicroProfile {
    calcium_mg: number;
    iron_mg: number;
    sodium_mg: number;
    vitamin_c_mg: number;
    vitamin_d_iu: number;
}

export interface NutritionProfile {
    calories: number;
    macros: MacroProfile;
    micros?: MicroProfile;
    serving_size: string;
}

export interface RecipeIngredient {
    name: string;
    notes?: string;
    quantity: number;
    unit: string;
}

export interface RecipeInstructions {
    instructions?: RecipeInstructionSteps[];
    media_url?: string;
}

export interface RecipeInstructionSteps {
    instruction: string;
    media_url?: string;
}

export interface RecipeMetadata {
    cook_time_minutes: number;
    cooking_methods: string[];
    derived_metrics: DerivedMetricDefinition[];
    diet_types: string[];
    difficulty: string;
    equipment_needed: string[];
    ingredients: IngredientMetadata[];
    instructions?: RecipeInstructions;
    meal_prep_friendly: boolean;
    meal_types: string[];
    nutrition_per_serving: NutritionProfile;
    prep_time_minutes: number;
    servings: number;
    storage_instructions: string[];
    total_time_minutes: number;
    trackable_metrics: TrackableMetricDefinition[];
}

export interface ServingSize {
    gram_weight: number;
    is_default: boolean;
    name: string;
}

export interface TrackableMetricDefinition {
    default_value?: number;
    display_name: string;
    display_order: number;
    key: string;
    max_value?: number;
    metric_type: 'boolean' | 'choice' | 'duration' | 'number' | 'scale' | 'text';
    min_value?: number;
    options?: any;
    required: boolean;
    scope: 'per_session' | 'per_set';
    unit?: string;
}

export interface TrackableMetricDisplay {
    default_value?: number;
    display_name: string;
    display_order: number;
    key: string;
    max_value?: number;
    metric_type: 'boolean' | 'choice' | 'duration' | 'number' | 'scale' | 'text';
    min_value?: number;
    options?: any;
    required: boolean;
    scope: 'per_session' | 'per_set';
    unit?: string;
}

export const MediaType_zod = z.enum(['video', 'image', 'pdf', 'document', 'audio', 'url']);
export type MediaType = z.infer<typeof MediaType_zod>;

export const ContentMedia_zod = z.object({
    external_id: z.string().optional(),
    mime_type: z.string().optional(),
    source: z.enum(['url', 'youtube', 'vimeo']),
    type: MediaType_zod,
    url: z.string().url(),
});

// Create / Update schemas - Updated to remove tags, focus on domain properties only
export const CreateContent_zod = z.object({
    description: z.string().optional(),
    duration: z.number().min(0).optional(),
    exercise_metadata: z.any().optional(),
    ingredient_metadata: z.any().optional(),
    instructions: z.string().optional(),
    instructions_type: InstructionsTypeEnum.optional(),
    media: ContentMedia_zod.optional(),
    name: z.string().min(3).max(255),
    recipe_metadata: z.any().optional(),
    thumbnail_url: z.string().url().optional(),
    type: ContentTypeEnum,
});

export const UpdateContent_zod = z.object({
    description: z.string().optional(),
    duration: z.number().min(0).optional(),
    exercise_metadata: z.any().optional(),
    ingredient_metadata: z.any().optional(),
    instructions: z.string().optional(),
    instructions_type: InstructionsTypeEnum.optional(),
    media: ContentMedia_zod.optional(),
    name: z.string().min(3).max(255).optional(),
    recipe_metadata: z.any().optional(),
    thumbnail_url: z.string().url().optional(),
    type: ContentTypeEnum.optional(),
});

export const ListContents_zod = z.object({
    archived_only: z.boolean().optional(),
    content_type: z.enum(['exercise', 'ingredient', 'recipe']).optional(),
    include_archived: z.boolean().optional(),
    include_metadata: z.boolean().optional(),
    include_ui_structure: z.boolean().optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(20).optional().default(20),
    search: z.string().max(60).optional(),
});

export type ContentMedia = z.infer<typeof ContentMedia_zod>;
export type CreateContentProps = z.infer<typeof CreateContent_zod>;
export type ListContentsProps = z.infer<typeof ListContents_zod>;
export type UpdateContentProps = z.infer<typeof UpdateContent_zod>;

export const isMediaEmpty = (media: ContentMedia | null | undefined) => {
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
    archived_at?: string;
    business_id: string;
    created_at: string;
    created_by?: {id: string; name: string};
    created_by_id: string;
    description?: string;
    duration?: null | number;
    // taxonomy fields
    exercise_metadata?: ExerciseMetadata;
    id: string;
    ingredient_metadata?: IngredientMetadata;
    instructions?: string;
    instructions_type: InstructionsType;
    is_archived: boolean;
    is_published: boolean;
    last_edited_by?: {id: string; name: string};
    last_edited_by_id?: string;
    media?: ContentMedia | null;
    metric_keys?: string[]; // Available when include_metrics=true
    name: string;
    recipe_metadata?: RecipeMetadata;
    thumbnail_url?: string;
    type: ContentType;
    updated_at: string;
}

export interface ListContentsResult {
    page: number;
    page_size: number;
    records: Content[];
    total: number;
}

export const ContentsAPI = {
    /**
     * Archive/unarchive content
     */
    async archive(id: string): Promise<Result<any>> {
        return authedClient
            .post(`/v1/coach/contents/${id}/archive`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
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
     * Delete content
     */
    async delete(id: string): Promise<Result<any>> {
        return authedClient
            .delete(`/v1/coach/contents/${id}`)
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
     * Get UI structure for content type - drives dynamic form generation
     */
    async getUIStructure(contentType: ContentType): Promise<Result<ContentUIStructure>> {
        return authedClient
            .get(`/v1/coach/contents/ui-structure/${contentType}`)
            .then((res) => Result.success(res.data))
            .catch((error) => Result.failure(error));
    },

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

    async unarchive(id: string): Promise<Result<any>> {
        return authedClient
            .post(`/v1/coach/contents/${id}/unarchive`)
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
};
