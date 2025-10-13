import {z} from 'zod';

// ============================================================================
// Content Types - matches backend ContentType enum
// ============================================================================
export const ContentTypeEnum = z.enum(['exercise', 'recipe']);
export type ContentType = z.infer<typeof ContentTypeEnum>;

// ============================================================================
// Content Scope - matches backend ContentScope enum
// ============================================================================
export const ContentScopeEnum = z.enum(['system', 'business']);
export type ContentScope = z.infer<typeof ContentScopeEnum>;

// ============================================================================
// Content Media - matches backend ContentMedia struct
// ============================================================================
export const MediaType_zod = z.enum(['video', 'image', 'pdf', 'document', 'audio', 'url']);
export type MediaType = z.infer<typeof MediaType_zod>;

export const ContentMedia_zod = z.object({
    type: z.string().optional(),
    url: z.string().url(),
    name: z.string().optional(),
});

export type ContentMedia = z.infer<typeof ContentMedia_zod>;

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

// ============================================================================
// Exercise Definition - matches backend ExerciseDefinition struct
// ============================================================================
export interface ExerciseDefinition {
    // Essential exercise classification (alphabetical)
    calories_per_minute: number;
    category: string;
    equipment: string[];
    force: string;
    images: string[];
    instructions: string[];
    level: string;
    mechanics: string;
    modality: string;
    movement_pattern: string;
    primary_muscle: string[];
    range_of_motion: string;
    secondary_muscle: string[];
    tempo: string;
    tracking_fields: string[];
}

// ============================================================================
// Recipe Definition - matches backend RecipeDefinition struct
// ============================================================================
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

export interface RecipeInstructionSteps {
    instruction: string;
    media_url?: string;
}

export interface RecipeInstructions {
    instructions?: RecipeInstructionSteps[];
    media_url?: string;
}

export interface RecipeDefinition {
    // Recipe yield and timing (alphabetical)
    cook_time_minutes: number;
    cooking_methods: string[];
    derived_metrics?: any[];
    diet_types: string[];
    difficulty: string;
    dish_type: string;
    equipment_needed: string[];
    ingredients: IngredientDefinition[];
    instructions?: RecipeInstructions;
    meal_prep_friendly: boolean;
    meal_types: string[];
    nutrition_per_serving: NutritionProfile;
    prep_time_minutes: number;
    servings: number;
    storage_instructions: string[];
    total_time_minutes: number;
    trackable_metrics?: any[];
}

// ============================================================================
// Ingredient Definition - matches backend IngredientDefinition struct
// ============================================================================
export interface ServingSize {
    gram_weight: number;
    is_default: boolean;
    name: string;
}

export interface IngredientDefinition {
    // Classification (alphabetical)
    allergens: string[];
    calories_per_100g: number;
    common_serving_sizes: ServingSize[];
    derived_metrics?: any[];
    dietary_flags: string[];
    food_groups: string[];
    macros_per_100g: MacroProfile;
    micros_per_100g?: MicroProfile;
    preparation_notes: string[];
    shelf_life: string;
    trackable_metrics?: any[];
}

// ============================================================================
// Content Model - matches backend resp.Content() response
// ============================================================================
export interface Content {
    // Audit fields (alphabetical)
    archived_at?: string;
    business_id?: string;
    created_at: string;
    created_by?: {id: string; name: string};
    created_by_id?: string;
    definition?: any;
    description?: string;
    exercise_definition?: ExerciseDefinition;
    id: string;
    ingredient_definition?: IngredientDefinition;
    is_archived: boolean;
    is_system: boolean;
    last_edited_by?: {id: string; name: string};
    last_edited_by_id?: string;
    media?: ContentMedia | null;
    name: string;
    recipe_definition?: RecipeDefinition;
    scope: ContentScope;
    thumbnail_url?: string;
    type: ContentType;
    updated_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Create Content Request
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

export type CreateContentProps = z.infer<typeof CreateContent_zod>;

// Update Content Request
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

export type UpdateContentProps = z.infer<typeof UpdateContent_zod>;

// List Contents Query Parameters - matches backend QueryParams
export const CONTENT_SCOPE_FILTERS = ['all', 'system', 'business'] as const;
export const ContentScopeFilter_zod = z.enum(CONTENT_SCOPE_FILTERS).optional().default('all');
export type ContentScopeFilter = z.infer<typeof ContentScopeFilter_zod>;

export const ListContents_zod = z.object({
    active_only: z.boolean().optional(),
    archived_only: z.boolean().optional(),
    content_type: z.enum(['exercise', 'recipe']).optional(),
    page: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(20).optional().default(20),
    scope: ContentScopeFilter_zod,
    search: z.string().max(60).optional(),
});

export type ListContentsProps = z.infer<typeof ListContents_zod>;

// List Contents Response
export interface ListContentsResult {
    page: number;
    page_size: number;
    records: Content[];
    total: number;
}
