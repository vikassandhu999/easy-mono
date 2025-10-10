import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Collapse,
    Divider,
    Group,
    NumberInput,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
} from '@mantine/core';
import {CaretDownIcon, CaretUpIcon, DotsSixVerticalIcon, PencilIcon, TrashIcon} from '@phosphor-icons/react';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {SessionItemConfig} from '@/api/sessions';

interface SessionItemProps {
    index: number;
    isDragDisabled?: boolean;
    isEditing?: boolean;
    item: SessionItemConfig;
    onCancel?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    onSave?: (updatedItem: SessionItemConfig) => void;
}

export default function SessionItem({
    index,
    isDragDisabled = false,
    isEditing = false,
    item,
    onCancel,
    onDelete,
    onEdit,
    onSave,
}: SessionItemProps) {
    const [showDetails, setShowDetails] = useState(false);

    const {attributes, isDragging, listeners, setNodeRef, transform, transition} = useSortable({
        disabled: isDragDisabled || isEditing,
        id: item.content_id,
    });

    const style = {
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleEdit = () => {
        onEdit?.();
    };

    const handleDelete = () => {
        onDelete?.();
    };

    const handleToggleDetails = () => {
        setShowDetails(!showDetails);
    };

    return (
        <Card
            className={isDragging ? 'dragging' : ''}
            p={'sm'}
            radius={'var(--body-offset)'}
            ref={setNodeRef}
            style={style}
        >
            <Stack gap={'sm'}>
                <Group
                    align="flex-start"
                    justify="space-between"
                    wrap="nowrap"
                >
                    {/* Drag Handle */}
                    <ActionIcon
                        color="gray"
                        size="lg"
                        style={{cursor: isDragDisabled || isEditing ? 'default' : 'grab'}}
                        variant="subtle"
                        {...attributes}
                        {...listeners}
                    >
                        <DotsSixVerticalIcon size={16} />
                    </ActionIcon>

                    {/* Content */}
                    <Box style={{flex: 1, minWidth: 0}}>
                        <SessionItemContent
                            index={index}
                            item={item}
                        />
                        {/* Actions */}
                        <SessionItemActions
                            isEditing={isEditing}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onToggleDetails={handleToggleDetails}
                            showDetails={showDetails}
                        />
                    </Box>
                </Group>

                {/* Details Section */}
                <Collapse in={showDetails && !isEditing}>
                    <Divider mb={'sm'} />
                    <SessionItemDetails item={item} />
                </Collapse>

                {/* Editing Mode */}
                {isEditing && onSave && onCancel && (
                    <>
                        <Divider />
                        <EditableFieldsInline
                            item={item}
                            onCancel={onCancel}
                            onSave={onSave}
                        />
                    </>
                )}
            </Stack>
        </Card>
    );
}

interface EditableFieldsInlineProps {
    item: SessionItemConfig;
    onCancel: () => void;
    onSave: (updatedItem: SessionItemConfig) => void;
}

function EditableFieldsInline({item, onCancel, onSave}: EditableFieldsInlineProps) {
    const {control, handleSubmit} = useForm<SessionItemConfig>({
        defaultValues: item,
    });

    const onFormSubmit = (values: SessionItemConfig) => {
        onSave(values);
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
            <Stack gap="sm">
                {item.content?.type === 'exercise' && (
                    <Group grow>
                        <Controller
                            control={control}
                            name="sets"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    label="Sets"
                                    max={99}
                                    min={0}
                                    onChange={(value) => field.onChange(typeof value === 'number' ? value : 0)}
                                    size="sm"
                                    value={field.value ?? 0}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="reps"
                            render={({field}) => (
                                <TextInput
                                    {...field}
                                    label="Reps Target"
                                    placeholder="e.g. 8-12"
                                    size="sm"
                                    value={field.value ?? ''}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="weight"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    label="Weight Target"
                                    min={0}
                                    onChange={(value) => field.onChange(typeof value === 'number' ? value : 0)}
                                    placeholder="e.g. 60"
                                    size="sm"
                                    value={field.value ?? 0}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="rest_seconds"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    label="Rest (seconds)"
                                    max={3600}
                                    min={0}
                                    onChange={(value) => field.onChange(typeof value === 'number' ? value : 0)}
                                    size="sm"
                                    value={field.value ?? 0}
                                />
                            )}
                        />
                    </Group>
                )}

                {['food', 'recipe'].includes(item.content?.type || '') && (
                    <Group grow>
                        <Controller
                            control={control}
                            name="quantity"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    label="Quantity"
                                    max={10000}
                                    min={0}
                                    onChange={(value) => field.onChange(typeof value === 'number' ? value : 0)}
                                    size="sm"
                                    value={field.value ?? 0}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="unit"
                            render={({field}) => (
                                <TextInput
                                    {...field}
                                    label="Unit"
                                    placeholder="g / ml / cup"
                                    size="sm"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Group>
                )}

                <Controller
                    control={control}
                    name="is_optional"
                    render={({field}) => (
                        <Switch
                            checked={field.value ?? false}
                            label="Optional Item"
                            onChange={(event) => field.onChange(event.currentTarget.checked)}
                            size="sm"
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="custom_instructions"
                    render={({field}) => (
                        <Textarea
                            {...field}
                            autosize
                            label="Custom Instructions"
                            maxRows={4}
                            minRows={2}
                            placeholder="Add specific instructions for this exercise..."
                            size="sm"
                            value={field.value ?? ''}
                        />
                    )}
                />

                <Group
                    gap="xs"
                    justify="flex-end"
                >
                    <Button
                        color="gray"
                        onClick={onCancel}
                        size="sm"
                        type="button"
                        variant="subtle"
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        type="submit"
                    >
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}

function SessionItemActions({
    isEditing,
    onDelete,
    onEdit,
    onToggleDetails,
    showDetails,
}: {
    isEditing: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onToggleDetails: () => void;
    showDetails: boolean;
}) {
    if (isEditing) return null;

    return (
        <Group
            align="center"
            gap={'xs'}
            justify={'space-between'}
            p={'sm'}
        >
            <Group>
                <ActionIcon
                    color="blue"
                    onClick={onEdit}
                    size="sm"
                    variant="subtle"
                >
                    <PencilIcon size={24} />
                </ActionIcon>
                <ActionIcon
                    color="red"
                    onClick={onDelete}
                    size="sm"
                    variant="subtle"
                >
                    <TrashIcon size={24} />
                </ActionIcon>
            </Group>

            <ActionIcon
                color="gray"
                onClick={onToggleDetails}
                size="sm"
                variant="subtle"
            >
                {showDetails ? <CaretUpIcon size={24} /> : <CaretDownIcon size={24} />}
            </ActionIcon>
        </Group>
    );
}

function SessionItemContent({index, item}: {index: number; item: SessionItemConfig}) {
    const {content} = item;

    return (
        <>
            <Group
                align="center"
                gap={'xs'}
                mb={'xs'}
            >
                <Text
                    c="dark"
                    fw={500}
                    size="sm"
                    style={{
                        color: 'var(--mantine-color-gray-9)',
                        flex: 1,
                        fontSize: 'var(--body-font-size)',
                        lineHeight: 'var(--body-line-height)',
                    }}
                >
                    {index + 1}. {content?.name || 'Unknown Content'}
                </Text>
                <Badge
                    color="blue"
                    radius={'var(--body-offset)'}
                    size="xs"
                    variant="light"
                >
                    {content?.type || 'content'}
                </Badge>
            </Group>

            {content?.description && (
                <Text
                    c="dimmed"
                    lineClamp={2}
                    mb={'xs'}
                    size="xs"
                    style={{
                        fontSize: 'var(--callout-font-size)',
                        lineHeight: 'var(--callout-line-height)',
                    }}
                >
                    {content.description}
                </Text>
            )}

            <Group
                gap={'xs'}
                wrap="wrap"
            >
                {item.sets && item.sets > 0 && (
                    <Badge
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        {item.sets} sets
                    </Badge>
                )}
                {item.rest_seconds > 0 && (
                    <Badge
                        color="orange"
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        {item.rest_seconds}s rest
                    </Badge>
                )}
                {content?.duration && (
                    <Badge
                        color="green"
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        {content.duration}min
                    </Badge>
                )}
                {item.custom_instructions && (
                    <Badge
                        color="yellow"
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        Has notes
                    </Badge>
                )}
            </Group>
        </>
    );
}

function SessionItemDetails({item}: {item: SessionItemConfig}) {
    const {content} = item;

    return (
        <Stack gap={'xs'}>
            {content?.instructions && (
                <Box>
                    <Text
                        c="dimmed"
                        fw={500}
                        mb={4}
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Instructions:
                    </Text>
                    <Text
                        c="dark"
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        {content.instructions}
                    </Text>
                </Box>
            )}
            {item.custom_instructions && (
                <Box>
                    <Text
                        c="dimmed"
                        fw={500}
                        mb={4}
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Custom Notes:
                    </Text>
                    <Text
                        c="dark"
                        fs="italic"
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        {item.custom_instructions}
                    </Text>
                </Box>
            )}
        </Stack>
    );
}
