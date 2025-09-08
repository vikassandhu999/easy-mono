import {
    ActionIcon,
    Button,
    Divider,
    Flex,
    Group,
    MultiSelect,
    NumberInput,
    Paper,
    Stack,
    Text,
    Textarea,
    TextInput,
} from '@mantine/core';
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {parse_input_props} from '@/utils/parse_input_props.tsx';

import {FormValues} from '../types.ts';

const FOOD_GROUPS = [
    'fruits',
    'vegetables',
    'grains',
    'protein',
    'dairy',
    'fats_oils',
    'nuts_seeds',
    'legumes',
    'herbs_spices',
    'beverages',
    'sweets',
    'processed',
];

const ALLERGENS = ['milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soybeans', 'sesame'];

const DIETARY_FLAGS = [
    'vegetarian',
    'vegan',
    'gluten_free',
    'dairy_free',
    'nut_free',
    'low_carb',
    'keto',
    'paleo',
    'whole30',
    'organic',
    'non_gmo',
    'raw',
    'kosher',
    'halal',
];

export function FoodMetadataForm({form}: {form: UseFormReturn<FormValues>}) {
    const {setValue, watch} = form;
    const servingSizes = watch('food_metadata.common_serving_sizes') || [];

    const addServingSize = () => {
        const currentSizes = servingSizes || [];
        const newSizes = [...currentSizes, {gram_weight: 0, is_default: false, name: ''}];
        setValue('food_metadata.common_serving_sizes', newSizes);
    };

    const removeServingSize = (index: number) => {
        const currentSizes = servingSizes || [];
        const newSizes = currentSizes.filter((_: any, i: number) => i !== index);
        setValue('food_metadata.common_serving_sizes', newSizes);
    };

    const updateServingSize = (index: number, field: string, value: any) => {
        const currentSizes = servingSizes || [];
        const newSizes = [...currentSizes];
        newSizes[index] = {...newSizes[index], [field]: value};
        setValue('food_metadata.common_serving_sizes', newSizes);
    };

    return (
        <Paper
            p="md"
            withBorder
        >
            <Stack gap="md">
                <Text
                    fw={600}
                    size="lg"
                >
                    Food Metadata
                </Text>

                {/* Basic Nutrition */}
                <Text
                    fw={500}
                    size="md"
                >
                    Nutrition per 100g
                </Text>
                <Group grow>
                    <Controller
                        control={form.control}
                        name="food_metadata.calories_per_100g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Calories"
                                min={0}
                                placeholder="100"
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.macros_per_100g.protein_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Protein (g)"
                                min={0}
                                placeholder="20"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.macros_per_100g.carbs_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Carbs (g)"
                                min={0}
                                placeholder="30"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        control={form.control}
                        name="food_metadata.macros_per_100g.fats_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Fats (g)"
                                min={0}
                                placeholder="10"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.macros_per_100g.fiber_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Fiber (g)"
                                min={0}
                                placeholder="5"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.macros_per_100g.sugar_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Sugar (g)"
                                min={0}
                                placeholder="8"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Divider />

                {/* Micronutrients */}
                <Text
                    fw={500}
                    size="md"
                >
                    Key Micronutrients (per 100g)
                </Text>
                <Group grow>
                    <Controller
                        control={form.control}
                        name="food_metadata.micros_per_100g.sodium_mg"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Sodium (mg)"
                                min={0}
                                placeholder="100"
                                step={1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.micros_per_100g.calcium_mg"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Calcium (mg)"
                                min={0}
                                placeholder="50"
                                step={1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.micros_per_100g.iron_mg"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Iron (mg)"
                                min={0}
                                placeholder="2"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        control={form.control}
                        name="food_metadata.micros_per_100g.vitamin_c_mg"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Vitamin C (mg)"
                                min={0}
                                placeholder="10"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.micros_per_100g.vitamin_d_iu"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Vitamin D (IU)"
                                min={0}
                                placeholder="0"
                                step={1}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Divider />

                {/* Classification */}
                <Text
                    fw={500}
                    size="md"
                >
                    Food Classification
                </Text>
                <Group grow>
                    <Controller
                        control={form.control}
                        name="food_metadata.food_groups"
                        render={(props) => (
                            <MultiSelect
                                clearable
                                data={FOOD_GROUPS}
                                label="Food Groups"
                                placeholder="Select food categories"
                                searchable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="food_metadata.allergens"
                        render={(props) => (
                            <MultiSelect
                                clearable
                                data={ALLERGENS}
                                label="Allergens"
                                placeholder="Select allergens present"
                                searchable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Controller
                    control={form.control}
                    name="food_metadata.dietary_flags"
                    render={(props) => (
                        <MultiSelect
                            clearable
                            data={DIETARY_FLAGS}
                            label="Dietary Flags"
                            placeholder="Select applicable dietary restrictions/preferences"
                            searchable
                            {...parse_input_props(props)}
                        />
                    )}
                />

                <Divider />

                {/* Serving Sizes */}
                <Flex
                    align="center"
                    justify="space-between"
                >
                    <Text
                        fw={500}
                        size="md"
                    >
                        Common Serving Sizes
                    </Text>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={addServingSize}
                        size="sm"
                        variant="light"
                    >
                        Add Serving
                    </Button>
                </Flex>

                {servingSizes.map((_: any, index: number) => (
                    <Group
                        gap="sm"
                        key={index}
                    >
                        <TextInput
                            flex={1}
                            onChange={(e) => updateServingSize(index, 'name', e.target.value)}
                            placeholder="e.g., 1 cup, 1 medium"
                            value={servingSizes[index]?.name || ''}
                        />
                        <NumberInput
                            min={0}
                            onChange={(val) => updateServingSize(index, 'gram_weight', val)}
                            placeholder="Grams"
                            value={servingSizes[index]?.gram_weight || 0}
                            w={100}
                        />
                        <ActionIcon
                            color="red"
                            onClick={() => removeServingSize(index)}
                            variant="light"
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                ))}

                <Divider />

                {/* Storage & Preparation */}
                <Text
                    fw={500}
                    size="md"
                >
                    Storage & Preparation
                </Text>
                <Group grow>
                    <Controller
                        control={form.control}
                        name="food_metadata.shelf_life"
                        render={(props) => (
                            <TextInput
                                label="Shelf Life"
                                placeholder="e.g., 5-7 days refrigerated"
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Controller
                    control={form.control}
                    name="food_metadata.preparation_notes"
                    render={(props) => (
                        <Textarea
                            autosize
                            label="Preparation Notes"
                            maxRows={4}
                            minRows={2}
                            placeholder="Storage tips, preparation methods (one per line)"
                            {...parse_input_props(props)}
                            onChange={(event) => {
                                const lines = event.target.value.split('\n').filter((line) => line.trim());
                                props.field.onChange(lines);
                            }}
                        />
                    )}
                />
            </Stack>
        </Paper>
    );
}
