import {
    Group,
    NumberInput,
    Textarea,
    MultiSelect,
    Paper,
    Stack,
    Text,
    Divider,
    Button,
    Flex,
    TextInput,
    ActionIcon,
} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';
import {FormValues} from '../types.ts';
import {parse_input_props} from '@/utils/parse_input_props.tsx';
import {IconPlus, IconTrash} from '@tabler/icons-react';

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
    const {watch, setValue} = form;
    const servingSizes = watch('food_metadata.common_serving_sizes') || [];

    const addServingSize = () => {
        const currentSizes = servingSizes || [];
        const newSizes = [...currentSizes, {name: '', gram_weight: 0, is_default: false}];
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
                    size="lg"
                    fw={600}
                >
                    Food Metadata
                </Text>

                {/* Basic Nutrition */}
                <Text
                    size="md"
                    fw={500}
                >
                    Nutrition per 100g
                </Text>
                <Group grow>
                    <Controller
                        name="food_metadata.calories_per_100g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Calories"
                                placeholder="100"
                                min={0}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.macros_per_100g.protein_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Protein (g)"
                                placeholder="20"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.macros_per_100g.carbs_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Carbs (g)"
                                placeholder="30"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        name="food_metadata.macros_per_100g.fats_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Fats (g)"
                                placeholder="10"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.macros_per_100g.fiber_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Fiber (g)"
                                placeholder="5"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.macros_per_100g.sugar_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Sugar (g)"
                                placeholder="8"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Divider />

                {/* Micronutrients */}
                <Text
                    size="md"
                    fw={500}
                >
                    Key Micronutrients (per 100g)
                </Text>
                <Group grow>
                    <Controller
                        name="food_metadata.micros_per_100g.sodium_mg"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Sodium (mg)"
                                placeholder="100"
                                min={0}
                                step={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.micros_per_100g.calcium_mg"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Calcium (mg)"
                                placeholder="50"
                                min={0}
                                step={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.micros_per_100g.iron_mg"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Iron (mg)"
                                placeholder="2"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        name="food_metadata.micros_per_100g.vitamin_c_mg"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Vitamin C (mg)"
                                placeholder="10"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.micros_per_100g.vitamin_d_iu"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Vitamin D (IU)"
                                placeholder="0"
                                min={0}
                                step={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Divider />

                {/* Classification */}
                <Text
                    size="md"
                    fw={500}
                >
                    Food Classification
                </Text>
                <Group grow>
                    <Controller
                        name="food_metadata.food_groups"
                        control={form.control}
                        render={(props) => (
                            <MultiSelect
                                label="Food Groups"
                                placeholder="Select food categories"
                                data={FOOD_GROUPS}
                                searchable
                                clearable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                    <Controller
                        name="food_metadata.allergens"
                        control={form.control}
                        render={(props) => (
                            <MultiSelect
                                label="Allergens"
                                placeholder="Select allergens present"
                                data={ALLERGENS}
                                searchable
                                clearable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Controller
                    name="food_metadata.dietary_flags"
                    control={form.control}
                    render={(props) => (
                        <MultiSelect
                            label="Dietary Flags"
                            placeholder="Select applicable dietary restrictions/preferences"
                            data={DIETARY_FLAGS}
                            searchable
                            clearable
                            {...parse_input_props(props)}
                        />
                    )}
                />

                <Divider />

                {/* Serving Sizes */}
                <Flex
                    justify="space-between"
                    align="center"
                >
                    <Text
                        size="md"
                        fw={500}
                    >
                        Common Serving Sizes
                    </Text>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        size="sm"
                        variant="light"
                        onClick={addServingSize}
                    >
                        Add Serving
                    </Button>
                </Flex>

                {servingSizes.map((_: any, index: number) => (
                    <Group
                        key={index}
                        gap="sm"
                    >
                        <TextInput
                            placeholder="e.g., 1 cup, 1 medium"
                            flex={1}
                            value={servingSizes[index]?.name || ''}
                            onChange={(e) => updateServingSize(index, 'name', e.target.value)}
                        />
                        <NumberInput
                            placeholder="Grams"
                            w={100}
                            min={0}
                            value={servingSizes[index]?.gram_weight || 0}
                            onChange={(val) => updateServingSize(index, 'gram_weight', val)}
                        />
                        <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeServingSize(index)}
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                ))}

                <Divider />

                {/* Storage & Preparation */}
                <Text
                    size="md"
                    fw={500}
                >
                    Storage & Preparation
                </Text>
                <Group grow>
                    <Controller
                        name="food_metadata.shelf_life"
                        control={form.control}
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
                    name="food_metadata.preparation_notes"
                    control={form.control}
                    render={(props) => (
                        <Textarea
                            label="Preparation Notes"
                            placeholder="Storage tips, preparation methods (one per line)"
                            autosize
                            minRows={2}
                            maxRows={4}
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
