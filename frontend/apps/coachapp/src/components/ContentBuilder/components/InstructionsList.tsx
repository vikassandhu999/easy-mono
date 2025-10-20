import {ActionIcon, Button, Group, Indicator, Stack, Text, TextInput} from '@mantine/core';
import {IconPlus, IconTrash} from '@tabler/icons-react';

/**
 * InstructionsList - Reusable component for managing step-by-step instructions
 *
 * Used in both ExerciseForm and RecipeForm to handle instruction lists
 * with add/remove/update operations.
 */

export interface InstructionsListProps {
    description?: string;
    instructions: string[];
    onChange: (instructions: string[]) => void;
    placeholder?: string;
}

export function InstructionsList({
    description = 'Describe each step clearly and concisely',
    instructions,
    onChange,
    placeholder = 'Describe what to do',
}: InstructionsListProps) {
    const handleAdd = () => {
        onChange([...instructions, '']);
    };

    const handleRemove = (index: number) => {
        const updated = instructions.filter((_, i) => i !== index);
        onChange(updated.length > 0 ? updated : []);
    };

    const handleUpdate = (index: number, value: string) => {
        const updated = [...instructions];
        updated[index] = value;
        onChange(updated);
    };

    return (
        <Stack gap="md">
            <Text
                c="dimmed"
                size="sm"
            >
                {description}
            </Text>

            <Stack gap="sm">
                {instructions.map((instruction, index) => (
                    <Group
                        align="flex-start"
                        gap="xs"
                        key={index}
                        wrap="nowrap"
                    >
                        <Indicator
                            label={index + 1}
                            position="top-start"
                            size={20}
                            style={{flex: 1}}
                        >
                            <TextInput
                                aria-label={`Step ${index + 1}`}
                                onChange={(e) => handleUpdate(index, e.currentTarget.value)}
                                placeholder={placeholder}
                                value={instruction}
                                w="100%"
                            />
                        </Indicator>

                        <ActionIcon
                            aria-label={`Remove step ${index + 1}`}
                            color="red"
                            onClick={() => handleRemove(index)}
                            size="lg"
                            variant="light"
                        >
                            <IconTrash size={18} />
                        </ActionIcon>
                    </Group>
                ))}
            </Stack>

            <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleAdd}
                size="md"
                variant="light"
            >
                Add step
            </Button>
        </Stack>
    );
}
