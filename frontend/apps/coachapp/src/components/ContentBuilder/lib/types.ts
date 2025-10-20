import type {UseFormReturn} from 'react-hook-form';

import {z} from 'zod';

import {Content, ContentType} from '@/store/services/contents';

import {ContentFormSchema, ContentMediaSchema, ExerciseDefinitionSchema, RecipeDefinitionSchema} from './schemas';

/**
 * Type definitions for Content Builder
 *
 * These types are inferred from Zod schemas to ensure consistency
 * between validation and TypeScript types.
 */

export type ContentMedia = z.infer<typeof ContentMediaSchema>;
export type ContentFormValues = z.infer<typeof ContentFormSchema>;
export type ExerciseDefinition = z.infer<typeof ExerciseDefinitionSchema>;
export type RecipeDefinition = z.infer<typeof RecipeDefinitionSchema>;

/**
 * Form submission action types
 */
export type FormSubmitAction = 'close' | 'continue';

/**
 * Content builder props
 */
export interface ContentBuilderProps {
    contentId?: string;
    contentType?: ContentType;
    onComplete?: (content: Content, action?: FormSubmitAction) => void;
    showSaveOptions?: boolean;
}

/**
 * Content form props
 */
export interface ContentCreateFormProps {
    defaultContentType: ContentType;
    initialContent?: Content;
    isSubmitting?: boolean;
    onSubmit: (values: ContentFormValues, action?: FormSubmitAction) => Promise<void>;
    showSaveOptions?: boolean;
    submitLabel?: string;
}

/**
 * Type-specific form props
 */
export interface ExerciseFormProps {
    form: UseFormReturn<ContentFormValues>;
}

export interface RecipeFormProps {
    form: UseFormReturn<ContentFormValues>;
}

/**
 * Drawer props
 */
export interface ContentBuilderDrawerProps {
    contentId?: string;
    contentType?: ContentType;
    onClose: () => void;
    onComplete?: (content: Content) => void;
    opened: boolean;
    showSaveOptions?: boolean;
    title: string;
}

/**
 * Custom error class for content building operations
 */
export class ContentBuildError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ContentBuildError';
    }
}

/**
 * API payload types
 */
export interface ContentPayload {
    description?: string;
    exercise_definition?: ExerciseDefinition;
    media?: ContentMedia;
    name: string;
    recipe_definition?: RecipeDefinition;
    thumbnail_url?: string;
    type: ContentType;
}
