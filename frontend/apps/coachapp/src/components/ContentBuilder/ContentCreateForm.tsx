import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Group, Stack} from '@mantine/core';
import {useEffect, useMemo} from 'react';
import {useForm} from 'react-hook-form';

import {Content, ContentType} from '@/api/contents';

import {ContentFormSchema, ContentFormValues, contentToFormValues} from './contentForm';
import ExerciseForm from './forms/ExerciseForm';
import FoodForm from './forms/FoodForm';
import RecipeForm from './forms/RecipeForm';

interface ContentCreateFormProps {
    defaultContentType: ContentType;
    initialContent?: Content;
    isSubmitting?: boolean;
    onSubmit: (values: ContentFormValues, action?: 'close' | 'continue') => Promise<void>;
    showSaveOptions?: boolean;
    submitLabel?: string;
}

/**
 * ContentCreateForm - Generic content builder component
 *
 * Renders the appropriate form based on content type:
 * - ExerciseForm for exercise content
 * - FoodForm for ingredient content
 * - RecipeForm for recipe content
 *
 * Manages form state and form submission with dual CTA support.
 * Follows SessionCreateForm pattern.
 */
export default function ContentCreateForm({
    defaultContentType,
    initialContent,
    isSubmitting,
    onSubmit,
    showSaveOptions = false,
    submitLabel = 'Create Content',
}: ContentCreateFormProps) {
    const defaultValues = useMemo<ContentFormValues>(() => {
        return contentToFormValues(initialContent, defaultContentType);
    }, [defaultContentType, initialContent]);

    const form = useForm<ContentFormValues>({
        defaultValues,
        resolver: zodResolver(ContentFormSchema),
    });

    const {handleSubmit, reset, watch} = form;

    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    // Watch content type to determine which form to render
    const effectiveContentType = watch('type') || defaultContentType;

    const handleFormSubmit = async (values: ContentFormValues, action: 'close' | 'continue' = 'close') => {
        await onSubmit(values, action);
    };

    return (
        <form
            onSubmit={handleSubmit(
                (values) => handleFormSubmit(values, 'close'),
                (errors) => {
                    console.error('Form validation errors:', errors);
                },
            )}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            {/* Scrollable content */}
            <Stack
                gap="md"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    paddingBlock: 'var(--ce-size-md)',
                    paddingInline: 'var(--ce-size-md)',
                }}
            >
                {/* Render appropriate form based on content type */}
                {effectiveContentType === 'exercise' && <ExerciseForm form={form} />}

                {effectiveContentType === 'ingredient' && <FoodForm form={form} />}

                {effectiveContentType === 'recipe' && <RecipeForm form={form} />}
            </Stack>

            {/* Sticky Submit Button(s) */}
            <Group
                justify="flex-end"
                style={{
                    borderTop: '1px solid var(--mantine-color-gray-2)',
                    flexShrink: 0,
                    paddingBlock: 'var(--ce-size-md)',
                    paddingInline: 'var(--ce-size-md)',
                }}
            >
                {showSaveOptions ? (
                    <>
                        <Button
                            color="gray"
                            loading={isSubmitting}
                            onClick={handleSubmit((values) => handleFormSubmit(values, 'continue'))}
                            radius="md"
                            size="md"
                            variant="light"
                        >
                            Save
                        </Button>
                        <Button
                            loading={isSubmitting}
                            radius="md"
                            size="md"
                            type="submit"
                        >
                            Save & Close
                        </Button>
                    </>
                ) : (
                    <Button
                        loading={isSubmitting}
                        radius="md"
                        size="md"
                        type="submit"
                    >
                        {submitLabel}
                    </Button>
                )}
            </Group>
        </form>
    );
}
