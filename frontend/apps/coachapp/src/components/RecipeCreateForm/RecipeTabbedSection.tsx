import {ActionIcon, Button, Group, NumberInput, SegmentedControl, Stack, Textarea, TextInput} from '@mantine/core';
import {UseFormReturnType} from '@mantine/form';
import {IconPlus, IconTrash, IconX} from '@tabler/icons-react';
import React, {useEffect, useState} from 'react';

interface Ingredient {
    amount: string;
    id: string;
    name: string;
    unit: string;
}

interface Instruction {
    id: string;
    step: number;
    text: string;
}

interface RecipeSegmentedSectionProps {
    form: UseFormReturnType<any>;
}

export const RecipeSegmentedSection: React.FC<RecipeSegmentedSectionProps> = ({form}) => {
    const [activeSection, setActiveSection] = useState('ingredients');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [instructions, setInstructions] = useState<Instruction[]>([]);

    // Sync ingredients with form - using direct reference without dependencies
    useEffect(() => {
        const formIngredients = ingredients.map((ingredient) => ({
            amount: ingredient.amount,
            name: ingredient.name,
            unit: ingredient.unit,
        }));
        form.setFieldValue('ingredients', formIngredients);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ingredients]); // Only depend on ingredients, not form to prevent infinite loop

    const addIngredient = () => {
        const newIngredient: Ingredient = {
            id: `ingredient-${Date.now()}`,
            name: '',
            amount: '',
            unit: '',
        };
        setIngredients([...ingredients, newIngredient]);
    };

    const removeIngredient = (id: string) => {
        setIngredients(ingredients.filter((ingredient) => ingredient.id !== id));
    };

    const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
        setIngredients(
            ingredients.map((ingredient) => (ingredient.id === id ? {...ingredient, [field]: value} : ingredient)),
        );
    };

    const addInstruction = () => {
        const newInstruction: Instruction = {
            id: `instruction-${Date.now()}`,
            step: instructions.length + 1,
            text: '',
        };
        setInstructions([...instructions, newInstruction]);
    };

    const removeInstruction = (id: string) => {
        const updatedInstructions = instructions
            .filter((instruction) => instruction.id !== id)
            .map((instruction, index) => ({...instruction, step: index + 1}));
        setInstructions(updatedInstructions);
    };

    const updateInstruction = (id: string, text: string) => {
        setInstructions(
            instructions.map((instruction) => (instruction.id === id ? {...instruction, text} : instruction)),
        );
    };

    const renderActiveSection = () => {
        switch (activeSection) {
            case 'ingredients':
                return (
                    <Stack gap="md">
                        <Group
                            justify="space-between"
                            mb="sm"
                        >
                            <Button
                                leftSection={<IconPlus size={16} />}
                                onClick={addIngredient}
                                variant="light"
                            >
                                Add Ingredient
                            </Button>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                variant="outline"
                            >
                                Add as text
                            </Button>
                        </Group>

                        {ingredients.length === 0 ? (
                            <div
                                style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px dashed #dee2e6',
                                    borderRadius: '8px',
                                    color: '#6c757d',
                                    fontSize: '14px',
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                }}
                            >
                                No ingredients added yet. Click "Add Ingredient" to start building your recipe.
                            </div>
                        ) : (
                            ingredients.map((ingredient) => (
                                <Group
                                    align="flex-start"
                                    gap="sm"
                                    key={ingredient.id}
                                >
                                    <TextInput
                                        flex={2}
                                        onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                                        placeholder="e.g., All-purpose flour"
                                        size="sm"
                                        value={ingredient.name}
                                    />
                                    <TextInput
                                        flex={1}
                                        onChange={(e) => updateIngredient(ingredient.id, 'amount', e.target.value)}
                                        placeholder="2"
                                        size="sm"
                                        value={ingredient.amount}
                                    />
                                    <TextInput
                                        flex={1}
                                        onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                                        placeholder="cups"
                                        size="sm"
                                        value={ingredient.unit}
                                    />
                                    <ActionIcon
                                        color="red"
                                        onClick={() => removeIngredient(ingredient.id)}
                                        size="sm"
                                        variant="subtle"
                                    >
                                        <IconX size={16} />
                                    </ActionIcon>
                                </Group>
                            ))
                        )}
                    </Stack>
                );
            case 'instructions':
                return (
                    <Stack gap="md">
                        <Group
                            justify="space-between"
                            mb="sm"
                        >
                            <Button
                                leftSection={<IconPlus size={16} />}
                                onClick={addInstruction}
                                variant="light"
                            >
                                Add Step
                            </Button>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                variant="outline"
                            >
                                Add as text
                            </Button>
                        </Group>

                        {instructions.length === 0 ? (
                            <Textarea
                                description="Step-by-step cooking instructions"
                                label="Instructions"
                                minRows={4}
                                placeholder="1. Preheat oven to 350°F...&#10;2. Mix dry ingredients...&#10;3. Add wet ingredients..."
                                required
                                size="md"
                                withAsterisk
                                {...form.getInputProps('instructions')}
                            />
                        ) : (
                            instructions.map((instruction) => (
                                <Group
                                    align="flex-start"
                                    gap="sm"
                                    key={instruction.id}
                                >
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            backgroundColor: '#e7f5ff',
                                            borderRadius: '50%',
                                            color: '#1c7ed6',
                                            display: 'flex',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            height: '32px',
                                            justifyContent: 'center',
                                            minWidth: '32px',
                                            width: '32px',
                                        }}
                                    >
                                        {instruction.step}
                                    </div>
                                    <Textarea
                                        flex={1}
                                        onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                                        placeholder="Describe this step in detail..."
                                        rows={2}
                                        size="sm"
                                        value={instruction.text}
                                    />
                                    <ActionIcon
                                        color="red"
                                        onClick={() => removeInstruction(instruction.id)}
                                        size="sm"
                                        variant="subtle"
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            ))
                        )}
                    </Stack>
                );
            case 'nutrition':
                return (
                    <Stack gap="md">
                        <Group grow>
                            <NumberInput
                                description="Calories per serving"
                                label="Calories"
                                min={0}
                                size="md"
                                {...form.getInputProps('calories')}
                            />
                            <NumberInput
                                description="Protein in grams per serving"
                                label="Protein (g)"
                                min={0}
                                size="md"
                                step={0.1}
                                {...form.getInputProps('protein_g')}
                            />
                        </Group>

                        <Group grow>
                            <NumberInput
                                description="Carbohydrates in grams per serving"
                                label="Carbs (g)"
                                min={0}
                                size="md"
                                step={0.1}
                                {...form.getInputProps('carbs_g')}
                            />
                            <NumberInput
                                description="Fats in grams per serving"
                                label="Fats (g)"
                                min={0}
                                size="md"
                                step={0.1}
                                {...form.getInputProps('fats_g')}
                            />
                        </Group>

                        <Group grow>
                            <NumberInput
                                description="Fiber in grams per serving"
                                label="Fiber (g)"
                                min={0}
                                size="md"
                                step={0.1}
                                {...form.getInputProps('fiber_g')}
                            />
                            <NumberInput
                                description="Sugar in grams per serving"
                                label="Sugar (g)"
                                min={0}
                                size="md"
                                step={0.1}
                                {...form.getInputProps('sugar_g')}
                            />
                        </Group>
                    </Stack>
                );
            default:
                return null;
        }
    };

    return (
        <div
            style={{
                backgroundColor: 'var(--mantine-color-white)',
                boxShadow: 'var(--mantine-shadow-sm)',
                padding: 'var(--mantine-spacing-sm)',
                borderRadius: '8px',
            }}
        >
            <SegmentedControl
                data={[
                    {label: 'Ingredients', value: 'ingredients'},
                    {label: 'Instructions', value: 'instructions'},
                    {label: 'Nutrition Info', value: 'nutrition'},
                ]}
                fullWidth
                mb="md"
                onChange={setActiveSection}
                value={activeSection}
            />

            <div style={{paddingTop: 'var(--mantine-spacing-md)'}}>{renderActiveSection()}</div>
        </div>
    );
};
