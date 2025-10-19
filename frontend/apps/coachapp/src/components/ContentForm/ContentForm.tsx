import {Textarea, TextInput} from '@mantine/core';
import {useCallbackRef} from '@mantine/hooks';
import {notifications} from '@mantine/notifications';
import React, {useCallback} from 'react';
import {useForm} from 'react-hook-form';

import {Content, CreateContentProps, isMediaEmpty, UpdateContentProps} from '@/store/services/contents';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';
import EasyController from '@/components/EasyController';

import {MediaDetails} from './MediaDetails';
import {ExerciseMetadataForm, RecipeMetadataForm} from './taxonomy';
import {FormValues} from './types.ts';

const getPlaceholder = (type: string) => {
    const placeholders = {
        activity: 'Morning Walk 20min',
        exercise: 'Basic Jab Drill',
        food: 'Grilled Chicken (150g)',
        guide: 'Recovery Day Guide',
        lesson: 'Lesson 1: Foundations',
        technique: 'Hip Hinge Technique',
    };
    return placeholders[type as keyof typeof placeholders] || 'Enter name';
};

export interface ContentFormProps {
    initialData?: Content | null | Partial<Content>;
    isSubmitting?: boolean;
    mode: 'create' | 'edit';
    onSubmit: (data: CreateContentProps | UpdateContentProps) => void;
}

// DEPRECATED: This component is not actively used. Use ContentBuilder instead.
const ContentForm: React.FC<ContentFormProps> = ({initialData, isSubmitting = false, mode, onSubmit}) => {
    const form = useForm<FormValues>({
        defaultValues: {
            description: initialData?.description || '',
            exercise_definition: (initialData as any)?.exercise_definition || {},
            ingredient_definition: (initialData as any)?.ingredient_definition || {},
            media: initialData?.media || undefined,
            name: initialData?.name || '',
            recipe_definition: (initialData as any)?.recipe_definition || {},
            thumbnail_url: initialData?.thumbnail_url || '',
            type: initialData?.type || 'exercise',
        },
        resolver: async (values) => {
            const errors: Record<string, {message: string; type: string}> = {};
            if (!values.name || values.name.trim().length < 3) {
                errors.name = {message: 'Name is required and should be at least 3 characters', type: 'required'};
            }
            return {errors, values};
        },
    });

    const contentType = form.watch('type');
    const myMedia = form.watch('media');
    console.log('Media Value:', myMedia);
    console.log('Form State:', form.formState.errors);

    const onSubmitInternal = (values: FormValues) => {
        if (!form.trigger()) {
            notifications.show({
                autoClose: 3000,
                color: 'red',
                message: 'Please fix the errors in the form',
                position: 'top-center',
                title: 'Validation Error',
            });
            return;
        }

        const submitData: CreateContentProps | UpdateContentProps = {
            description: values.description?.trim() || '',
            exercise_definition: values.type === 'exercise' ? values.exercise_definition : undefined,
            ingredient_definition: values.ingredient_definition,
            media: form.formState.dirtyFields.media && isMediaEmpty(values.media) ? undefined : (values.media ?? null),
            name: values.name.trim(),
            recipe_definition: values.type === 'recipe' ? values.recipe_definition : undefined,
            thumbnail_url: values.thumbnail_url || undefined,
            type: values.type,
        };

        onSubmit(submitData);
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmitInternal)}>
            <FormSection>
                <EasyController
                    control={form.control}
                    name="name"
                    render={({field}) => (
                        <TextInput
                            label="Name"
                            placeholder={getPlaceholder(contentType)}
                            size={'md'}
                            withAsterisk
                            {...field}
                        />
                    )}
                />
            </FormSection>

            {/* Essential Information - Progressive disclosure */}
            <FormSection label="Description & Media">
                <EasyController
                    control={form.control}
                    name="description"
                    render={({field}) => (
                        <Textarea
                            autosize
                            label="Description"
                            maxRows={8}
                            minRows={4}
                            placeholder="Enter description..."
                            size={'md'}
                            {...field}
                        />
                    )}
                />

                <EasyController
                    control={form.control}
                    name="media"
                    render={({field, fieldState}) => (
                        <MediaDetails
                            error={fieldState.error?.message}
                            onChange={(value) => {
                                field.onChange(value);
                            }}
                            value={field.value}
                        />
                    )}
                />
            </FormSection>

            {/* Enhanced taxonomy Section */}
            <FormSection label="Additional Details (Optional)">
                {contentType === 'exercise' && <ExerciseMetadataForm form={form} />}
                {/* Note: 'food' type not currently in ContentType enum - kept for reference */}
                {/* {contentType === 'food' && <FoodMetadataForm form={form} />} */}
                {contentType === 'recipe' && <RecipeMetadataForm form={form} />}
            </FormSection>

            <FixedBottom
                isSubmitting={isSubmitting}
                label={mode === 'create' ? 'Create Content' : 'Update Content'}
            />
        </form>
    );
};

export default ContentForm;
