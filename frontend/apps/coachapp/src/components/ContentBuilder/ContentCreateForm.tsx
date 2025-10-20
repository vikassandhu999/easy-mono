import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Group, Stack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle} from '@tabler/icons-react';
import {useEffect, useMemo} from 'react';
import {useForm} from 'react-hook-form';

import {Content, ContentType} from '@/store/services/contents';

import {ContentFormSchema, ContentFormValues, contentToFormValues} from './contentForm';
import ExerciseForm from './forms/ExerciseForm';
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
    submitLabel = 'Create',
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
                    notifications.show({
                        autoClose: 5000,
                        color: 'orange',
                        icon: <IconAlertCircle size={20} />,
                        message: 'Check the form and fix any errors before submitting',
                        title: 'Validation error',
                    });
                },
            )}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flex: 1,
            }}
        >
            {/* Scrollable content */}
            <Stack
                gap="lg"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    paddingBlock: 'var(--mantine-spacing-lg)',
                    paddingInline: 'var(--mantine-spacing-lg)',
                }}
            >
                {/* Render appropriate form based on content type */}
                {effectiveContentType === 'exercise' && <ExerciseForm form={form} />}

                {effectiveContentType === 'recipe' && <RecipeForm form={form} />}
            </Stack>

            {/* Fixed Submit Button(s) */}
            <Group
                justify="flex-start"
                style={{
                    backgroundColor: 'white',
                    borderTop: '1px solid var(--mantine-color-gray-3)',
                    flexShrink: 0,
                    paddingBlock: 'var(--mantine-spacing-lg)',
                    paddingInline: 'var(--mantine-spacing-lg)',
                }}
            >
                {showSaveOptions ? (
                    <>
                        <Button
                            loading={isSubmitting}
                            radius="xl"
                            size="lg"
                            type="submit"
                        >
                            Save and close
                        </Button>
                        <Button
                            color="gray"
                            loading={isSubmitting}
                            onClick={handleSubmit((values) => handleFormSubmit(values, 'continue'))}
                            radius="xl"
                            size="lg"
                            variant="light"
                        >
                            Save
                        </Button>
                    </>
                ) : (
                    <Button
                        loading={isSubmitting}
                        radius="xl"
                        size="lg"
                        type="submit"
                    >
                        {submitLabel}
                    </Button>
                )}
            </Group>
        </form>
    );
}
