import {z} from 'zod';

export const ContentTypeEnum = z.enum(['exercise', 'ingredient', 'recipe']);
export const InstructionsTypeEnum = z.enum(['text', 'media', 'text_with_media']);

export interface ContentMedia {
    [key: string]: any;
}
export type ContentType = z.infer<typeof ContentTypeEnum>;

// Metadata interfaces
export interface ExerciseMetadata {
    [key: string]: any;
}

export interface IngredientMetadata {
    [key: string]: any;
}

export type InstructionsType = z.infer<typeof InstructionsTypeEnum>;

export interface RecipeMetadata {
    [key: string]: any;
}

// Create / Update schemas
export const CreateContent_zod = z.object({
    description: z.string().optional(),
    duration: z.number().min(0).optional(),
    exercise_metadata: z.any().optional(),
    ingredient_metadata: z.any().optional(),
    instructions: z.string().optional(),
    instructions_type: InstructionsTypeEnum.optional(),
    media: z.any().optional(),
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
    media: z.any().optional(),
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

// Content interface
export interface Content {
    archived_at?: string;
    business_id: string;
    created_at: string;
    created_by?: {id: string; name: string};
    created_by_id: string;
    description?: string;
    duration?: null | number;
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
    metric_keys?: string[];
    name: string;
    recipe_metadata?: RecipeMetadata;
    thumbnail_url?: string;
    type: ContentType;
    updated_at: string;
}
export type CreateContentProps = z.infer<typeof CreateContent_zod>;
export type ListContentsProps = z.infer<typeof ListContents_zod>;

export interface ListContentsResult {
    contents: Content[];
    pagination: {
        page: number;
        page_count: number;
        page_size: number;
        total_count: number;
    };
}

export type UpdateContentProps = z.infer<typeof UpdateContent_zod>;

// Stub API class for client app
export class ContentsAPI {
    static async create(props: CreateContentProps): Promise<any> {
        throw new Error('Not implemented in client app');
    }

    static async delete(id: string): Promise<any> {
        throw new Error('Not implemented in client app');
    }

    static async get(id: string): Promise<Content> {
        throw new Error('Not implemented in client app');
    }

    static async list(params?: ListContentsProps): Promise<ListContentsResult> {
        throw new Error('Not implemented in client app');
    }

    static async update(id: string, props: UpdateContentProps): Promise<any> {
        throw new Error('Not implemented in client app');
    }
}
