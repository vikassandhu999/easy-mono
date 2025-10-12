import {z} from 'zod';

export const ContentTypeEnum = z.enum(['exercise', 'recipe']);

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
    description?: string;
    display_name: string;
    key: string;
    unit?: string;
}

export interface ExerciseMetadata {
    calories_burned_per_minute: number;
    category: string;
    common_mistakes: string[];
    common_rep_ranges: string[];
    contraindications: string[];
    default_sets: number;
    derived_metrics: DerivedMetricDefinition[];
    equipment: string[];
    force: string;
    form_cues: string[];
    images: string[];
    instructions: string[];
    level: string;
    mechanics: string;
    primary_muscle: string[];
    range_of_motion: string;
    rest_recommendation: string;
    secondary_muscle: string[];
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
    dish_type: string;
    equipment_needed: string[];
    ingredients: RecipeIngredient[];
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
    name: z.string().optional(),
    type: z.string().optional(),
    url: z.string().url(),
});

export const ContentScopeEnum = z.enum(['system', 'business']);
export type ContentScope = z.infer<typeof ContentScopeEnum>;

// Create / Update schemas
export const CreateContent_zod = z.object({
    description: z
        .string()
        .min(20, 'Description must be greater than 20 letters')
        .max(500, 'Description must be less than 500 letters')
        .optional(),
    exercise_definition: z.any().optional(),
    ingredient_definition: z.any().optional(),
    media: ContentMedia_zod.optional(),
    name: z.string().min(3, 'Name should be greater than 3 letters').max(255, 'Name cannot be longer than 255 letters'),
    recipe_definition: z.any().optional(),
    thumbnail_url: z.string().url().optional(),
    type: ContentTypeEnum,
});

export const UpdateContent_zod = z.object({
    description: z.string().optional(),
    exercise_definition: z.any().optional(),
    ingredient_definition: z.any().optional(),
    media: ContentMedia_zod.optional(),
    name: z.string().min(3).max(255).optional(),
    recipe_definition: z.any().optional(),
    thumbnail_url: z.string().url().optional(),
    type: ContentTypeEnum.optional(),
});

// Scope filter options for content visibility
export const CONTENT_SCOPE_FILTERS = ['all', 'system', 'business'] as const;
export const ContentScopeFilter_zod = z.enum(CONTENT_SCOPE_FILTERS).optional().default('all');
export type ContentScopeFilter = z.infer<typeof ContentScopeFilter_zod>;

// Archive status filter options
export const ARCHIVE_STATUS_FILTERS = ['active', 'archived', 'all'] as const;
export const ArchiveStatusFilter_zod = z.enum(ARCHIVE_STATUS_FILTERS).optional().default('active');
export type ArchiveStatusFilter = z.infer<typeof ArchiveStatusFilter_zod>;

export const ListContents_zod = z.object({
    content_type: z.enum(['exercise', 'recipe']).optional(),
    scope: ContentScopeFilter_zod,
    active_only: z.boolean().optional(),
    archived_only: z.boolean().optional(),
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

// Updated interface to match backend response format
export interface Content {
    archived_at?: string;
    business_id?: string;
    created_at: string;
    created_by?: {id: string; name: string};
    created_by_id?: string;
    definition?: any;
    description?: string;
    exercise_definition?: ExerciseMetadata;
    id: string;
    ingredient_definition?: IngredientMetadata;
    is_archived: boolean;
    is_system: boolean;
    last_edited_by?: {id: string; name: string};
    last_edited_by_id?: string;
    media?: ContentMedia | null;
    name: string;
    recipe_definition?: RecipeMetadata;
    scope: ContentScope;
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
