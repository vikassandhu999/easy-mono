import {Textarea, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React from 'react';
import {useForm} from 'react-hook-form';

import {Content, CreateContentProps, isMediaEmpty, UpdateContentProps} from '@/api/contents.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';
import EasyController from '@/components/EasyController';

import {MediaDetails} from './MediaDetails';
import {ExerciseMetadataForm, FoodMetadataForm, RecipeMetadataForm} from './taxonomy';
import {FormValues} from './types.ts';

const getPlaceholder = (type: string, field: 'instructions' | 'name') => {
    const placeholders = {
        activity: {
            instructions: 'Describe routine & context...',
            name: 'Morning Walk 20min',
        },
        exercise: {
            instructions: 'Clear steps & cues:\n1. Set stance...\n2. Perform 10 slow reps...',
            name: 'Basic Jab Drill',
        },
        food: {
            instructions: 'Portion & prep notes:\n150g grilled chicken breast, medium heat...',
            name: 'Grilled Chicken (150g)',
        },
        guide: {
            instructions: 'Outline key sections...',
            name: 'Recovery Day Guide',
        },
        lesson: {
            instructions: 'Learning objectives & outcomes...',
            name: 'Lesson 1: Foundations',
        },
        technique: {
            instructions: 'Break down phases & key corrections...',
            name: 'Hip Hinge Technique',
        },
    };
    return placeholders[type as keyof typeof placeholders]?.[field] || 'Enter text';
};

export interface ContentFormProps {
    initialData?: Content | null | Partial<Content>;
    isSubmitting?: boolean;
    mode: 'create' | 'edit';
    onSubmit: (data: CreateContentProps | UpdateContentProps) => void;
}

const ContentForm: React.FC<ContentFormProps> = ({initialData, isSubmitting = false, mode, onSubmit}) => {
    const form = useForm<FormValues>({
        defaultValues: {
            exercise_metadata: (initialData as any)?.exercise_metadata || {},
            food_metadata: (initialData as any)?.food_metadata || {},
            instructions: initialData?.instructions || '',
            instructions_type: (initialData as any)?.instructions_type || 'video',
            media: initialData?.media || undefined,
            name: initialData?.name || '',
            recipe_metadata: (initialData as any)?.recipe_metadata || {},
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
            exercise_metadata: values.type === 'exercise' ? values.exercise_metadata : undefined,
            food_metadata: values.type === 'food' ? values.food_metadata : undefined,
            instructions: values.instructions?.trim() || '',
            media: form.formState.dirtyFields.media && isMediaEmpty(values.media) ? undefined : (values.media ?? null),
            name: values.name.trim(),
            recipe_metadata: values.type === 'recipe' ? values.recipe_metadata : undefined,
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
                            placeholder={getPlaceholder(contentType, 'name')}
                            size={'md'}
                            withAsterisk
                            {...field}
                        />
                    )}
                />
            </FormSection>

            {/* Essential Information - Progressive disclosure */}
            <FormSection label="Instructions & Media">
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

                <EasyController
                    control={form.control}
                    name={'instructions'}
                    render={({field}) => (
                        <Textarea
                            autosize
                            label="Instructions"
                            maxRows={8}
                            minRows={4}
                            placeholder={getPlaceholder(contentType, 'instructions')}
                            size={'md'}
                            {...field}
                        />
                    )}
                />
            </FormSection>

            {/* Enhanced taxonomy Section */}
            <FormSection label="Additional Details (Optional)">
                {contentType === 'exercise' && <ExerciseMetadataForm form={form} />}
                {contentType === 'food' && <FoodMetadataForm form={form} />}
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
