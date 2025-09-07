import React from 'react';
import {TextInput, Textarea} from '@mantine/core';
import {useForm} from 'react-hook-form';
import {CreateContentProps, UpdateContentProps, Content, isMediaEmpty} from '@/Api/Contents';
import {FixedBottom} from '../Containers/FixedBottom';
import {notifications} from '@mantine/notifications';

import {MediaDetails} from './MediaDetails';
import {FormSection} from '@/Components/Containers/FormSection';

import {ExerciseMetadataForm, FoodMetadataForm, RecipeMetadataForm} from './Metadata';
import {FormValues} from './FormTypes';
import {InputController} from '../InputController/InputController';

const getPlaceholder = (type: string, field: 'name' | 'instructions') => {
    const placeholders = {
        exercise: {
            name: 'Basic Jab Drill',
            instructions: 'Clear steps & cues:\n1. Set stance...\n2. Perform 10 slow reps...',
        },
        food: {
            name: 'Grilled Chicken (150g)',
            instructions: 'Portion & prep notes:\n150g grilled chicken breast, medium heat...',
        },
        technique: {
            name: 'Hip Hinge Technique',
            instructions: 'Break down phases & key corrections...',
        },
        activity: {
            name: 'Morning Walk 20min',
            instructions: 'Describe routine & context...',
        },
        guide: {
            name: 'Recovery Day Guide',
            instructions: 'Outline key sections...',
        },
        lesson: {
            name: 'Lesson 1: Foundations',
            instructions: 'Learning objectives & outcomes...',
        },
    };
    return placeholders[type as keyof typeof placeholders]?.[field] || 'Enter text';
};

interface ContentFormProps {
    mode: 'create' | 'edit';
    initialData?: Partial<Content> | Content | null;
    onSubmit: (data: CreateContentProps | UpdateContentProps) => void;
    isSubmitting?: boolean;
}

export const ContentForm: React.FC<ContentFormProps> = ({mode, initialData, onSubmit, isSubmitting = false}) => {
    const form = useForm<FormValues>({
        defaultValues: {
            type: initialData?.type || 'exercise',
            name: initialData?.name || '',
            instructions_type: (initialData as any)?.instructions_type || 'video',
            instructions: initialData?.instructions || '',
            thumbnail_url: initialData?.thumbnail_url || '',
            media: initialData?.media || undefined,
            exercise_metadata: (initialData as any)?.exercise_metadata || {},
            food_metadata: (initialData as any)?.food_metadata || {},
            recipe_metadata: (initialData as any)?.recipe_metadata || {},
        },
        resolver: async (values) => {
            const errors: Record<string, {type: string; message: string}> = {};
            if (!values.name || values.name.trim().length < 3) {
                errors.name = {type: 'required', message: 'Name is required and should be at least 3 characters'};
            }
            return {values, errors};
        },
    });

    const contentType = form.watch('type');
    const myMedia = form.watch('media');
    console.log('Media Value:', myMedia);
    console.log('Form State:', form.formState.errors);

    const onSubmitInternal = (values: FormValues) => {
        if (!form.trigger()) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please fix the errors in the form',
                color: 'red',
                position: 'top-center',
                autoClose: 3000,
            });
            return;
        }

        const submitData: CreateContentProps | UpdateContentProps = {
            type: values.type,
            name: values.name.trim(),
            instructions: values.instructions?.trim() || '',
            media: form.formState.dirtyFields.media && isMediaEmpty(values.media) ? undefined : (values.media ?? null),
            thumbnail_url: values.thumbnail_url || undefined,
            exercise_metadata: values.type === 'exercise' ? values.exercise_metadata : undefined,
            food_metadata: values.type === 'food' ? values.food_metadata : undefined,
            recipe_metadata: values.type === 'recipe' ? values.recipe_metadata : undefined,
        };

        onSubmit(submitData);
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmitInternal)}>
            <FormSection>
                <InputController
                    name="name"
                    control={form.control}
                    render={({field}) => (
                        <TextInput
                            label="Name"
                            withAsterisk
                            placeholder={getPlaceholder(contentType, 'name')}
                            size={'md'}
                            {...field}
                        />
                    )}
                />
            </FormSection>

            {/* Essential Information - Progressive disclosure */}
            <FormSection label="Instructions & Media">
                <InputController
                    name="media"
                    control={form.control}
                    render={({field, fieldState}) => (
                        <MediaDetails
                            error={fieldState.error?.message}
                            value={field.value}
                            onChange={(value) => {
                                field.onChange(value);
                            }}
                        />
                    )}
                />

                <InputController
                    name={'instructions'}
                    control={form.control}
                    render={({field}) => (
                        <Textarea
                            label="Instructions"
                            placeholder={getPlaceholder(contentType, 'instructions')}
                            minRows={4}
                            maxRows={8}
                            autosize
                            size={'md'}
                            {...field}
                        />
                    )}
                />
            </FormSection>

            {/* Enhanced Metadata Section */}
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
