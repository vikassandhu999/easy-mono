import {closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ActionIcon, Badge, Box, Button, Group, Stack, Text, TextInput, useMantineTheme} from '@mantine/core';
import {IconGripVertical, IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useState} from 'react';

type InstructionSectionProps = {
    onChange?: (instructions: string[]) => void;
    value?: string[];
};

interface SortableInstructionProps {
    id: string;
    index: number;
    instruction: string;
    onChange: (index: number, value: string) => void;
    onRemove: (index: number) => void;
    theme: any;
    totalCount: number;
}

const SortableInstruction = ({
    id,
    index,
    instruction,
    onChange,
    onRemove,
    theme,
    totalCount,
}: SortableInstructionProps) => {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
        >
            <Group
                align="flex-start"
                gap="xs"
                wrap="nowrap"
            >
                <Box
                    {...attributes}
                    {...listeners}
                    style={{
                        cursor: 'grab',
                        padding: '8px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: 4,
                    }}
                >
                    <IconGripVertical
                        color={theme.colors.gray[6]}
                        size={20}
                    />
                </Box>

                <Box style={{flexGrow: 1}}>
                    <TextInput
                        label={<Badge>{index + 1}</Badge>}
                        onChange={(e) => onChange(index, e.currentTarget.value)}
                        placeholder={`Describe step ${index + 1} in detail...`}
                        radius="lg"
                        value={instruction}
                    />
                </Box>

                <ActionIcon
                    color="red"
                    disabled={totalCount <= 1}
                    onClick={() => onRemove(index)}
                    radius="lg"
                    size="lg"
                    style={{marginTop: 28}}
                    variant="light"
                >
                    <IconTrash size={18} />
                </ActionIcon>
            </Group>
        </Box>
    );
};

const InstructionSection: FC<InstructionSectionProps> = ({onChange, value = []}) => {
    const theme = useMantineTheme();
    const [instructions, setInstructions] = useState<string[]>(value.length > 0 ? value : ['']);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleInstructionChange = (index: number, newValue: string) => {
        const updated = [...instructions];
        updated[index] = newValue;
        setInstructions(updated);
        onChange?.(updated);
    };

    const handleRemoveInstruction = (index: number) => {
        if (instructions.length <= 1) return;
        const updated = instructions.filter((_, i) => i !== index);
        setInstructions(updated);
        onChange?.(updated);
    };

    const handleAddInstruction = () => {
        const updated = [...instructions, ''];
        setInstructions(updated);
        onChange?.(updated);
    };

    const handleDragEnd = (event: any) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            setInstructions((items) => {
                const oldIndex = items.findIndex((_, idx) => `instruction-${idx}` === active.id);
                const newIndex = items.findIndex((_, idx) => `instruction-${idx}` === over.id);
                const reordered = arrayMove(items, oldIndex, newIndex);
                onChange?.(reordered);
                return reordered;
            });
        }
    };

    return (
        <Box>
            <Stack gap="md">
                <Box>
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        Add step-by-step instructions for this exercise. You can drag to reorder steps.
                    </Text>
                </Box>

                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                >
                    <SortableContext items={instructions.map((_, idx) => `instruction-${idx}`)}>
                        <Stack gap="md">
                            {instructions.map((instruction, idx) => (
                                <SortableInstruction
                                    id={`instruction-${idx}`}
                                    index={idx}
                                    instruction={instruction}
                                    key={`instruction-${idx}`}
                                    onChange={handleInstructionChange}
                                    onRemove={handleRemoveInstruction}
                                    theme={theme}
                                    totalCount={instructions.length}
                                />
                            ))}
                        </Stack>
                    </SortableContext>
                </DndContext>

                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={handleAddInstruction}
                    radius="lg"
                    variant="light"
                >
                    Add Step
                </Button>
            </Stack>
        </Box>
    );
};

export default InstructionSection;
