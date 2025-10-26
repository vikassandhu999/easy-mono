import {zodResolver} from '@hookform/resolvers/zod';
import {Stack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle} from '@tabler/icons-react';
import {useEffect, useMemo} from 'react';
import {useForm} from 'react-hook-form';

import {FixedBottomBar} from '@/shared/containers/FixedBottomBar';

import {FormButtons} from '../components';
import {
    ContentCreateFormProps,
    ContentFormSchema,
    ContentFormValues,
    contentToFormValues,
    FormSubmitAction,
} from '../lib';
import ExerciseForm from './ExerciseForm/ExerciseForm';
import RecipeForm from './RecipeForm/RecipeForm';

/**
 * ContentCreateForm - Generic content builder form component
 *
 * Architecture:
 * - Manages form state with react-hook-form + Zod validation
 * - Renders type-specific forms (Exercise/Recipe) based on content type
 * - Handles form submission with dual CTA support
 * - Shows validation errors via notifications
 *
 * Pattern: Follows SessionCreateForm architecture
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

    // Reset form when default values change
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    // Watch content type to determine which form to render
    const effectiveContentType = watch('type') || defaultContentType;

    // Handle form submission with action
    const handleFormSubmit = async (values: ContentFormValues, action: FormSubmitAction = 'close') => {
        await onSubmit(values, action);
    };

    // Validation error handler
    const handleValidationError = () => {
        notifications.show({
            autoClose: 5000,
            color: 'orange',
            icon: <IconAlertCircle size={20} />,
            message: 'Check the form and fix any errors before submitting',
            title: 'Validation error',
        });
    };

    return (
        <form
            onSubmit={handleSubmit((values) => handleFormSubmit(values, 'close'), handleValidationError)}
            style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                height: '100%',
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
                    paddingBottom: 'calc(var(--mantine-spacing-lg) + var(--ce-appbar-height, 0px))',
                }}
            >
                {/* Render type-specific form */}
                {effectiveContentType === 'exercise' && <ExerciseForm form={form} />}
                {effectiveContentType === 'recipe' && <RecipeForm form={form} />}
            </Stack>

            {/* Fixed Submit Button(s) */}
            <FixedBottomBar maxWidth={560}>
                <FormButtons
                    isSubmitting={isSubmitting}
                    onSave={handleSubmit((values) => handleFormSubmit(values, 'continue'), handleValidationError)}
                    onSaveAndClose={handleSubmit((values) => handleFormSubmit(values, 'close'), handleValidationError)}
                    showSaveOptions={showSaveOptions}
                    submitLabel={submitLabel}
                />
            </FixedBottomBar>
        </form>
    );
}
